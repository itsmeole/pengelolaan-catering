import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function getClient(cookieStore: any) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() {} // MENCEGAH OVERWRITE COOKIE ADMIN
            }
        }
    )
}

export async function GET() {
    try {
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'VENDOR')

        if (error) throw error
        return NextResponse.json(data || [])
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { name, email, vendorName, password } = body

        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        // Create a clean client for signUp to avoid "already logged in" conflicts with Admin session
        const supabaseAnon = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return [] }, setAll() {} } }
        )

        const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
            email,
            password,
            options: {
                data: { name, role: 'VENDOR' }
            }
        })

        if (authError || !authData.user) {
            return NextResponse.json({ error: authError?.message || "Failed to create user" }, { status: 400 })
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update({ vendorName })
            .eq('id', authData.user.id)

        if (profileError) console.error("Profile Error:", profileError)

        return NextResponse.json({ success: true, user: authData.user })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "System Error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { id, name, email, vendorName } = body

        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        // Hanya update detail profil, ganti password butuh akses ADMIN khusus 
        // via SSR Admin SDK, kita skip password untuk VENDOR sementara
        const { error } = await supabase
            .from('profiles')
            .update({ name, email, vendorName })
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        if (!id) return NextResponse.json({ error: "No ID" }, { status: 400 })

        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        // Kita hapus profile. Supabase Auth Users idealnya dihapus pakai Admin SDK,
        // tapi menghapus profile juga akan mencabut akses auth jika pakai RLS/Trigger yang baik.
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}