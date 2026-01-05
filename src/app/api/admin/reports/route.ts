import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { startOfDay, endOfDay, format } from "date-fns"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const startStr = searchParams.get("start")
        const endStr = searchParams.get("end")

        if (!startStr || !endStr) return new NextResponse("Missing dates", { status: 400 })

        const startDate = startOfDay(new Date(startStr))
        const endDate = endOfDay(new Date(endStr))

        // Fetch all completed/paid orders in range
        const orders = await db.order.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: { in: ["PAID", "COMPLETED"] }
            },
            include: {
                student: { select: { name: true } },
                items: {
                    include: {
                        menu: {
                            include: { vendor: { select: { vendorName: true } } }
                        }
                    }
                }
            }
        })

        // Aggregate Data
        let totalGross = 0
        let totalNet = 0
        const dailyMap: Record<string, { date: string, gross: number, net: number, orders: number }> = {}

        orders.forEach(order => {
            totalGross += order.totalAmount

            // Calculate Admin Fee (Net) - 1000 per item
            let orderFee = 0
            order.items.forEach(item => orderFee += (1000 * item.quantity))
            totalNet += orderFee

            // Group by Date for Chart
            const dateKey = format(order.createdAt, "yyyy-MM-dd")
            if (!dailyMap[dateKey]) {
                dailyMap[dateKey] = { date: dateKey, gross: 0, net: 0, orders: 0 }
            }
            dailyMap[dateKey].gross += order.totalAmount
            dailyMap[dateKey].net += orderFee
            dailyMap[dateKey].orders += 1
        })

        // Sort chart data by date
        const chartData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))

        // Transaction Details
        const transactionDetails = orders.flatMap(order => {
            return order.items.map(item => ({
                id: order.id,
                date: format(order.createdAt, "yyyy-MM-dd HH:mm"),
                studentName: order.student?.name || "Unknown",
                vendorName: item.menu?.vendor?.vendorName || "Unknown Vendor",
                itemName: item.menu?.name || "Unknown Item",
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity,
                adminFee: 1000 * item.quantity
            }))
        })

        return NextResponse.json({
            summary: {
                totalOrders: orders.length,
                grossRevenue: totalGross,
                netRevenue: totalNet
            },
            chart: chartData,
            details: transactionDetails
        })

    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
