import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { startOfDay, endOfDay } from 'date-fns'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const start = searchParams.get('start')
        const end = searchParams.get('end')

        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Fetch OrderItems for this vendor's menus that are PAST/FINISHED
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
            .in('order.status', ['PAID', 'COMPLETED', 'CANCELLED'])

        if (start && end) {
            query = query
                .gte('date', startOfDay(new Date(start)).toISOString())
                .lte('date', endOfDay(new Date(end)).toISOString())
        }

        const { data, error } = await query.order('date', { ascending: false })

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (e) {
        console.error('VENDOR HISTORY ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}
