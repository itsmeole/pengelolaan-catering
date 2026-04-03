import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() {}
                }
            }
        )

        // Verifikasi Admin (Opsional tapi direkomendasikan)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.user_metadata?.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Ambil semua menu beserta informasi vendor pembuatnya
        const { data, error } = await supabase
            .from('MenuItem')
            .select(`
                *,
                vendor:profiles!vendorId(name, "vendorName")
            `)
            .order('createdAt', { ascending: false })

        if (error) {
            console.error("Supabase Error:", error)
            throw error
        }

        return NextResponse.json(data || [])
    } catch (e) {
        console.error("ADMIN MENUS ERROR:", e)
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}