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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { error } = await supabase
            .from('MenuItem')
            .delete()
            .eq('id', id)
            .eq('vendorId', user.id) // Ensure they only delete their own menu

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await req.json()
        const { name, description, price, imageUrl, availableDays } = body

        const cookieStore = await cookies()
        const supabase = getClient(cookieStore)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const updateData: any = {
            name,
            description: description || "",
            price: parseFloat(price),
            availableDays: availableDays || [],
            updatedAt: new Date().toISOString()
        }
        
        // Only update image if provided
        if (imageUrl) {
            updateData.imageUrl = imageUrl
        }

        const { data, error } = await supabase
            .from('MenuItem')
            .update(updateData)
            .eq('id', id)
            .eq('vendorId', user.id) // Ensure they only edit their own menu
            .select()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
