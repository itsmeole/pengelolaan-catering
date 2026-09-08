"use client"

import { useEffect, useState } from "react"
import { format, addDays } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Medal, Trophy, Sparkles, Utensils, CheckCircle2, ArrowRight } from "lucide-react"
import { SystemStatus } from "@/components/dashboard/system-status"

export default function StudentDashboard() {
    const [stats, setStats] = useState({
        totalOrders: 0,
        thisWeekPortions: 0,
        thisWeekDaysCount: 0
    })
    const [recommendedMenu, setRecommendedMenu] = useState<any>(null)
    const [tomorrowMenu, setTomorrowMenu] = useState<any[]>([])
    const [topVendors, setTopVendors] = useState<{ name: string; count: number; vendorName: string }[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    async function fetchDashboardData() {
        try {
            const res = await fetch("/api/student/dashboard")
            if (res.ok) {
                const data = await res.json()
                if (data.stats) setStats(data.stats)
                if (data.recommendedMenu) setRecommendedMenu(data.recommendedMenu)
                if (Array.isArray(data.tomorrowMenu)) setTomorrowMenu(data.tomorrowMenu)
                if (Array.isArray(data.topVendors)) setTopVendors(data.topVendors)
            }
        } catch (e) {
            console.error("Gagal memuat data dashboard siswa:", e)
        } finally {
            setLoading(false)
        }
    }

    const tomorrow = addDays(new Date(), 1)

    const medalColors = [
        { bg: "bg-yellow-50", text: "text-yellow-600", icon: "text-yellow-500" },
        { bg: "bg-slate-50", text: "text-slate-600", icon: "text-slate-400" },
        { bg: "bg-orange-50", text: "text-orange-600", icon: "text-orange-400" },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Dashboard Siswa</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Ringkasan aktivitas dan jadwal katering harian Anda.</p>
            </div>

            {/* Stats Cards Top Row (Full Width Stacking on Mobile, 2 Cols on sm, 4 Cols on lg) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                
                {/* Card 1: Rekomendasi Menu */}
                <Card className="border-l-4 border-l-amber-500 shadow-sm flex flex-col justify-between">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Rekomendasi Menu</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Sparkles className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        {loading ? (
                            <div className="h-12 rounded-lg bg-slate-100 animate-pulse" />
                        ) : recommendedMenu ? (
                            <div>
                                <div className="flex items-center gap-3">
                                    <img 
                                        src={recommendedMenu.imageUrl || "/placeholder-food.jpg"} 
                                        alt={recommendedMenu.name} 
                                        className="h-10 w-10 rounded-lg object-cover border shrink-0 bg-slate-50" 
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-sm text-slate-800 truncate" title={recommendedMenu.name}>
                                            {recommendedMenu.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {recommendedMenu.vendorName} · <span className="font-bold text-amber-600">Rp {recommendedMenu.priceWithFee?.toLocaleString("id-ID")}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2 pt-2 border-t flex items-center justify-between">
                                    <span className="text-[11px] text-slate-400">Vendor spotlight</span>
                                    <Link href="/dashboard/student/order" className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5">
                                        Pesan <ArrowRight className="h-3 w-3" />
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="text-2xl font-bold text-slate-800">Menu Pilihan</div>
                                <p className="text-xs text-muted-foreground mt-1">Cek beragam menu lezat hari ini</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Card 2: Porsi Minggu Ini */}
                <Card className="border-l-4 border-l-blue-500 shadow-sm flex flex-col justify-between">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Porsi Minggu Ini</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Utensils className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-12 rounded-lg bg-slate-100 animate-pulse" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-slate-800">
                                    {stats.thisWeekPortions} <span className="text-sm font-normal text-slate-500">Porsi</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats.thisWeekDaysCount > 0 ? `${stats.thisWeekDaysCount} hari katering aktif` : "Belum ada pesanan minggu ini"}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Card 3: Total Pesanan */}
                <Card className="border-l-4 border-l-green-500 shadow-sm flex flex-col justify-between">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Pesanan</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-12 rounded-lg bg-slate-100 animate-pulse" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-slate-800">{stats.totalOrders}</div>
                                <p className="text-xs text-muted-foreground mt-1">Total pesanan seluruh waktu</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Card 4: Status Sistem */}
                <SystemStatus />
            </div>

            {/* Bottom Section */}
            <div className="grid gap-6 md:grid-cols-2">

                {/* Menu Besok */}
                <Card className="shadow-sm border-none bg-white">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            Menu Besok ({format(tomorrow, "EEEE, dd MMMM", { locale: idLocale })})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {loading ? (
                            <div className="h-20 rounded-lg bg-slate-100 animate-pulse" />
                        ) : tomorrowMenu.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                                <Calendar className="h-10 w-10 mb-2 opacity-20" />
                                <p className="text-sm font-medium text-slate-700">Tidak ada pesanan untuk besok.</p>
                                <p className="text-xs text-slate-400 mt-0.5">Silakan lakukan pemesanan menu jika jadwal masih buka.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tomorrowMenu.map((item: any, idx) => (
                                    <div key={idx} className="flex items-center space-x-3.5 border p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition">
                                        <img 
                                            src={item.menu?.imageUrl || "/placeholder-food.jpg"} 
                                            className="h-14 w-14 rounded-lg object-cover border bg-white shrink-0" 
                                            alt={item.menuName || item.menu?.name}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-sm text-slate-800 truncate">{item.menuName || item.menu?.name}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {item.vendorName} · <span className="font-semibold text-slate-700">Qty: {item.quantity}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top 3 Vendor Favorit */}
                <Card className="shadow-sm border-none bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            Vendor Favorit Saya
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
                                ))}
                            </div>
                        ) : topVendors.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                                <Medal className="h-10 w-10 mb-2 opacity-20" />
                                <p className="text-sm font-medium text-slate-700">Belum ada data pesanan.</p>
                                <p className="text-xs text-slate-400 mt-0.5">Yuk mulai pesan makanan favoritmu!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topVendors.map((vendor, idx) => (
                                    <div key={idx} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${medalColors[idx].bg}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-2xl font-extrabold ${medalColors[idx].icon}`}>
                                                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                                            </span>
                                            <div>
                                                <p className={`font-semibold text-sm ${medalColors[idx].text}`}>{vendor.vendorName}</p>
                                                <p className="text-xs text-muted-foreground">{vendor.count} porsi dipesan</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${medalColors[idx].bg} ${medalColors[idx].text} border shadow-xs`}>
                                            #{idx + 1}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
