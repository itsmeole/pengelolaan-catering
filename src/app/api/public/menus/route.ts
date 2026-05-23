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
                vendor:profiles!vendorId(name, "vendorName", "isActive")
            `)
            .order('name', { ascending: true })

        if (error) throw error

        // Hanya tampilkan menu dari vendor yang aktif (isActive = true atau null/belum di-set)
        const filtered = (data || []).filter(m => m.vendor?.isActive !== false)
        return NextResponse.json(filtered)
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
