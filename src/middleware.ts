import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const path = req.nextUrl.pathname
        const userRole = token?.role

        // Role-based protection
        if (path.startsWith("/dashboard/student") && userRole !== "STUDENT") {
            return NextResponse.redirect(new URL("/unauthorized", req.url))
        }
        if (path.startsWith("/dashboard/vendor") && userRole !== "VENDOR") {
            return NextResponse.redirect(new URL("/unauthorized", req.url))
        }
        if (path.startsWith("/dashboard/admin") && userRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/unauthorized", req.url))
        }

        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token
        },
    }
)

export const config = {
    matcher: ["/dashboard/:path*"]
}
