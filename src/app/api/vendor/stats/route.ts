import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from "date-fns"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "VENDOR") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const today = new Date()
        const tomorrow = addDays(today, 1)
        const weekStart = startOfWeek(today)
        const weekEnd = endOfWeek(today)

        // Tomorrow's Orders
        const tomorrowItems = await db.orderItem.findMany({
            where: {
                menu: { vendorId: session.user.id },
                date: {
                    gte: startOfDay(tomorrow),
                    lte: endOfDay(tomorrow)
                },
                order: { status: { not: "CANCELLED" } }
            },
            include: { menu: true }
        })

        // Weekly Orders
        const weeklyItems = await db.orderItem.count({
            where: {
                menu: { vendorId: session.user.id },
                date: {
                    gte: weekStart,
                    lte: weekEnd
                },
                order: { status: { not: "CANCELLED" } }
            }
        })

        // Calculate Revenue (Weekly)
        const weeklyOrderItems = await db.orderItem.findMany({
            where: {
                menu: { vendorId: session.user.id },
                date: {
                    gte: weekStart,
                    lte: weekEnd
                },
                order: { status: { not: "CANCELLED" } }
            },
            include: { menu: true }
        })

        let grossRevenue = 0
        let netRevenue = 0

        weeklyOrderItems.forEach(item => {
            const itemTotal = item.menu.price * item.quantity
            grossRevenue += itemTotal
            // Fee 1000 per quantity? Or per menu item line? "dari harga setiap menu ... dipotong 1000"
            // Usually per portion.
            const fee = 1000 * item.quantity
            netRevenue += (itemTotal - fee)
        })

        // Cooking List (Tomorrow) aggregated
        const cookingMap = new Map<string, { name: string, qty: number, notes: string[] }>()
        tomorrowItems.forEach(item => {
            const existing = cookingMap.get(item.menuId)
            if (existing) {
                existing.qty += item.quantity
                if (item.note) existing.notes.push(item.note)
            } else {
                cookingMap.set(item.menuId, {
                    name: item.menu.name,
                    qty: item.quantity,
                    notes: item.note ? [item.note] : []
                })
            }
        })

        return NextResponse.json({
            tomorrowOrderCount: tomorrowItems.length,
            weeklyOrderCount: weeklyItems,
            grossRevenue,
            netRevenue,
            cookingList: Array.from(cookingMap.values())
        })

    } catch (error) {
        console.error("[VENDOR_STATS]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
