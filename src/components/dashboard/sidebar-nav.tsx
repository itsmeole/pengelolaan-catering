"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    Utensils,
    FileText,
    Users,
    BarChart,
    ChefHat,
    History,
    CalendarClock,
    DollarSign,
    UserCircle,
    LogOut,
    Settings
} from "lucide-react"

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
    role: "ADMIN" | "VENDOR" | "STUDENT"
}

export function SidebarNav({ className, role, ...props }: SidebarNavProps) {
    const pathname = usePathname()

    const items = {
        ADMIN: [
            { href: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard },
            { href: "/dashboard/admin/menus", label: "Menu Mingguan", icon: Utensils },
            { href: "/dashboard/admin/orders", label: "Data Pemesanan", icon: FileText },
            { href: "/dashboard/admin/users", label: "Kelola User", icon: Users },
            { href: "/dashboard/admin/working-days", label: "Pengaturan Sistem", icon: Settings },
            { href: "/dashboard/admin/reports", label: "Laporan", icon: BarChart },
        ],
        VENDOR: [
            { href: "/dashboard/vendor", label: "Dashboard", icon: LayoutDashboard },
            { href: "/dashboard/vendor/menu", label: "Menu Saya", icon: ChefHat },
            { href: "/dashboard/vendor/all-menus", label: "Menu Mingguan (Publik)", icon: Utensils },
            { href: "/dashboard/vendor/orders", label: "Data Pemesanan", icon: FileText },
            { href: "/dashboard/vendor/history", label: "Riwayat Transaksi", icon: History },
            { href: "/dashboard/vendor/revenue", label: "Pendapatan", icon: DollarSign },
        ],
        STUDENT: [
            { href: "/dashboard/student", label: "Dashboard", icon: LayoutDashboard },
            { href: "/dashboard/student/order", label: "Pesan Makan", icon: Utensils },
            { href: "/dashboard/student/history", label: "Riwayat", icon: History },
        ]
    }

    const navItems = items[role] || []

    return (
        <nav className={cn("flex flex-col space-y-1", className)} {...props}>
            {navItems.map((item) => {
                const Icon = item.icon
                const isActive = item.href === "/dashboard/admin" || item.href === "/dashboard/vendor" || item.href === "/dashboard/student"
                    ? pathname === item.href
                    : pathname.startsWith(item.href)

                return (
                    <Link key={item.href} href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-r-full px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-100",
                            isActive
                                ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                                : "text-slate-600 border-l-4 border-transparent"
                        )}
                    >
                        <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-slate-400")} />
                        {item.label}
                    </Link>
                )
            })}

            <div className="pt-4 mt-auto">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' })
                        window.location.href = '/login'
                    }}
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
            </div>
        </nav>
    )
}
