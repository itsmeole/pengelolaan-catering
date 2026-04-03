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
                id, quantity, price, adminFee, date,
                menu:"MenuItem"!inner(id, name, vendorId),
                order:"Order"!inner(
                    status,
                    student:profiles!studentId(name, class)
                )
            `)
            .eq('menu.vendorId', user.id)
            .gte('date', startOfDay(new Date(start)).toISOString())
            .lte('date', endOfDay(new Date(end)).toISOString())
            .in('order.status', ['PAID', 'COMPLETED'])

        if (error) throw error

        // 2. Transform for display
        const details = (items || []).map(item => {
            const totalPrice = item.price * item.quantity
            const totalAdminFee = (item.adminFee || 0) * item.quantity
            const netIncome = totalPrice - totalAdminFee

            return {
                date: format(new Date(item.date), "dd/MM/yyyy"),
                studentName: (item as any).order?.student?.name || 'Siswa',
                studentClass: (item as any).order?.student?.class || '-',
                itemName: (item.menu as any)?.name || 'Menu',
                totalPrice,
                adminFee: totalAdminFee,
                netIncome,
                quantity: item.quantity
            }
        })

        // 3. Summary
        const grossRevenue = details.reduce((acc, curr) => acc + curr.totalPrice, 0)
        const netRevenue = details.reduce((acc, curr) => acc + curr.netIncome, 0)
        const totalPortions = details.reduce((acc, curr) => acc + curr.quantity, 0)

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
