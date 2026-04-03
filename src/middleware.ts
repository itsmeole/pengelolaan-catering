import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    // 1. Refresh session
    let response = await updateSession(request)

    // 2. Auth check using temporary server client (just for getting user metadata)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
                },
            },
        }
    )

    let user = null
    let userRole = "STUDENT"

    // STANDARD SUPABASE AUTH
    const { data } = await supabase.auth.getUser()
    user = data.user
    userRole = user?.user_metadata?.role || "STUDENT"

    const path = request.nextUrl.pathname

    if (path.startsWith("/dashboard")) {
        // If not logged in, redirect to login
        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url))
        }

        // Role-based protection
        const userRole = user.user_metadata?.role || "STUDENT"

        if (path.startsWith("/dashboard/student") && userRole !== "STUDENT") {
            return NextResponse.redirect(new URL("/unauthorized", request.url))
        }
        if (path.startsWith("/dashboard/vendor") && userRole !== "VENDOR") {
            return NextResponse.redirect(new URL("/unauthorized", request.url))
        }
        if (path.startsWith("/dashboard/admin") && userRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/unauthorized", request.url))
        }
    }

    // Redirect logged in users away from auth pages
    if ((path === "/login" || path === "/register") && user) {
        let defaultPath = "/dashboard/student"
        if (user.user_metadata?.role === "VENDOR") defaultPath = "/dashboard/vendor"
        if (user.user_metadata?.role === "ADMIN") defaultPath = "/dashboard/admin"
        return NextResponse.redirect(new URL(defaultPath, request.url))
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
