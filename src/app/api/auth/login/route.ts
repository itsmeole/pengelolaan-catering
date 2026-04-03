import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { email, password } = body



        const supabase = await createClient()

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }

        // Determine redirect url based on role
        const role = data.user.user_metadata?.role || "STUDENT"
        let redirectUrl = "/dashboard/student"
        if (role === "ADMIN") redirectUrl = "/dashboard/admin"
        if (role === "VENDOR") redirectUrl = "/dashboard/vendor"

        return NextResponse.json({ success: true, redirectUrl })
    } catch (e: any) {
        return NextResponse.json({ error: "System error" }, { status: 500 })
    }
}
