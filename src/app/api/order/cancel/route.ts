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

// POST: Pesanan pembatalan oleh Siswa (Bisa parsial per item/hari)
export async function POST(req: Request) {
    try {
        const { orderId, reason, otherReason, cancelImage, itemIds } = await req.json()
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!itemIds || itemIds.length === 0) {
            return NextResponse.json({ error: 'Mohon pilih minimal satu makanan yang ingin dibatalkan.' }, { status: 400 })
        }

        // Tentukan teks alasan final
        let finalReason = reason
        if (reason === 'OTHER' && otherReason) {
            finalReason = `LAINNYA: ${otherReason}`
        }

        // 1. Update status pada OrderItem yang dipilih
        const { error: itemError } = await supabase
            .from('OrderItem')
            .update({
                cancelStatus: 'PENDING',
                cancelReason: finalReason,
                cancelImage: cancelImage || null
            })
            .in('id', itemIds)

        if (itemError) throw itemError

        // 2. Tandai Order utama bahwa ada pengajuan pembatalan (untuk review Admin)
        const { error: orderError } = await supabase
            .from('Order')
            .update({
                cancelStatus: 'PENDING',
                cancelReason: finalReason, // Simpan alasan utama ke Order untuk ringkasan
                cancelImage: cancelImage || null,
                updatedAt: new Date().toISOString()
            })
            .eq('id', orderId)
            .eq('studentId', user.id)

        if (orderError) throw orderError

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('CANCEL ORDER ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}
