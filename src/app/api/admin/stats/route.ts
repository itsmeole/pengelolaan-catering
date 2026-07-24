import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { startOfWeek, endOfWeek } from 'date-fns'

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

        // 0. Ambil tahun ajaran baru start date jika ada
        const { data: settingData } = await supabase
            .from('SystemSetting')
            .select('value')
            .eq('key', 'new_academic_year_start')
            .maybeSingle()

        const academicYearStart = settingData ? JSON.parse(settingData.value).academicYearStart : null

        // 1. Time range (Current Week: Monday to Sunday)
        const nowJakarta = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }))
        const thisWeekStart = startOfWeek(nowJakarta, { weekStartsOn: 1 }).toISOString()
        const thisWeekEnd = endOfWeek(nowJakarta, { weekStartsOn: 1 }).toISOString()

        // 2. Fetch OrderItems for This Week
        let futureItemsQuery = supabase
            .from('OrderItem')
            .select('menuId, menuName, vendorName, quantity, order:Order!inner(studentId, createdAt)')
            .gte('date', thisWeekStart)
            .lte('date', thisWeekEnd)
            .neq('cancelStatus', 'APPROVED')

        if (academicYearStart) {
            futureItemsQuery = futureItemsQuery.gte('order.createdAt', academicYearStart)
        }
        const { data: futureItems, error: itemsError } = await futureItemsQuery

        if (itemsError) throw itemsError

        let topWeeklyMenus: any[] = []
        if (futureItems && futureItems.length > 0) {
            const aggregation: Record<string, any> = {}
            futureItems.forEach(item => {
                const id = item.menuId
                if (id) {
                    if (!aggregation[id]) {
                        aggregation[id] = { 
                            name: item.menuName, 
                            vendorName: item.vendorName, 
                            count: 0 
                        }
                    }
                    aggregation[id].count += (item.quantity || 1)
                }
            })

            topWeeklyMenus = Object.entries(aggregation)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 10) // Limit to top 10
                .map(([id, data]) => ({
                    id,
                    ...data
                }))
        }

        const totalItemsWeekly = futureItems?.reduce((acc, curr) => acc + (curr.quantity || 1), 0) || 0
        const uniqueStudentsWeekly = new Set(
            (futureItems || []).map(i => (i.order as any)?.studentId).filter(Boolean)
        ).size

        // 4. Calculate Unverified Orders (PENDING)
        let unverifiedQuery = supabase
            .from('Order')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PENDING')

        if (academicYearStart) {
            unverifiedQuery = unverifiedQuery.gte('createdAt', academicYearStart)
        }
        const { count: unverifiedCount } = await unverifiedQuery

        // 5. Revenue
        let revenueQuery = supabase
            .from('OrderItem')
            .select(`
                price, quantity, adminFee, cancelStatus,
                order:Order!inner(status, paymentMethod, createdAt)
            `)
            .neq('cancelStatus', 'APPROVED')

        if (academicYearStart) {
            revenueQuery = revenueQuery.gte('Order.createdAt', academicYearStart)
        }

        const { data: rawPaidItems } = await revenueQuery
            
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

        const grossTF = paidItems
            .filter(item => (item as any).order?.paymentMethod === 'TRANSFER')
            .reduce((acc, curr) => acc + ((curr.price + (curr.adminFee || 0)) * curr.quantity), 0)
        
        const grossCash = paidItems
            .filter(item => (item as any).order?.paymentMethod === 'CASH_PAY_LATER')
            .reduce((acc, curr) => acc + ((curr.price + (curr.adminFee || 0)) * curr.quantity), 0)

        // 6. Recent Activity
        let recentQuery = supabase
            .from('Order')
            .select(`
                id, totalAmount, paymentMethod, status,
                profiles:studentId(name),
                createdAt
            `)
            .order('createdAt', { ascending: false })

        if (academicYearStart) {
            recentQuery = recentQuery.gte('createdAt', academicYearStart)
        }
        const { data: recentOrders } = await recentQuery.limit(4)
        
        const recentActivity = (recentOrders || []).map(r => ({
            id: r.id,
            studentName: (r.profiles as any)?.name || 'Siswa',
            itemsCount: 'Beberapa',
            total: r.totalAmount,
            paymentMethod: r.paymentMethod,
            status: r.status
        }))

        return NextResponse.json({
            weeklyOrders: { count: totalItemsWeekly, uniqueStudents: uniqueStudentsWeekly, trend: 0 },
            revenue: { gross: grossRevenue, net: netRevenue, grossTF, grossCash, trend: 0 },
            unverifiedCount: unverifiedCount || 0,
            recentActivity: recentActivity,
            topWeeklyMenus: topWeeklyMenus
        })

    } catch (e) {
        console.error("STATS ERROR:", e)
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
