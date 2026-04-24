import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/serverSession'

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

export async function GET() {
    try {
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)
        
        // getSession = baca JWT lokal, tanpa HTTP call ke Supabase Auth
        const user = await getSessionUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Get menus for this vendor
        const { data, error } = await supabase
            .from('MenuItem')
            .select('*')
            .eq('vendorId', user.id)
            .order('createdAt', { ascending: false })

        if (error) throw error
        return NextResponse.json(data || [])
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { name, description, price, imageUrl, availableDays, expiredDate } = body

        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data, error } = await supabase
            .from('MenuItem')
            .insert({
                vendorId: user.id,
                name,
                description: description || "",
                price: parseFloat(price),
                imageUrl: imageUrl || null,
                availableDays: availableDays || [],
                expiredDate: expiredDate,
            })
            .select()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}