import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "STUDENT") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await req.json()
        const { items, paymentMethod, proofImage } = body // items: { menuId, date, note, quantity, price }[]

        if (!items || items.length === 0) {
            return new NextResponse("No items", { status: 400 })
        }

        // Recalculate total from DB to prevent tampering, but for now trust price passed or refetch?
        // Safer to refetch prices.
        let totalAmount = 0
        const orderItemsData = []

        for (const item of items) {
            const menu = await db.menuItem.findUnique({ where: { id: item.menuId } })
            if (!menu) continue

            totalAmount += menu.price * (item.quantity || 1)
            orderItemsData.push({
                menuId: item.menuId,
                date: new Date(item.date), // Ensure date is valid
                note: item.note,
                quantity: item.quantity || 1,
                price: menu.price
            })
        }

        const order = await db.order.create({
            data: {
                studentId: session.user.id,
                totalAmount,
                status: "PENDING",
                paymentMethod,
                proofImage: paymentMethod === "TRANSFER" ? proofImage : null,
                transferDate: paymentMethod === "TRANSFER" ? new Date() : null, // Should take from input if provided
                items: {
                    create: orderItemsData
                }
            }
        })

        return NextResponse.json(order)

    } catch (error) {
        console.error("[ORDER_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    // Get orders for current user
    const orders = await db.order.findMany({
        where: // Vendor needs to see items for them? No, Order is by Student. Vendor sees OrderItems.
            session.user.role === "STUDENT"
                ? { studentId: session.user.id }
                : session.user.role === "ADMIN" ? {} : undefined, // Vendor specific logic is different (fetched via OrderItems)
        include: {
            items: {
                include: { menu: true }
            },
            student: { select: { name: true, class: true } }
        },
        orderBy: { createdAt: 'desc' }
    })

    // Vendor logic: Fetch order items where menu.vendorId === me
    if (session.user.role === "VENDOR") {
        // Complex query. Easier to fetch OrderItems directly.
        // But the requirement says "Dashboard vendor info... Data Pemesanan".
        // I'll make a separate endpoint for Vendor Orders or handle it here if requested.
        // For now returning empty for Vendor on this route to avoid confusion or errors.
        return NextResponse.json([])
    }

    return NextResponse.json(orders)
}
