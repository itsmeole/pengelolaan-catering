import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function getClient(cookieStore: any) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
}

// GET: Semua pesanan seluruh siswa untuk Admin
export async function GET() {
    try {
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const { data, error } = await supabase
            .from('Order')
            .select(`
                *,
                student:profiles!studentId(id, name, email, nis, class),
                items:"OrderItem"(
                    *,
                    menu:"MenuItem"(
                        id, name, price, imageUrl,
                        vendor:profiles!vendorId(id, name, "vendorName")
                    )
                )
            `)
            .order('createdAt', { ascending: false })

        if (error) throw error
        return NextResponse.json(data || [])
    } catch (e) {
        console.error('ADMIN GET ORDERS ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}

// PUT: Update status pesanan (konfirmasi bayar, dll)
export async function PUT(req: Request) {
    try {
        const { orderId, status } = await req.json()
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const { error } = await supabase
            .from('Order')
            .update({ status, updatedAt: new Date().toISOString() })
            .eq('id', orderId)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}