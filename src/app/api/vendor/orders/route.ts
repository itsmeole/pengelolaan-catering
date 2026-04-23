import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/serverSession'

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

        // getSession = baca JWT lokal, tanpa HTTP call ke Supabase Auth
        const user = await getSessionUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Get OrderItems for menus owned by this vendor
        // Filter: Order.status is PAID/COMPLETED OR (PENDING AND CASH_PAY_LATER)
        // This ensures vendors only see orders that are either pre-paid or committed cash-on-school
        const { data, error } = await supabase
            .from('OrderItem')
            .select(`
                *,
                order:"Order"!inner(
                    id, status, paymentMethod, studentId,
                    student:profiles!studentId(name, class)
                )
            `)
            .eq('vendorId', user.id)
            .or('status.in.("PAID","COMPLETED"),and(status.eq.PENDING,paymentMethod.eq.CASH_PAY_LATER)', { foreignTable: 'order' })
            .order('date', { ascending: true })

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (e) {
        console.error('VENDOR ORDERS ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}
