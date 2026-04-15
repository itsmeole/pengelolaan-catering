import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const customStart = searchParams.get('start')
        const customEnd = searchParams.get('end')

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

        // 2. Time frames
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStart = new Date(tomorrow.setHours(0,0,0,0)).toISOString()
        const tomorrowEnd = new Date(tomorrow.setHours(23,59,59,999)).toISOString()
        
        // Final filter range for cooking list
        const filterStart = customStart ? new Date(new Date(customStart).setHours(0,0,0,0)).toISOString() : tomorrowStart
        const filterEnd = customEnd ? new Date(new Date(customEnd).setHours(23,59,59,999)).toISOString() : tomorrowEnd

        const now = new Date()
        // This week (Monday to Sunday)
        const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
        const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()
        
        // Next week (Monday to Sunday)
        const nextWeek = addWeeks(now, 1)
        const nextWeekStart = startOfWeek(nextWeek, { weekStartsOn: 1 }).toISOString()
        const nextWeekEnd = endOfWeek(nextWeek, { weekStartsOn: 1 }).toISOString()

        // 3. Query OrderItems for this vendor (Snapshot)
        const fetchStart = new Date(Math.min(new Date(thisWeekStart).getTime(), new Date(filterStart).getTime())).toISOString()

        const { data: orderItems, error: itemsErr } = await supabase
            .from('OrderItem')
            .select(`
                id, date, quantity, note, menuId, menuName, price, cancelStatus, vendorId,
                Order!inner(status, paymentMethod)
            `)
            .eq('vendorId', vendorId)
            .gte('date', fetchStart)
        
        if (itemsErr) throw itemsErr
        
        const validItems = (orderItems || []).filter((item: any) => {
            const status = item.Order?.status
            const method = item.Order?.paymentMethod
            const cStatus = item.cancelStatus || 'NONE'
            
            // Kecualikan yang sudah DISETUJUI batal
            if (cStatus === 'APPROVED') return false

            // Masuk daftar masak jika: Sudah Lunas/Selesai OR (Pending tapi Pay Later)
            return status === 'PAID' || status === 'COMPLETED' || 
                   (status === 'PENDING' && method === 'CASH_PAY_LATER')
        })

        let tomorrowCount = 0
        let nextWeekCount = 0
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
            // Stats for this week
            if (item.date >= thisWeekStart && item.date <= thisWeekEnd) {
                weeklyCount += item.quantity || 1

                if (item.Order?.status === 'PAID' || item.Order?.status === 'COMPLETED') {
                    const itemTotal = (item.price || 0) * (item.quantity || 1)
                    totalRevenue += itemTotal
                    
                    const itemDate = new Date(item.date)
                    const dayName = itemDate.toLocaleDateString('id-ID', { weekday: 'short' })
                    if (chartDataMap[dayName] !== undefined) {
                        chartDataMap[dayName] += itemTotal
                    }
                }
            }

            // Stats for next week
            if (item.date >= nextWeekStart && item.date <= nextWeekEnd) {
                nextWeekCount += item.quantity || 1
            }

            // FILTER: Masuk Cooking List jika dalam rentang filter (besok atau custom)
            if (item.date >= filterStart && item.date <= filterEnd) {
                tomorrowCount += item.quantity || 1

                const mId = item.menuId || 'deleted'
                if (!cookingMap[mId]) {
                    cookingMap[mId] = { name: item.menuName || 'Menu Terhapus', qty: 0, notes: [] }
                }
                cookingMap[mId].qty += item.quantity || 1
                
                if (item.note && item.note.trim() !== "") {
                    cookingMap[mId].notes.push(item.note)
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
            nextWeekOrderCount: nextWeekCount,
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
