import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sendPushNotification } from '@/lib/push'

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

        // OTOMASI: Konfirmasi per-item setelah 1x24 jam dari jadwal antar untuk seluruh siswa
        const oneDayAgo = new Date()
        oneDayAgo.setDate(oneDayAgo.getDate() - 1)

        // 1. Ambil ID order yang masih berstatus PAID
        const { data: paidOrders } = await supabase
            .from('Order')
            .select('id')
            .eq('status', 'PAID')

        const paidOrderIds = (paidOrders || []).map((o: any) => o.id)

        if (paidOrderIds.length > 0) {
            // 2. Cari item katering dari order PAID yang sudah lewat 24 jam dan belum dikonfirmasi
            const { data: overdueItems } = await supabase
                .from('OrderItem')
                .select('id, orderId')
                .lt('date', oneDayAgo.toISOString())
                .is('receivedAt', null)
                .neq('cancelStatus', 'APPROVED')
                .in('orderId', paidOrderIds)

            if (overdueItems && overdueItems.length > 0) {
                const overdueIds = overdueItems.map((i: any) => i.id)
                await supabase
                    .from('OrderItem')
                    .update({ receivedAt: new Date().toISOString() })
                    .in('id', overdueIds)

                // Cek apakah semua item per order sudah ada receivedAt
                const affectedOrderIds = Array.from(new Set(overdueItems.map((i: any) => i.orderId)))
                for (const oId of affectedOrderIds) {
                    const { data: allItems } = await supabase
                        .from('OrderItem')
                        .select('receivedAt, cancelStatus')
                        .eq('orderId', oId)
                    const allDone = (allItems || []).every((i: any) => i.receivedAt !== null || i.cancelStatus === 'APPROVED')
                    if (allDone) {
                        await supabase.from('Order').update({ status: 'COMPLETED', updatedAt: new Date().toISOString() })
                            .eq('id', oId).eq('status', 'PAID')
                    }
                }
            }
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
        const { orderId, status, type, rejectionReason, paymentMethod, items } = await req.json()
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        let updateData: any = { updatedAt: new Date().toISOString() }

        if (type === 'EDIT_ORDER') {
            // 1. Fetch Admin Fee
            const { data: feeData } = await supabase.from('SystemSetting').select('value').eq('key', 'admin_fee_config').single()
            const adminFee = feeData && feeData.value ? JSON.parse(feeData.value).fee : 1000

            // 2. Calculate new totalAmount
            const totalAmount = items.reduce((acc: number, item: any) => acc + ((item.price + adminFee) * item.quantity), 0)

            // 3. Update Order
            const { error: orderError } = await supabase
                .from('Order')
                .update({
                    paymentMethod: paymentMethod,
                    totalAmount: totalAmount,
                    updatedAt: new Date().toISOString()
                })
                .eq('id', orderId)

            if (orderError) throw orderError

            // 4. Delete old OrderItems
            const { error: deleteError } = await supabase
                .from('OrderItem')
                .delete()
                .eq('orderId', orderId)

            if (deleteError) throw deleteError

            // 5. Insert new OrderItems with snapshotting
            const menuIds = items.map((i: any) => i.menuId)
            const { data: menuDetails } = await supabase
                .from('MenuItem')
                .select('id, name, vendor:profiles!vendorId(id, "vendorName", name)')
                .in('id', menuIds)

            const orderItems = items.map((item: any) => {
                const detail = menuDetails?.find(m => m.id === item.menuId)
                const vendor: any = Array.isArray(detail?.vendor) ? detail?.vendor[0] : detail?.vendor
                
                return {
                    orderId: orderId,
                    menuId: item.menuId,
                    date: new Date(item.date).toISOString(),
                    quantity: item.quantity,
                    note: item.note || null,
                    price: item.price, // Harga vendor
                    adminFee: adminFee,
                    menuName: detail?.name || item.menuName || 'Menu Terhapus',
                    vendorName: vendor?.vendorName || vendor?.name || item.vendorName || 'Vendor Terhapus',
                    vendorId: vendor?.id || item.vendorId
                }
            })

            const { error: itemsError } = await supabase
                .from('OrderItem')
                .insert(orderItems)

            if (itemsError) throw itemsError

            return NextResponse.json({ success: true })
        }

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

        if (updateData.status === 'PAID') {
            const { data: orderItems } = await supabase
                .from('OrderItem')
                .select('vendorId')
                .eq('orderId', orderId)
            
            if (orderItems && orderItems.length > 0) {
                const uniqueVendorIds = Array.from(new Set(orderItems.map((item: any) => item.vendorId).filter(Boolean)))
                for (const vId of uniqueVendorIds) {
                    sendPushNotification(vId as string, {
                        title: 'Pesanan Baru (Telah Dibayar)!',
                        body: 'Pembayaran transfer untuk pesanan baru telah disetujui admin.',
                        url: '/dashboard/vendor'
                    }).catch(err => console.error('Error sending push notification:', err))
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('ADMIN PUT ORDER ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}