import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const q = searchParams.get("q") || ""

        if (q.length < 3) {
            return NextResponse.json([])
        }

        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
        )

        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, class, nis')
            .eq('role', 'STUDENT')
            .ilike('name', `%${q}%`)
            .limit(5)

        if (error) throw error
        return NextResponse.json(data || [])
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
