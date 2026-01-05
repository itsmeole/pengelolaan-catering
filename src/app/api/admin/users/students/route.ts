import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 })

    try {
        const students = await db.user.findMany({
            where: { role: "STUDENT" },
            select: { id: true, name: true, email: true, nis: true, class: true, createdAt: true },
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(students)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        // Check if bulk (array) or single
        const inputs = Array.isArray(body) ? body : [body]

        // Default password hash for new students (e.g., "123456")
        const defaultPassword = await bcrypt.hash("123456", 10)

        let successCount = 0
        let errors = []

        for (const input of inputs) {
            // Validate duplicates
            const existing = await db.user.findFirst({
                where: {
                    OR: [
                        { email: input.email },
                        { nis: input.nis }
                    ]
                }
            })

            if (existing) {
                errors.push(`${input.name} skipped: Email/NIS exists`)
                continue
            }

            await db.user.create({
                data: {
                    name: input.name,
                    email: input.email,
                    nis: input.nis,
                    class: input.class,
                    password: defaultPassword,
                    role: "STUDENT"
                }
            })

            // Also add to StudentValidation to be safe? 
            // Not strictly necessary if User is created, but good consistency.
            // Skipping Validation table synchronization to keep it simple as User is already created.

            successCount++
        }

        return NextResponse.json({ success: true, count: successCount, errors })
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { id, type, ...data } = await req.json()

        if (type === "RESET_PASSWORD") {
            const newPass = await bcrypt.hash("123456", 10)
            await db.user.update({ where: { id }, data: { password: newPass } })
        } else if (type === "UPDATE_INFO") {
            try {
                await db.user.update({
                    where: { id },
                    data: {
                        name: data.name,
                        email: data.email,
                        nis: data.nis,
                        class: data.class
                    }
                })
            } catch (dbError: any) {
                // Handle unique constraint violations
                if (dbError.code === 'P2002') {
                    return new NextResponse("Email atau NIS sudah digunakan", { status: 409 })
                }
                throw dbError
            }
        } else {
            // Fallback or legacy
            await db.user.update({ where: { id }, data: data })
        }

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
