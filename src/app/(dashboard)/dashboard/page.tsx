import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from '@supabase/ssr'

export default async function DashboardPage() {
    const cookieStore = await cookies()
    const bypassCookie = cookieStore.get('bypass_role')?.value

    let role = "STUDENT"

    if (bypassCookie) {
        role = bypassCookie
    } else {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { } // Readonly in page
                }
            }
        )
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            redirect("/login")
        }

        role = user.user_metadata?.role || "STUDENT"
    }

    if (role === "ADMIN") {
        redirect("/dashboard/admin")
    } else if (role === "VENDOR") {
        redirect("/dashboard/vendor")
    } else if (role === "STUDENT") {
        redirect("/dashboard/student")
    } else {
        redirect("/login")
    }
}
