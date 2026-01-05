import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 })

    try {
        // @ts-ignore
        const setting = await db.systemSetting.findUnique({
            where: { key: "WORKING_DAYS" }
        })

        // Default config if not exists
        const config = setting ? JSON.parse(setting.value) : {
            monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false,
            holidays: [] // Array of "YYYY-MM-DD" strings
        }

        return NextResponse.json(config)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()

        // @ts-ignore
        await db.systemSetting.upsert({
            where: { key: "WORKING_DAYS" },
            update: { value: JSON.stringify(body) },
            create: { key: "WORKING_DAYS", value: JSON.stringify(body) }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
