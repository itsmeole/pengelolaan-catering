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

        // 1. Calculate orders for Tomorrow
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStart = new Date(tomorrow.setHours(0,0,0,0)).toISOString()
        const tomorrowEnd = new Date(tomorrow.setHours(23,59,59,999)).toISOString()

        const { data: orderItems, error: itemsError } = await supabase
            .from('OrderItem')
            .select('id, quantity')
            .gte('date', tomorrowStart)
            .lte('date', tomorrowEnd)
        
        const totalItemsTomorrow = orderItems?.reduce((acc, curr) => acc + (curr.quantity || 1), 0) || 0

        // 2. Calculate Unverified Orders
        const { count: unverifiedCount } = await supabase
            .from('Order')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PENDING')

        // 3. Revenue (Gross = Student Payments, Net = Accumulation of adminFees)
        const { data: paidItems } = await supabase
            .from('OrderItem')
            .select(`
                price, quantity, adminFee,
                order:Order!inner(status)
            `)
            .in('order.status', ['PAID', 'COMPLETED'])
        
        const grossRevenue = paidItems?.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) || 0
        const netRevenue = paidItems?.reduce((acc, curr) => acc + ((curr.adminFee || 0) * curr.quantity), 0) || 0

        // 4. Recent Activity (Last 5 orders)
        // Since we don't have deep joins easily accessible without views, we do basic fetch
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
            itemsCount: 'Beberapa', // Simplification to avoid extra queries for now
            total: r.totalAmount,
            paymentMethod: r.paymentMethod,
            status: r.status
        }))

        // Return full Payload
        return NextResponse.json({
            weeklyOrders: { count: totalItemsTomorrow, trend: 0 },
            revenue: { gross: grossRevenue, net: netRevenue, trend: 0 },
            unverifiedCount: unverifiedCount || 0,
            recentActivity: recentActivity,
            topMenu: null // Hard to aggregate without SQL RPC, keep empty for now to show 'Belum ada pesanan'
        })

    } catch (e) {
        console.error("STATS ERROR:", e)
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
