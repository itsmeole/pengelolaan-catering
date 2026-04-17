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

// POST: Pembatalan/Refund (Siswa = PENDING, Admin = langsung APPROVED)
export async function POST(req: Request) {
    try {
        const { orderId, reason, otherReason, cancelImage, itemIds, adminInitiated } = await req.json()
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

        if (adminInitiated) {
            // ── ADMIN REFUND: Langsung APPROVED tanpa perlu review ──────────────

            // 1. Ambil data item yang akan direfund untuk menghitung pengurangan
            const { data: cancelItems, error: fetchErr } = await supabase
                .from('OrderItem')
                .select('id, price, adminFee, quantity')
                .in('id', itemIds)

            if (fetchErr) throw fetchErr

            // 2. Set item menjadi APPROVED
            const { error: itemErr } = await supabase
                .from('OrderItem')
                .update({
                    cancelStatus: 'APPROVED',
                    cancelReason: finalReason,
                    cancelImage: cancelImage || null
                })
                .in('id', itemIds)

            if (itemErr) throw itemErr

            // 3. Hitung total yang dikurangi dari Order
            const deduction = (cancelItems || []).reduce((sum, i) => {
                return sum + (i.price + i.adminFee) * i.quantity
            }, 0)

            // 4. Ambil Order saat ini dan update totalAmount
            const { data: orderData, error: orderFetchErr } = await supabase
                .from('Order')
                .select('totalAmount, id')
                .eq('id', orderId)
                .single()

            if (orderFetchErr || !orderData) throw orderFetchErr || new Error('Order not found')

            const newTotal = Math.max(0, (orderData.totalAmount || 0) - deduction)

            // 5. Cek apakah masih ada item aktif
            const { data: activeItems } = await supabase
                .from('OrderItem')
                .select('id')
                .eq('orderId', orderId)
                .neq('cancelStatus', 'APPROVED')

            const allCancelled = !activeItems || activeItems.length === 0

            // 6. Update Order
            const { error: orderUpdateErr } = await supabase
                .from('Order')
                .update({
                    totalAmount: newTotal,
                    cancelStatus: 'NONE',   // Reset status pengajuan
                    cancelReason: allCancelled ? finalReason : null,
                    status: allCancelled ? 'CANCELLED' : undefined,
                    updatedAt: new Date().toISOString()
                })
                .eq('id', orderId)

            if (orderUpdateErr) throw orderUpdateErr

            return NextResponse.json({ success: true, deduction, newTotal, allCancelled })

        } else {
            // ── STUDENT REQUEST: Set PENDING, tunggu persetujuan Admin ──────────

            const { error: itemError } = await supabase
                .from('OrderItem')
                .update({
                    cancelStatus: 'PENDING',
                    cancelReason: finalReason,
                    cancelImage: cancelImage || null
                })
                .in('id', itemIds)

            if (itemError) throw itemError

            const { error: orderError } = await supabase
                .from('Order')
                .update({
                    cancelStatus: 'PENDING',
                    cancelReason: finalReason,
                    cancelImage: cancelImage || null,
                    updatedAt: new Date().toISOString()
                })
                .eq('id', orderId)
                .eq('studentId', user.id)

            if (orderError) throw orderError

            return NextResponse.json({ success: true })
        }

    } catch (e) {
        console.error('CANCEL ORDER ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}
