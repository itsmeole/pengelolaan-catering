import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    try {
        const supabase = createAdminClient()
        const email = "admin@school.id"
        const password = "password123"

        // 1. Check if user already exists in Auth
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
        if (listError) throw listError

        const existingUser = users.find(u => u.email === email)

        if (existingUser) {
            // 2. Update existing user's password
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                existingUser.id,
                { 
                    password: password,
                    user_metadata: {
                        name: "Admin Sekolah",
                        role: "ADMIN"
                    }
                }
            )
            if (updateError) throw updateError
            return NextResponse.json({ success: true, message: "Admin password updated to password123" })
        } else {
            // 3. Create new admin user
            const { error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    name: "Admin Sekolah",
                    role: "ADMIN"
                }
            })
            if (createError) throw createError
            return NextResponse.json({ success: true, message: "Admin user created with password123" })
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
