import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function GET(req: Request) {
    try {
        const password = "password123"
        const hashedPassword = await bcrypt.hash(password, 10)

        await db.user.upsert({
            where: { email: "admin@school.id" },
            update: { password: hashedPassword },
            create: {
                email: "admin@school.id",
                name: "Admin Sekolah",
                password: hashedPassword,
                role: "ADMIN"
            }
        })
        return NextResponse.json({ success: true, message: "Admin password reset to password123" })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
