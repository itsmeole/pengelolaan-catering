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

        // 1. Future Date Range (Today until 7 days from now)
        const nowJakarta = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }))
        
        const today = new Date(nowJakarta)
        today.setHours(0,0,0,0)

        const sevenDaysLater = new Date(nowJakarta)
        sevenDaysLater.setDate(today.getDate() + 7)
        sevenDaysLater.setHours(23,59,59,999)

        // 2. Fetch OrderItems for Today + 7 Days (Aggregating Top 5)
        const { data: futureItems, error: itemsError } = await supabase
            .from('OrderItem')
            .select('menuId, menuName, vendorName, quantity')
            .gte('date', today.toISOString())
            .lte('date', sevenDaysLater.toISOString())
            .neq('cancelStatus', 'APPROVED')

        if (itemsError) throw itemsError

        let topWeeklyMenus: any[] = []
        if (futureItems && futureItems.length > 0) {
            const aggregation: Record<string, any> = {}
            futureItems.forEach(item => {
                const id = item.menuId
                if (!aggregation[id]) {
                    aggregation[id] = { 
                        name: item.menuName, 
                        vendorName: item.vendorName, 
                        count: 0 
                    }
                }
                aggregation[id].count += (item.quantity || 1)
            })

            topWeeklyMenus = Object.entries(aggregation)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5) // TOP 5
                .map(([id, data]) => ({
                    id,
                    ...data
                }))
        }

        const totalItemsWeekly = futureItems?.reduce((acc, curr) => acc + (curr.quantity || 1), 0) || 0

        // 4. Calculate Unverified Orders (PENDING)
        const { count: unverifiedCount } = await supabase
            .from('Order')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PENDING')

        // 5. Revenue
        const { data: rawPaidItems } = await supabase
            .from('OrderItem')
            .select(`
                price, quantity, adminFee, cancelStatus,
                order:Order!inner(status, paymentMethod)
            `)
            .neq('cancelStatus', 'APPROVED')
            
        // Filter in JS for revenue (PAID/COMPLETED or CASH_PAY_LATER)
        const paidItems = (rawPaidItems || []).filter(item => {
            const o = (item as any).order;
            if (!o) return false;
            if (['PAID', 'COMPLETED'].includes(o.status)) return true;
            if (o.status === 'PENDING' && o.paymentMethod === 'CASH_PAY_LATER') return true;
            return false;
        })
        
        const grossRevenue = paidItems?.reduce((acc, curr) => acc + ((curr.price + (curr.adminFee || 0)) * curr.quantity), 0) || 0
        const netRevenue = paidItems?.reduce((acc, curr) => acc + ((curr.adminFee || 0) * curr.quantity), 0) || 0

        // 6. Recent Activity
        const { data: recentOrders } = await supabase
            .from('Order')
            .select(`
                id, totalAmount, paymentMethod, status,
                profiles:studentId(name)
            `)
            .order('createdAt', { ascending: false })
            .limit(5)
        
        const recentActivity = (recentOrders || []).map(r => ({
            id: r.id,
            studentName: (r.profiles as any)?.name || 'Siswa',
            itemsCount: 'Beberapa',
            total: r.totalAmount,
            paymentMethod: r.paymentMethod,
            status: r.status
        }))

        return NextResponse.json({
            weeklyOrders: { count: totalItemsWeekly, trend: 0 },
            revenue: { gross: grossRevenue, net: netRevenue, trend: 0 },
            unverifiedCount: unverifiedCount || 0,
            recentActivity: recentActivity,
            topWeeklyMenus: topWeeklyMenus
        })

    } catch (e) {
        console.error("STATS ERROR:", e)
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
