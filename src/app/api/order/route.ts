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

        const { data, error } = await supabase
            .from('Order')
            .select(`
                *,
                items:"OrderItem"(
                    *,
                    menu:"MenuItem"(
                        id, name, imageUrl, price,
                        vendor:profiles!vendorId(id, name, "vendorName")
                    )
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

// POST: Checkout — create a new Order with its OrderItems
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { items, paymentMethod, proofImage } = body

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'Keranjang kosong' }, { status: 400 })
        }

        // Calculate total
        const totalAmount = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)

        // Create the Order
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

        if (orderError || !order) {
            console.error('Order insert error:', orderError)
            throw orderError
        }

        // Create OrderItems
        const orderItems = items.map((item: any) => ({
            orderId: order.id,
            menuId: item.menuId,
            date: new Date(item.date).toISOString(),
            quantity: item.quantity,
            note: item.note || null,
            price: item.price, // Final price (Base + 1000)
            adminFee: 1000,    // Fixed margin for admin
        }))

        const { error: itemsError } = await supabase
            .from('OrderItem')
            .insert(orderItems)

        if (itemsError) {
            console.error('OrderItems insert error:', itemsError)
            throw itemsError
        }

        return NextResponse.json({ success: true, orderId: order.id })
    } catch (e) {
        console.error('POST /api/order error:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}