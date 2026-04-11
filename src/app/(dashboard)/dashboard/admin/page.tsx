"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DollarSign, ShoppingBag, TrendingUp, Users, CreditCard, Activity } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { SystemStatus } from "@/components/dashboard/system-status"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    async function fetchStats() {
        try {
            const res = await fetch("/api/admin/stats")
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8">Loading dashboard...</div>

    if (!stats) return <div className="p-8 text-red-500">Gagal memuat data statistik.</div>

    const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Ringkasan Sistem</h2>
                {/* Placeholder Notification Icon */}
            </div>

            {/* Stats Cards - Colorful Borders */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Pesanan (7 Hari ke Depan)</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <ShoppingBag className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">{stats.weeklyOrders.count}</div>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                            Akumulasi porsi mingguan
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Uang Masuk (Kotor)</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.revenue.gross)}</div>
                        <p className="text-xs text-slate-400 mt-1">
                            Perlu verifikasi: {stats.unverifiedCount || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Pendapatan Bersih</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.revenue.net)}</div>
                        <p className="text-xs text-slate-400 mt-1">
                            Akumulasi seluruh akun
                        </p>
                    </CardContent>
                </Card>
                {/* System Status Integration */}
                <SystemStatus />
            </div>

            {/* Split Content: Activity & Menu Preview */}
            <div className="grid gap-6 md:grid-cols-3">

                {/* Activity Feed (2/3 width) */}
                <Card className="md:col-span-2 shadow-sm border-none">
                    <CardHeader className="flex flex-row items-center justify-between bg-transparent px-6 pt-6 pb-2">
                        <CardTitle className="text-lg font-bold text-slate-800">Aktivitas Terbaru</CardTitle>
                        <Link href="/dashboard/admin/orders" className="text-blue-600 text-sm font-medium hover:underline">Lihat Semua</Link>
                    </CardHeader>
                    <CardContent className="px-6">
                        <div className="space-y-4">
                            {stats.recentActivity.map((activity: any, idx: number) => (
                                <div key={activity.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center",
                                            idx % 2 === 0 ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                                        )}>
                                            {idx % 2 === 0 ? <CreditCard className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{activity.studentName}</p>
                                            <p className="text-xs text-slate-500">
                                                {activity.itemsCount} menu • {formatCurrency(activity.total)}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className={cn("font-normal",
                                            activity.status === 'PAID' || activity.status === 'COMPLETED'
                                                ? "bg-green-100 text-green-700 hover:bg-green-100"
                                                : activity.status === 'CANCELLED'
                                                ? "bg-red-100 text-red-700 hover:bg-red-100"
                                                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                                        )}
                                    >
                                        {activity.status === 'PAID' || activity.status === 'COMPLETED' ? 'Lunas' 
                                        : activity.status === 'CANCELLED' ? 'Dibatalkan' 
                                        : 'Menunggu'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-none bg-white">
                    <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
                        <CardTitle className="text-sm font-bold text-slate-800">Top 5 Menu Terlaris (7 Hari ke Depan)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent className="px-2 pb-6">
                        {stats.topWeeklyMenus && stats.topWeeklyMenus.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[40px] text-xs">No</TableHead>
                                        <TableHead className="text-xs">Menu</TableHead>
                                        <TableHead className="text-xs text-right">Porsi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.topWeeklyMenus.map((menu: any, idx: number) => (
                                        <TableRow key={menu.id} className="group">
                                            <TableCell className="text-xs text-slate-500">{idx + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 line-clamp-1">{menu.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{menu.vendorName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 font-bold text-xs ring-1 ring-inset ring-blue-700/10">
                                                    {menu.count}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-lg mx-4 mt-4">
                                <ShoppingBag className="h-10 w-10 text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500 font-medium">Belum ada data mingguan.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

        </div>
    )
}
