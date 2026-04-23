import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/serverSession'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        // getSession = baca JWT lokal, tanpa HTTP call ke Supabase Auth
        const user = await getSessionUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
        )

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, name')
            .eq('id', user.id)
            .single()

        return NextResponse.json({
            id: user.id,
            email: user.email,
            role: profile?.role || 'STUDENT',
            name: profile?.name || user.user_metadata?.name
        })
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
