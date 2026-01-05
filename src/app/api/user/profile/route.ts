import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, email: true, vendorName: true }
        })
        return NextResponse.json(user)
    } catch (e) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { type } = body

        if (type === "INFO") {
            await db.user.update({
                where: { id: session.user.id },
                data: {
                    name: body.name,
                    email: body.email,
                    vendorName: body.vendorName // Prisma ignores if undefined/null for type mismatch if not in schema? No, user model has vendorName (nullable).
                }
            })
        } else if (type === "PASSWORD") {
            if (!body.password || body.password.length < 6) {
                return new NextResponse("Password too short", { status: 400 })
            }
            const hash = await bcrypt.hash(body.password, 10)
            await db.user.update({
                where: { id: session.user.id },
                data: { password: hash }
            })
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
