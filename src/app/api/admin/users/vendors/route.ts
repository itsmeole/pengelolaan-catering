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

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const pageParam = searchParams.get('page')
        const limitParam = searchParams.get('limit')
        const search = searchParams.get('search')?.trim() || ''

        const isPaginated = pageParam !== null
        const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
        const limit = Math.max(1, Math.min(200, parseInt(limitParam || '10', 10) || 10))

        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        let query = supabase
            .from('profiles')
            .select('*', isPaginated ? { count: 'exact' } : undefined)
            .eq('role', 'VENDOR')

        if (search) {
            const safeSearch = search.replace(/[%_]/g, '\\$&')
            query = query.or(`vendorName.ilike.%${safeSearch}%,name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`)
        }

        query = query.order('vendorName', { ascending: true })

        if (isPaginated) {
            const from = (page - 1) * limit
            const to = from + limit - 1
            query = query.range(from, to)
        }

        const { data, error, count } = await query

        if (error) throw error

        if (isPaginated) {
            const total = count ?? 0
            return NextResponse.json({
                data: data || [],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            })
        }

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
        const { id, name, email, vendorName, password, isActive } = body

        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)
        const admin = createAdminClient()

        // Jika hanya toggle isActive (tanpa ubah info lain)
        if (isActive !== undefined && !name && !email && !vendorName) {
            const { error } = await supabase
                .from('profiles')
                .update({ isActive })
                .eq('id', id)
            if (error) throw error
            return NextResponse.json({ success: true })
        }

        // 1. Sync with Supabase Auth (including Display Name in metadata)
        const updateData: any = { 
            email,
            user_metadata: { name }
        }
        if (password) updateData.password = password

        const { error: authError } = await admin.auth.admin.updateUserById(id, updateData)
        if (authError) throw authError

        // 2. Update Profile Table
        const profileUpdate: any = { name, email, vendorName }
        if (isActive !== undefined) profileUpdate.isActive = isActive

        const { error } = await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', id)

        if (error) throw error
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
        if (authError) console.error("Auth Delete Error (continuing):", authError)

        // 2. Delete from Profiles
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "System Error" }, { status: 500 })
    }
}