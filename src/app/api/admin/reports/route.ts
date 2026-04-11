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

        // Fetch OrderItems within range where parent Order is PAID or COMPLETED
        // Include items even if they are APPROVED for cancellation (for transparency)
        const { data: items, error } = await supabase
            .from('OrderItem')
            .select(`
                id, quantity, price, adminFee, date, cancelStatus, cancelReason,
                menuName, vendorName,
                order:"Order"!inner(
                    status,
                    createdAt,
                    student:profiles!studentId(name)
                )
            `)
            .gte('date', startOfDay(new Date(start)).toISOString())
            .lte('date', endOfDay(new Date(end)).toISOString())
            .in('order.status', ['PAID', 'COMPLETED', 'CANCELLED'])
            .order('createdAt', { referencedTable: 'Order', ascending: false })

        if (error) throw error

        // Transform for display
        const details = (items || []).map(item => {
            return {
                id: item.id,
                transactionDate: format(new Date((item as any).order?.createdAt), "dd/MM/yyyy HH:mm"),
                deliveryDate: format(new Date(item.date), "dd/MM/yyyy"),
                studentName: (item as any).order?.student?.name || 'Siswa',
                vendorName: item.vendorName || 'Vendor Terhapus',
                itemName: item.menuName || 'Menu Terhapus',
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity,
                adminFee: (item.adminFee || 0) * item.quantity,
                refundStatus: (item as any).order?.status === 'CANCELLED' ? 'APPROVED' : (item.cancelStatus || 'NONE'),
                refundReason: item.cancelReason || null
            }
        })

        // Summary: EXCLUDE approved cancellations from money totals
        const filterActive = (d: any) => d.refundStatus !== 'APPROVED'
        const totalOrders = details.filter(filterActive).length
        const grossRevenue = details.filter(filterActive).reduce((acc, curr) => acc + curr.total, 0)
        const netRevenue = details.filter(filterActive).reduce((acc, curr) => acc + curr.adminFee, 0)

        // Aggregation for chart (Group by day)
        const chartMap: Record<string, { date: string, gross: number, net: number }> = {}
        details.forEach(d => {
            const dayKey = d.deliveryDate.split('/').reverse().join('-') // YYYY-MM-DD
            if (!chartMap[dayKey]) chartMap[dayKey] = { date: dayKey, gross: 0, net: 0 }
            chartMap[dayKey].gross += d.total
            chartMap[dayKey].net += d.adminFee
        })
        const chart = Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date))

        return NextResponse.json({
            summary: { totalOrders, grossRevenue, netRevenue },
            details,
            chart
        })

    } catch (e) {
        console.error('REPORTS ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}
