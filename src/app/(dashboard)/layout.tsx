import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { UserNav } from "@/components/dashboard/user-nav"
import { Separator } from "@/components/ui/separator"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const role = session.user.role // "STUDENT" | "VENDOR" | "ADMIN"

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
                <div className="flex h-16 items-center border-b px-6 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">K</div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-800">KantinSehat</span>
                            <span className="text-[10px] text-slate-500">Admin Panel</span>
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
                    <div className="ml-auto flex items-center gap-4">
                        <UserNav user={session.user} />
                    </div>
                </header>
                <main className="flex-1 p-4 lg:p-6 bg-muted/20">
                    {children}
                </main>
            </div>
        </div>
    )
}
