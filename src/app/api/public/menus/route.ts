import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
        )

        const { data, error } = await supabase
            .from('MenuItem')
            .select(`
                *,
                vendor:profiles!vendorId(name, "vendorName")
            `)
            .order('name', { ascending: true })

        if (error) throw error
        return NextResponse.json(data || [])
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
