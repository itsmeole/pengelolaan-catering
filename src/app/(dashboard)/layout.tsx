import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { UserNav } from "@/components/dashboard/user-nav"
import { cookies } from "next/headers"
import { createServerClient } from '@supabase/ssr'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()
    let role: "STUDENT" | "ADMIN" | "VENDOR" = "STUDENT"
    let userMock = { name: "Guest User", email: "guest@guest.com", role: "STUDENT" }

    // Read from Supabase
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { } // Readonly in layout
                }
            }
        )
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            redirect("/login")
        }
        
        let rawRole = user.user_metadata?.role || "STUDENT"
        if (!["STUDENT", "ADMIN", "VENDOR"].includes(rawRole)) rawRole = "STUDENT"
        role = rawRole as "STUDENT" | "ADMIN" | "VENDOR"
        userMock = {
            name: user.user_metadata?.name || "User",
            email: user.email || "",
            role: role
        }

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
                <div className="flex h-16 items-center border-b px-6 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">G</div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-800">Go Catering</span>
                            <span className="text-[10px] text-slate-500">Panel Aplikasi</span>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto py-4 pr-2 bg-white">
                    <SidebarNav role={role} />
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col">
                <header className="flex h-14 items-center justify-between border-b px-4 lg:px-6">
                    <div className="md:hidden">
                        <MobileNav role={role} />
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <p className="text-xs md:text-sm text-slate-600 text-right truncate max-w-[150px] md:max-w-[300px]">
                            Halo <span className="font-bold text-slate-900">{userMock.name}</span>!<span className="hidden md:inline"> Selamat datang</span>
                        </p>
                        <UserNav user={userMock} />
                    </div>
                </header>
                <main className="flex-1 p-4 lg:p-6 bg-muted/20">
                    {children}
                </main>
            </div>
        </div>
    )
}
