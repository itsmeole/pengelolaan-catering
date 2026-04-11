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
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const start = searchParams.get('start')
        const end = searchParams.get('end')

        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        // OTOMASI: Ubah status PAID ke COMPLETED jika sudah > 5 hari dari jadwal makan terbaru
        const fiveDaysAgo = new Date()
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

        const { data: oldItems } = await supabase
            .from('OrderItem')
            .select('orderId')
            .lt('date', fiveDaysAgo.toISOString())

        if (oldItems && oldItems.length > 0) {
            const oldOrderIds = Array.from(new Set(oldItems.map(i => i.orderId)))
            await supabase
                .from('Order')
                .update({ status: 'COMPLETED', updatedAt: new Date().toISOString() })
                .in('id', oldOrderIds)
                .eq('status', 'PAID')
        }

        let query = supabase
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

        if (start) {
            query = query.gte('createdAt', new Date(start).toISOString())
        }
        if (end) {
            // Set end to end of day
            const endDate = new Date(end)
            endDate.setHours(23, 59, 59, 999)
            query = query.lte('createdAt', endDate.toISOString())
        }

        const { data, error } = await query.order('createdAt', { ascending: false })

        if (error) throw error
        return NextResponse.json(data || [])
    } catch (e) {
        console.error('ADMIN GET ORDERS ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}

// PUT: Update status pesanan (konfirmasi bayar, penolakan bukti, pembatalan, dll)
export async function PUT(req: Request) {
    try {
        const { orderId, status, type, rejectionReason } = await req.json()
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        let updateData: any = { updatedAt: new Date().toISOString() }

        if (type === 'REJECT_PROOF') {
            updateData = {
                isProofInvalid: true,
                rejectionReason: rejectionReason || "Bukti transfer tidak valid/kurang jelas",
                proofImage: null,
                updatedAt: new Date().toISOString()
            }
        } else if (type === 'APPROVE_CANCEL') {
            // 1. Update OrderItem yang berstatus PENDING menjadi APPROVED
            await supabase
                .from('OrderItem')
                .update({ cancelStatus: 'APPROVED' })
                .eq('orderId', orderId)
                .eq('cancelStatus', 'PENDING')

            // 2. Cek apakah ada item yang MASIH AKTIF (tidak dibatalkan)
            const { data: activeItems } = await supabase
                .from('OrderItem')
                .select('id')
                .eq('orderId', orderId)
                .neq('cancelStatus', 'APPROVED')

            // Jika semua item dibatalkan, maka Order total menjadi CANCELLED
            // Jika masih ada sisa, tetap PAID agar pesanan lain tetap terkirim
            updateData = {
                status: (activeItems && activeItems.length > 0) ? 'PAID' : 'CANCELLED',
                cancelStatus: 'NONE', // Reset status pengajuan di level Order
                updatedAt: new Date().toISOString()
            }
        } else if (type === 'REJECT_CANCEL') {
            // Kembalikan status OrderItem ke NONE
            await supabase
                .from('OrderItem')
                .update({ cancelStatus: 'NONE' })
                .eq('orderId', orderId)
                .eq('cancelStatus', 'PENDING')

            updateData = {
                cancelStatus: 'NONE',
                updatedAt: new Date().toISOString()
            }
        } else {
            updateData.status = status
        }

        const { error } = await supabase
            .from('Order')
            .update(updateData)
            .eq('id', orderId)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('ADMIN PUT ORDER ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}