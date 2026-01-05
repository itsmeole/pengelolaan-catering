import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 })

    try {
        const vendors = await db.user.findMany({
            where: { role: "VENDOR" },
            select: { id: true, name: true, email: true, vendorName: true, createdAt: true },
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(vendors)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { name, email, vendorName, password } = await req.json()

        const hashedPassword = await bcrypt.hash(password, 10)

        // Check duplicates
        const existing = await db.user.findUnique({ where: { email } })
        if (existing) return new NextResponse("Email already exists", { status: 400 })

        await db.user.create({
            data: {
                name,
                email,
                vendorName,
                password: hashedPassword,
                role: "VENDOR"
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { id, password, ...data } = await req.json()

        const updateData: any = { ...data }
        if (password) {
            updateData.password = await bcrypt.hash(password, 10)
        }

        await db.user.update({ where: { id }, data: updateData })

        return NextResponse.json({ success: true })
    } catch (e) {
        return new NextResponse("Error", { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        if (!id) return new NextResponse("Missing ID", { status: 400 })

        await db.user.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (e) {
        return new NextResponse("Error", { status: 500 })
    }
}
