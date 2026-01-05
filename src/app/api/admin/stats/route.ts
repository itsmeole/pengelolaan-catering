import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { startOfWeek, endOfWeek, subWeeks } from "date-fns"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const today = new Date()
        const weekStart = startOfWeek(today)
        const weekEnd = endOfWeek(today)
        const lastWeekStart = startOfWeek(subWeeks(today, 1))
        const lastWeekEnd = endOfWeek(subWeeks(today, 1))

        // 1. Total Orders (Weekly)
        const weeklyOrdersCount = await db.order.count({
            where: {
                createdAt: { gte: weekStart, lte: weekEnd },
                status: { not: "CANCELLED" }
            }
        })

        const lastWeeklyOrdersCount = await db.order.count({
            where: { createdAt: { gte: lastWeekStart, lte: lastWeekEnd }, status: { not: "CANCELLED" } }
        })

        // 2. Revenue Calculation
        // Get all paid/completed orders for this week
        const weeklyRevenueItems = await db.order.findMany({
            where: {
                createdAt: { gte: weekStart, lte: weekEnd },
                status: { in: ["PAID", "COMPLETED"] }
            },
            include: { items: true }
        })

        let grossRevenue = 0 // Total money in
        let adminFeeTotal = 0 // Net revenue for admin (1000 per portion)

        weeklyRevenueItems.forEach(order => {
            grossRevenue += order.totalAmount
            order.items.forEach(item => {
                adminFeeTotal += (1000 * item.quantity)
            })
        })

        // Last week revenue for trend
        const lastWeeklyRevenueItems = await db.order.findMany({
            where: {
                createdAt: { gte: lastWeekStart, lte: lastWeekEnd },
                status: { in: ["PAID", "COMPLETED"] }
            },
            include: { items: true }
        })
        let lastGrossRevenue = 0
        lastWeeklyRevenueItems.forEach(o => lastGrossRevenue += o.totalAmount)

        // 3. Recent Activity (Limit 5)
        const recentActivity = await db.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { student: true, items: true }
        })

        return NextResponse.json({
            weeklyOrders: {
                count: weeklyOrdersCount,
                trend: weeklyOrdersCount - lastWeeklyOrdersCount
            },
            revenue: {
                gross: grossRevenue,
                net: adminFeeTotal,
                trend: grossRevenue - lastGrossRevenue
            },
            recentActivity: recentActivity.map(order => ({
                id: order.id,
                studentName: order.student.name,
                total: order.totalAmount,
                status: order.status,
                paymentMethod: order.paymentMethod,
                date: order.createdAt,
                itemsCount: order.items.length
            })),
            topMenu: await getTopMenuTomorrow()
        })

    } catch (error) {
        console.error("[ADMIN_STATS]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

async function getTopMenuTomorrow() {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)

    // Find all order items for tomorrow
    const items = await db.orderItem.findMany({
        where: {
            date: { gte: tomorrow, lte: tomorrowEnd }
        }
    })

    if (items.length === 0) return null

    // Aggregate counts
    const counts: Record<string, number> = {}
    items.forEach(item => {
        counts[item.menuId] = (counts[item.menuId] || 0) + item.quantity
    })

    // Find max
    let maxId = ""
    let maxCount = 0
    Object.entries(counts).forEach(([id, count]) => {
        if (count > maxCount) {
            maxCount = count
            maxId = id
        }
    })

    if (!maxId) return null

    const menu = await db.menuItem.findUnique({
        where: { id: maxId }
    })

    return menu ? { ...menu, count: maxCount } : null
}
