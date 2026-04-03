import { createServerClient } from '@supabase/ssr'
import { NextResponse } from "next/server"
import { z } from "zod"
import { cookies } from "next/headers"

const registerSchema = z.object({
    name: z.string().min(1, "Nama wajib diisi"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    nis: z.string().min(1, "NIS wajib diisi"),
    class: z.string().min(1, "Kelas wajib diisi"),
    image: z.string().optional()
})

function getClient(cookieStore: any) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() {}
            }
        }
    )
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const result = registerSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Input tidak valid", { status: 400 })
        }

        const { email, password, name, nis, class: className } = result.data

        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        // 1. Validation against School Database (StudentValidation table)
        const { data: validStudent, error: validError } = await supabase
            .from('StudentValidation')
            .select('*')
            .eq('nis', nis)
            .ilike('name', name)
            .eq('class', className)
            .maybeSingle()

        if (validError || !validStudent) {
            return new NextResponse("Data siswa (Nama, NIS, Kelas) tidak sesuai dengan database sekolah.", { status: 403 })
        }

        // 2. Check if email or NIS already used in profiles
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .or(`email.eq.${email},nis.eq.${nis}`)
            .maybeSingle()

        if (existingUser) {
            return new NextResponse("Email atau NIS sudah terdaftar", { status: 409 })
        }

        // 3. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    role: 'STUDENT'
                }
            }
        })

        if (authError || !authData.user) {
            return new NextResponse(authError?.message || "Gagal membuat akun", { status: 400 })
        }

        // 4. Perbarui data lanjutan NIS dan Kelas karena Trigger Auth otomatis membuat profil awal
        await supabase
            .from('profiles')
            .update({ nis, class: className })
            .eq('id', authData.user.id)

        return NextResponse.json({ success: true, user: authData.user })

    } catch (error) {
        console.error("REGISTRATION_ERROR", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
