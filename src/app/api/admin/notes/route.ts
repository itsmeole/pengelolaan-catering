import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function getClient(cookieStore: any) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
}

export async function GET() {
    try {
        const supabase = getClient(await cookies())
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data, error } = await supabase
            .from('notes')
            .select('id, content, color, createdAt, updatedAt')
            .eq('userId', user.id)
            .order('updatedAt', { ascending: false })

        if (error) throw error
        return NextResponse.json(data || [])
    } catch (e) {
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const supabase = getClient(await cookies())
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { content, color } = await req.json()
        if (!content?.trim()) return NextResponse.json({ error: 'Konten catatan tidak boleh kosong' }, { status: 400 })

        const { data, error } = await supabase
            .from('notes')
            .insert({ userId: user.id, content: content.trim(), color: color || 'yellow' })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (e) {
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}
