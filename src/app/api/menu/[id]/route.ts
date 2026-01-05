import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "VENDOR") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const menu = await db.menuItem.findUnique({
            where: { id: params.id }
        })

        if (!menu) return new NextResponse("Not Found", { status: 404 })
        if (menu.vendorId !== session.user.id) return new NextResponse("Forbidden", { status: 403 })

        await db.menuItem.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[MENU_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
