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

        // Fetch OrderItems — include vendor owner name (profiles.name)
        const { data: items, error } = await supabase
            .from('OrderItem')
            .select(`
                id, quantity, price, adminFee, date, cancelStatus, cancelReason,
                menuName, vendorName, vendorId,
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

        // Fetch vendor owner names (profiles.name) for all unique vendorIds
        const vendorIds = [...new Set((items || []).map((i: any) => i.vendorId).filter(Boolean))]
        let ownerMap: Record<string, string> = {}
        if (vendorIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, vendorName')
                .in('id', vendorIds)
            ;(profiles || []).forEach((p: any) => {
                ownerMap[p.id] = p.name || p.vendorName || 'Vendor'
            })
        }

        // Transform for display
        // refundStatus: admin refund → APPROVED immediately; student request → PENDING
        const details = (items || []).map(item => {
            const isApproved = item.cancelStatus === 'APPROVED' || (item as any).order?.status === 'CANCELLED'
            const refundStatus = isApproved ? 'APPROVED' : (item.cancelStatus || 'NONE')
            const grossPerItem  = (item.price + (item.adminFee || 0)) * item.quantity
            const netPerItem    = (item.adminFee || 0) * item.quantity
            return {
                id: item.id,
                transactionDate: format(new Date((item as any).order?.createdAt), "dd/MM/yyyy HH:mm"),
                deliveryDate: format(new Date(item.date), "dd/MM/yyyy"),
                studentName: (item as any).order?.student?.name || 'Siswa',
                vendorId: item.vendorId,
                vendorName: item.vendorName || 'Vendor Terhapus',      // nama kantin (PAKET)
                ownerName: ownerMap[item.vendorId] || item.vendorName || 'Vendor', // nama pemilik (CATERING)
                itemName: item.menuName || 'Menu Terhapus',
                price: item.price,
                quantity: item.quantity,
                total: grossPerItem,        // (price + adminFee) * qty
                adminFee: netPerItem,       // adminFee * qty
                refundStatus,
                refundReason: item.cancelReason || null
            }
        })

        // Summary: EXCLUDE approved cancellations from money totals
        const filterActive = (d: any) => d.refundStatus !== 'APPROVED'
        const totalOrders  = details.filter(filterActive).length
        const grossRevenue = details.filter(filterActive).reduce((acc, curr) => acc + curr.total, 0)
        const netRevenue   = details.filter(filterActive).reduce((acc, curr) => acc + curr.adminFee, 0)

        // Aggregation for chart (Group by delivery date)
        const chartMap: Record<string, { date: string, gross: number, net: number, count: number }> = {}
        details.forEach(d => {
            if (d.refundStatus === 'APPROVED') return
            // deliveryDate = "dd/MM/yyyy" → convert to YYYY-MM-DD for sorting
            const [dd, mm, yyyy] = d.deliveryDate.split('/')
            const dayKey = `${yyyy}-${mm}-${dd}`
            if (!chartMap[dayKey]) chartMap[dayKey] = { date: dayKey, gross: 0, net: 0, count: 0 }
            chartMap[dayKey].gross += d.total
            chartMap[dayKey].net   += d.adminFee
            chartMap[dayKey].count += 1
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
