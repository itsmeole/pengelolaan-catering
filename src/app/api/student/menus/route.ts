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
                setAll() {}
            }
        }
    )
}

export async function GET() {
    try {
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const { data, error } = await supabase
            .from('MenuItem')
            .select(`
                *,
                vendor:profiles!vendorId(id, name, "vendorName")
            `)
            .order('createdAt', { ascending: false })

        if (error) {
            console.error('Student menus error:', error)
            throw error
        }

        return NextResponse.json(data || [])
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}
