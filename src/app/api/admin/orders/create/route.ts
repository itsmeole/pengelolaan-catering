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

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        // 1. Verifikasi Admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.user_metadata?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { studentId, items, paymentMethod, proofImage } = await req.json()

        if (!studentId || !items || items.length === 0) {
            return NextResponse.json({ error: 'Data pesanan tidak lengkap' }, { status: 400 })
        }

        const { data: feeData } = await supabase.from('SystemSetting').select('value').eq('key', 'admin_fee_config').single()
        const adminFee = feeData ? JSON.parse(feeData.value).fee : 1000

        // Total amount (Vendor Price + Admin Fee per item)
        const totalAmount = items.reduce((acc: number, item: any) => acc + ((item.price + adminFee) * item.quantity), 0)

        // 2. Buat Order (Default PENDING untuk transparansi manual)
        const { data: order, error: orderError } = await supabase
            .from('Order')
            .insert({
                studentId,
                totalAmount,
                status: 'PENDING', 
                paymentMethod: paymentMethod || 'CASH_PAY_LATER',
                proofImage: proofImage || null,
                updatedAt: new Date().toISOString()
            })
            .select()
            .single()

        if (orderError || !order) {
            console.error('Order Error:', orderError)
            throw orderError
        }

        // 3. Fetch Menu Details for Snapshotting
        const menuIds = items.map((i: any) => i.menuId)
        const { data: menuDetails } = await supabase
            .from('MenuItem')
            .select('id, name, vendor:profiles!vendorId(id, "vendorName", name)')
            .in('id', menuIds)

        const orderItems = items.map((item: any) => {
            const detail = menuDetails?.find(m => m.id === item.menuId)
            // Supabase join sometimes returns array even for single relation in types
            const vendor: any = Array.isArray(detail?.vendor) ? detail?.vendor[0] : detail?.vendor
            
            return {
                orderId: order.id,
                menuId: item.menuId,
                date: new Date(item.date).toISOString(),
                quantity: item.quantity,
                note: item.note || null,
                price: item.price,
                adminFee: adminFee,
                menuName: detail?.name || 'Menu Terhapus',
                vendorName: vendor?.vendorName || vendor?.name || 'Vendor Terhapus',
                vendorId: vendor?.id
            }
        })

        const { error: itemsError } = await supabase
            .from('OrderItem')
            .insert(orderItems)

        if (itemsError) {
            console.error('Items Error:', itemsError)
            throw itemsError
        }

        return NextResponse.json({ success: true, orderId: order.id })
    } catch (e: any) {
        console.error('ADMIN CREATE ORDER ERROR:', e)
        return NextResponse.json({ error: 'System Error', details: e.message }, { status: 500 })
    }
}
