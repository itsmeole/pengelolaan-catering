import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabaseAdmin'

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
            .eq('role', 'STUDENT')
            .order('name', { ascending: true })

        if (error) throw error
        return NextResponse.json(data || [])
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const supabaseAnon = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return [] }, setAll() {} } }
        )

        if (Array.isArray(body)) {
            const admin = createAdminClient()
            let successCount = 0
            let updateCount = 0
            const errors = []
            
            for (const student of body) {
                const { name, email: rawEmail, nis: rawNis, class: targetClass } = student
                const email = String(rawEmail).trim().toLowerCase()
                const nis = String(rawNis).trim()
                const password = nis
                
                // 1. Cek apakah user sudah ada di tabel profiles (berdasarkan email)
                const { data: existingProfile, error: fetchError } = await admin
                    .from('profiles')
                    .select('id, email, nis')
                    .eq('email', email)
                    .maybeSingle()
                
                if (existingProfile) {
                    // 2. Jika sudah ada, lakukan UPDATE (NIS & Kelas)
                    const { error: updateError } = await admin
                        .from('profiles')
                        .update({ 
                            nis: nis, 
                            class: String(targetClass || ""),
                            name: name // Perbarui nama juga jika berubah di Excel
                        })
                        .eq('id', existingProfile.id)
                    
                    if (updateError) {
                        errors.push({ email, name, error: "Gagal update profil: " + updateError.message })
                    } else {
                        updateCount++
                    }
                    continue
                }

                // 3. Jika belum ada, buat USER BARU via Admin Auth API
                const { data: authData, error: authError } = await admin.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { name, role: 'STUDENT' }
                })
                
                if (authError || !authData.user) {
                    errors.push({ email, name, error: authError?.message || "Gagal membuat user baru" })
                    continue
                }
                
                // 4. Update NIS & Class untuk user baru (karena trigger handle_new_user hanya isi dasar)
                const { error: profileError } = await admin
                    .from('profiles')
                    .update({ 
                        nis: nis, 
                        class: String(targetClass || "") 
                    })
                    .eq('id', authData.user.id)
                
                if (profileError) {
                    errors.push({ email, name, error: "Akun terbuat tapi profil gagal diisi: " + profileError.message })
                } else {
                    successCount++
                }
            }
            return NextResponse.json({ 
                success: true, 
                count: successCount, 
                updated: updateCount, 
                errors 
            })
        }

        const { name, email, nis, class: targetClass } = body
        const password = String(nis)
        const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
            email,
            password,
            options: { data: { name, role: 'STUDENT' } }
        })
        if (authError || !authData.user) {
            return NextResponse.json({ error: authError?.message || "Failed to create student" }, { status: 400 })
        }
        await supabase.from('profiles').update({ nis: String(nis), class: targetClass }).eq('id', authData.user.id)
        return NextResponse.json({ success: true, user: authData.user })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "System Error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { id, type, name, email, nis, class: targetClass } = body
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)
        const admin = createAdminClient()

        if (type === "UPDATE_INFO") {
            // 1. Sync Email & Name to Auth metadata
            const { error: authError } = await admin.auth.admin.updateUserById(id, { 
                email,
                user_metadata: { name }
            })
            if (authError) throw authError

            // 2. Update Profile Table
            const { error } = await supabase
                .from('profiles')
                .update({ name, email, nis, class: targetClass })
                .eq('id', id)
            if (error) throw error
        } else if (type === "RESET_PASSWORD") {
            // NIS as default reset password
            const password = String(nis)
            const { error: authError } = await admin.auth.admin.updateUserById(id, { password })
            if (authError) throw authError
        }

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "System Error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        if (!id) return NextResponse.json({ error: "No ID" }, { status: 400 })

        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)
        const admin = createAdminClient()

        // 1. Delete from Supabase Auth
        const { error: authError } = await admin.auth.admin.deleteUser(id)
        if (authError) console.error("Auth Delete Error:", authError)

        // 2. Delete from Profiles
        const { error } = await supabase.from('profiles').delete().eq('id', id)
        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "System Error" }, { status: 500 })
    }
}