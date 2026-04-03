import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
    try {
        const supabase = await createClient()
        await supabase.auth.signOut()

        const response = NextResponse.json({ success: true })
        // Clear bypass cookie
        response.cookies.delete('bypass_role')
        
        return response
    } catch (e: any) {
        return NextResponse.json({ error: "System error" }, { status: 500 })
    }
}
