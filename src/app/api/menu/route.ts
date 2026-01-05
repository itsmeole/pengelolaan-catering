import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "VENDOR") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await req.json()
        const { name, description, price, imageUrl } = body

        if (!name || !price) {
            return new NextResponse("Missing fields", { status: 400 })
        }

        const menu = await db.menuItem.create({
            data: {
                name,
                description: description || "",
                price: parseFloat(price),
                imageUrl: imageUrl || "",
                vendorId: session.user.id
            }
        })

        return NextResponse.json(menu)
    } catch (error) {
        console.error("[MENU_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        // If vendor, return only their menus
        if (session.user.role === "VENDOR") {
            const menus = await db.menuItem.findMany({
                where: { vendorId: session.user.id },
                orderBy: { createdAt: 'desc' }
            })
            return NextResponse.json(menus)
        }

        // Return all for others (Student/Admin)
        const menus = await db.menuItem.findMany({
            include: { vendor: { select: { vendorName: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(menus)
    } catch (error) {
        console.error("[MENU_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
