import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/serverSession'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const start = searchParams.get('start')
        const end = searchParams.get('end')

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

        // Get academicYearStart if exists
        const { data: settingData } = await supabase
            .from('SystemSetting')
            .select('value')
            .eq('key', 'new_academic_year_start')
            .maybeSingle()

        const academicYearStart = settingData ? JSON.parse(settingData.value).academicYearStart : null

        // Get OrderItems for menus owned by this vendor
        // Filter: Order.status is PAID/COMPLETED OR (PENDING AND CASH_PAY_LATER)
        // This ensures vendors only see orders that are either pre-paid or committed cash-on-school
        let query = supabase
            .from('OrderItem')
            .select(`
                *,
                order:"Order"!inner(
                    id, status, paymentMethod, studentId, createdAt,
                    student:profiles!studentId(name, class)
                )
            `)
            .eq('vendorId', user.id)
            .or('status.in.("PAID","COMPLETED"),and(status.eq.PENDING,paymentMethod.eq.CASH_PAY_LATER)', { foreignTable: 'order' })

        if (academicYearStart) {
            query = query.gte('order.createdAt', academicYearStart)
        }

        // Apply date range filters on the database query level if provided
        if (start) {
            const startDate = new Date(start)
            startDate.setHours(0,0,0,0)
            query = query.gte('date', startDate.toISOString())
        }
        if (end) {
            const endDate = new Date(end)
            endDate.setHours(23,59,59,999)
            query = query.lte('date', endDate.toISOString())
        }

        const { data, error } = await query
            .order('date', { ascending: true })
            .order('createdAt', { ascending: false, foreignTable: 'order' })

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (e) {
        console.error('VENDOR ORDERS ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}
