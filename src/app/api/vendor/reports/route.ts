import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { startOfDay, endOfDay, format } from 'date-fns'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const start = searchParams.get('start')
        const end = searchParams.get('end')

        if (!start || !end) {
            return NextResponse.json({ error: 'Start and end dates required' }, { status: 400 })
        }

        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // 1. Fetch ALL OrderItems for this vendor in the range
        // Filter by PAID or COMPLETED
        const { data: items, error } = await supabase
            .from('OrderItem')
            .select(`
                id, quantity, price, adminFee, date, cancelStatus, menuName,
                order:"Order"!inner(
                    status,
                    createdAt,
                    student:profiles!studentId(name, class)
                )
            `)
            .eq('vendorId', user.id)
            .gte('date', startOfDay(new Date(start)).toISOString())
            .lte('date', endOfDay(new Date(end)).toISOString())
            .in('order.status', ['PAID', 'COMPLETED'])
            // Hapus .neq('cancelStatus', 'APPROVED')

        if (error) throw error

        // 2. Transform for display
        const details = (items || []).map(item => {
            const netIncome = item.price * item.quantity
            const totalAdminFee = (item.adminFee || 0) * item.quantity
            const totalPrice = netIncome + totalAdminFee

            return {
                id: item.id,
                date: format(new Date(item.date), "dd/MM/yyyy"),
                processedAt: (item.order as any)?.createdAt,
                studentName: (item.order as any)?.student?.name || 'Siswa',
                studentClass: (item.order as any)?.student?.class || '-',
                itemName: item.menuName || 'Menu',
                totalPrice,
                adminFee: totalAdminFee,
                netIncome,
                quantity: item.quantity,
                refundStatus: item.cancelStatus || 'NONE'
            }
        })

        // 3. Summary: EXCLUDE approved cancellations
        const activeDetails = details.filter(d => d.refundStatus !== 'APPROVED')
        const grossRevenue = activeDetails.reduce((acc, curr) => acc + curr.totalPrice, 0)
        const netRevenue = activeDetails.reduce((acc, curr) => acc + curr.netIncome, 0)
        const totalPortions = activeDetails.reduce((acc, curr) => acc + curr.quantity, 0)

        // Aggregation for chart (Group by day)
        const chartMap: Record<string, { date: string, income: number, portions: number }> = {}
        details.forEach(d => {
            const dayKey = d.date.split('/').reverse().join('-') // YYYY-MM-DD
            if (!chartMap[dayKey]) chartMap[dayKey] = { date: dayKey, income: 0, portions: 0 }
            chartMap[dayKey].income += d.netIncome
            chartMap[dayKey].portions += d.quantity
        })
        const chart = Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date))

        return NextResponse.json({
            summary: { grossRevenue, netRevenue, totalPortions },
            details,
            chart
        })

    } catch (e) {
        console.error('VENDOR REPORTS ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}
