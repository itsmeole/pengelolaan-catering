import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function getClient(cookieStore: any) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() {}
            }
        }
    )
}

// GET: Fetch all orders for the current logged-in student
export async function GET() {
    try {
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
                .eq('studentId', user.id)
                .eq('status', 'PAID')
        }

        const { data, error } = await supabase
            .from('Order')
            .select(`
                id, studentId, totalAmount, status, paymentMethod, proofImage, isProofInvalid, rejectionReason, cancelStatus, createdAt, updatedAt,
                items:"OrderItem"(
                    id, orderId, menuId, date, quantity, note, price, adminFee, menuName, vendorName, vendorId, cancelStatus,
                    menu:"MenuItem"(imageUrl, name)
                )
            `)
            .eq('studentId', user.id)
            .order('createdAt', { ascending: false })

        if (error) throw error
        return NextResponse.json(data || [])
    } catch (e) {
        console.error('GET /api/order error:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}

// PATCH: Untuk mengunggah ulang bukti transfer atau konfirmasi pesanan selesai
export async function PATCH(req: Request) {
    try {
        const { orderId, proofImage, status } = await req.json()
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const updateData: any = { updatedAt: new Date().toISOString() }
        
        if (proofImage) {
            updateData.proofImage = proofImage
            updateData.isProofInvalid = false
            updateData.rejectionReason = null
        }

        if (status === 'COMPLETED') {
            updateData.status = 'COMPLETED'
        }

        const { error } = await supabase
            .from('Order')
            .update(updateData)
            .eq('id', orderId)
            .eq('studentId', user.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}

// POST: Checkout — create a new Order with its OrderItems
export async function POST(req: Request) {
    // ... (Keep existing code)
    try {
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { items, paymentMethod, proofImage } = body

        // --- 0. CEK ANTI SPAM ---
        const { data: activeOrders } = await supabase
            .from('Order')
            .select('id')
            .eq('studentId', user.id)
            .in('status', ['PENDING', 'PAID'])
            .limit(1)

        if (activeOrders && activeOrders.length > 0) {
            return NextResponse.json({ error: 'Anda masih memiliki pesanan aktif yang belum dibayar atau didistribusikan. Harap selesaikan pesanan sebelumnya agar bisa membuat pesanan baru.' }, { status: 400 })
        }

        // --- VALIDASI DEADLINE HARI H ---
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'STUDENT') {
            const { data: configData } = await supabase.from('SystemSetting').select('value').eq('key', 'working_days_config').single()
            const config = configData ? JSON.parse(configData.value) : { deadlineTime: "20:00" }
            const [dHour, dMin] = (config.deadlineTime || "20:00").split(":").map(Number)
            const now = new Date()

            for (const item of items) {
                const itemDate = new Date(item.date)
                const deadline = new Date(itemDate)
                deadline.setHours(dHour, dMin, 0, 0)

                if (now > deadline) {
                    return NextResponse.json({ 
                        error: `Batas jam pemesanan masuk untuk tanggal ${itemDate.toLocaleDateString('id-ID')} sudah ditutup secara harian pada pukul ${config.deadlineTime || "20:00"}.` 
                    }, { status: 403 })
                }
            }
        }
        // --- END VALIDASI ---

        // Ambil Admin Fee dari DB untuk keamanan validasi harga di backend
        const { data: feeData } = await supabase.from('SystemSetting').select('value').eq('key', 'admin_fee_config').single()
        const adminFee = feeData && feeData.value ? JSON.parse(feeData.value).fee : 1000

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'Keranjang kosong' }, { status: 400 })
        }
        
        if (items.some((i: any) => i.quantity < 1)) {
            return NextResponse.json({ error: 'Jumlah porsi tidak valid (minimal 1)' }, { status: 400 })
        }

        const totalAmount = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)

        const { data: order, error: orderError } = await supabase
            .from('Order')
            .insert({
                studentId: user.id,
                totalAmount,
                status: 'PENDING',
                paymentMethod,
                proofImage: proofImage || null,
            })
            .select()
            .single()

        if (orderError || !order) throw orderError

        // 3. Fetch Menu Details for Snapshotting
        const menuIds = items.map((i: any) => i.menuId)
        const { data: menuDetails } = await supabase
            .from('MenuItem')
            .select('id, name, vendor:profiles!vendorId(id, "vendorName", name)')
            .in('id', menuIds)

        const orderItems = items.map((item: any) => {
            const detail = menuDetails?.find(m => m.id === item.menuId)
            const vendor: any = Array.isArray(detail?.vendor) ? detail?.vendor[0] : detail?.vendor

            return {
                orderId: order.id,
                menuId: item.menuId,
                date: new Date(item.date).toISOString(),
                quantity: item.quantity,
                note: item.note || null,
                price: item.price - adminFee,
                adminFee: adminFee,
                menuName: detail?.name || 'Menu Terhapus',
                vendorName: vendor?.vendorName || vendor?.name || 'Vendor Terhapus',
                vendorId: vendor?.id
            }
        })

        const { error: itemsError } = await supabase
            .from('OrderItem').insert(orderItems)

        if (itemsError) throw itemsError

        return NextResponse.json({ success: true, orderId: order.id })
    } catch (e) {
        console.error('POST /api/order error:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}