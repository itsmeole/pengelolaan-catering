"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DollarSign, ShoppingBag, TrendingUp, Users, CreditCard, Activity } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { SystemStatus } from "@/components/dashboard/system-status"

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
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Pesanan (Besok)</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <ShoppingBag className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">{stats.weeklyOrders.count}</div>
                        <p className="text-xs text-green-600 font-medium mt-1">
                            {stats.weeklyOrders.trend >= 0 ? "+" : ""}{stats.weeklyOrders.trend}% dari kemarin
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
                            Perlu verifikasi: 3
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
            </div>

            {/* Split Content: Activity & Menu Preview */}
            <div className="grid gap-6 md:grid-cols-3">

                {/* Activity Feed (2/3 width) */}
                <Card className="md:col-span-2 shadow-sm border-none">
                    <CardHeader className="flex flex-row items-center justify-between bg-transparent px-6 pt-6 pb-2">
                        <CardTitle className="text-lg font-bold text-slate-800">Aktivitas Terbaru</CardTitle>
                        <Button variant="ghost" className="text-blue-600 text-sm h-8">Lihat Semua</Button>
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
                                            activity.paymentMethod === 'CASH_PAY_LATER'
                                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                                                : "bg-green-100 text-green-700 hover:bg-green-100"
                                        )}
                                    >
                                        {activity.paymentMethod === 'CASH_PAY_LATER' ? 'Pending' : 'Sukses'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Menu Preview (1/3 width) */}
                <Card className="shadow-sm border-none bg-white">
                    <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
                        <CardTitle className="text-sm font-bold text-slate-800">Menu Terlaris (Besok)</CardTitle>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                            {format(new Date(new Date().setDate(new Date().getDate() + 1)), "dd MMM")}
                        </span>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                        {stats.topMenu ? (
                            <div className="mt-2 space-y-4">
                                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
                                    <img
                                        src={stats.topMenu.imageUrl || "/placeholder-food.jpg"}
                                        className="object-cover w-full h-full"
                                        alt={stats.topMenu.name}
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{stats.topMenu.name}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                                        {stats.topMenu.description}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                                    <span className="text-sm text-blue-700 font-medium">Total Order Besok</span>
                                    <span className="text-lg font-bold text-blue-700">{stats.topMenu.count} Porsi</span>
                                </div>
                                <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white">
                                    Lihat Detail Order
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-lg mt-4">
                                <ShoppingBag className="h-10 w-10 text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500 font-medium">Belum ada pesanan untuk besok.</p>
                                <p className="text-xs text-slate-400">Data akan muncul setelah siswa memesan.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* System Status - Bottom Left Sidebar styled box effectively */}
            <div className="fixed bottom-6 left-6 w-52 hidden md:block">
                <SystemStatus />
            </div>
        </div>
    )
}
