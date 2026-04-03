import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() {}
                }
            }
        )

        // 1. Authenticate Vendor
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.user_metadata?.role !== 'VENDOR') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const vendorId = user.id

        // 2. Fetch menus belonging to this vendor
        const { data: vendorMenus, error: menuErr } = await supabase
            .from('MenuItem')
            .select('id, name, price')
            .eq('vendorId', vendorId)
            
        if (!vendorMenus || vendorMenus.length === 0) {
            return NextResponse.json({
                tomorrowOrderCount: 0,
                weeklyOrderCount: 0,
                cookingList: []
            })
        }
        
        const menuIds = vendorMenus.map(m => m.id)

        // 3. Time frames
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStart = new Date(tomorrow.setHours(0,0,0,0)).toISOString()
        const tomorrowEnd = new Date(tomorrow.setHours(23,59,59,999)).toISOString()
        
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
        const startOfWeekStr = new Date(weekStart.setHours(0,0,0,0)).toISOString()

        // 4. Query OrderItems
        // Need to query Order items linked to vendor's menus, but we also only want valid orders (status != CANCELLED)
        // Since Supabase doesn't easily allow cross-table IN filtering simply without views,
        // we'll fetch order items for the week and map them in memory (safe for small scope)
        const { data: orderItems } = await supabase
            .from('OrderItem')
            .select(`
                id, date, quantity, note, menuId,
                Order!inner(status, paymentMethod)
            `)
            .in('menuId', menuIds)
            .gte('date', startOfWeekStr)
        
        const validItems = (orderItems || []).filter((item: any) => {
            const status = item.Order?.status
            const method = item.Order?.paymentMethod
            
            // Masuk daftar masak jika: Sudah Lunas/Selesai OR (Pending tapi Pay Later)
            return status === 'PAID' || status === 'COMPLETED' || 
                   (status === 'PENDING' && method === 'CASH_PAY_LATER')
        })

        const paidItems = validItems.filter((item: any) => 
            item.Order?.status === 'PAID' || item.Order?.status === 'COMPLETED'
        )

        let tomorrowCount = 0
        let weeklyCount = 0
        let totalRevenue = 0
        const cookingMap: Record<string, { name: string, qty: number, notes: string[] }> = {}
        
        // Setup Chart Data (Last 7 Days)
        const chartDataMap: Record<string, number> = {}
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' })
            chartDataMap[dayName] = 0
        }

        validItems.forEach((item: any) => {
            weeklyCount += item.quantity || 1

            // Count Revenue for Paid items
            if (item.Order?.status === 'PAID' || item.Order?.status === 'COMPLETED') {
                const itemMenuPrice = vendorMenus.find(m => m.id === item.menuId)?.price || 0
                const itemTotal = itemMenuPrice * (item.quantity || 1)
                totalRevenue += itemTotal
                
                // Add to chart
                const itemDate = new Date(item.date)
                const dayName = itemDate.toLocaleDateString('id-ID', { weekday: 'short' })
                if (chartDataMap[dayName] !== undefined) {
                    chartDataMap[dayName] += itemTotal
                }
            }

            // Check if item is for tomorrow
            if (item.date >= tomorrowStart && item.date <= tomorrowEnd) {
                tomorrowCount += item.quantity || 1

                // Add to cooking list
                const menuData = vendorMenus.find(m => m.id === item.menuId)
                if (menuData) {
                    if (!cookingMap[item.menuId]) {
                        cookingMap[item.menuId] = { name: menuData.name, qty: 0, notes: [] }
                    }
                    cookingMap[item.menuId].qty += item.quantity || 1
                    
                    if (item.note && item.note.trim() !== "") {
                        cookingMap[item.menuId].notes.push(item.note)
                    }
                }
            }
        })

        const cookingList = Object.values(cookingMap)
        
        const chartData = Object.keys(chartDataMap).map(key => ({
            name: key,
            total: chartDataMap[key]
        }))

        return NextResponse.json({
            tomorrowOrderCount: tomorrowCount,
            weeklyOrderCount: weeklyCount,
            totalRevenue,
            cookingList,
            chartData
        })

    } catch (e) {
        console.error("VENDOR STATS ERROR:", e)
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
