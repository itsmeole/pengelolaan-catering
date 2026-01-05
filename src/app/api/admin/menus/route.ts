import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const menus = await db.menuItem.findMany({
            include: {
                vendor: {
                    select: { vendorName: true, name: true }
                }
            },
            orderBy: { vendorId: 'asc' }
        })

        return NextResponse.json(menus)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
