import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
    name: z.string().min(1, "Nama wajib diisi"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    nis: z.string().min(1, "NIS wajib diisi"),
    class: z.string().min(1, "Kelas wajib diisi"),
    image: z.string().optional()
})

export async function POST(req: Request) {
    try {
        const body = await req.json()
        // Manual validation could be done if zod fails here
        const result = registerSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Input tidak valid", { status: 400 })
        }

        const { email, password, name, nis, class: className, image } = result.data

        // Check if email or NIS already used
        const existingUser = await db.user.findFirst({
            where: {
                OR: [
                    { email },
                    { nis }
                ]
            }
        })

        if (existingUser) {
            return new NextResponse("Email atau NIS sudah terdaftar", { status: 409 })
        }

        // Validation against School Database (StudentValidation table)
        const validStudent = await db.studentValidation.findFirst({
            where: {
                nis,
                name,
                class: className
            }
        })

        // If constraint requires STRICT match against whitelist:
        if (!validStudent) {
            return new NextResponse("Data siswa (Nama, NIS, Kelas) tidak sesuai dengan database sekolah.", { status: 403 })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await db.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                nis,
                class: className,
                role: "STUDENT",
                image: image || null
            }
        })

        return NextResponse.json(user)

    } catch (error) {
        console.error("REGISTRATION_ERROR", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
