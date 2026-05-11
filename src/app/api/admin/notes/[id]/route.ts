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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const supabase = getClient(await cookies())
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { content, color } = await req.json()
        if (!content?.trim()) return NextResponse.json({ error: 'Konten tidak boleh kosong' }, { status: 400 })

        const { data, error } = await supabase
            .from('notes')
            .update({ content: content.trim(), color: color || 'yellow', updatedAt: new Date().toISOString() })
            .eq('id', id)
            .eq('userId', user.id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (e) {
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const supabase = getClient(await cookies())
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id)
            .eq('userId', user.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}
