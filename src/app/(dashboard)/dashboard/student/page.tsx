"use client"

import { useEffect, useState } from "react"
import { format, addDays, isSameDay } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CheckCircle, Medal, Trophy } from "lucide-react"
import { SystemStatus } from "@/components/dashboard/system-status"

export default function StudentDashboard() {
    const [orders, setOrders] = useState<any[]>([])
    const [stats, setStats] = useState({ totalOrders: 0 })
    const [topVendors, setTopVendors] = useState<{ name: string; count: number; vendorName: string }[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchOrders()
    }, [])

    async function fetchOrders() {
        try {
            const res = await fetch("/api/order")
            const data = await res.json()

            let allItems: any[] = []
            if (Array.isArray(data)) {
                data.forEach((o: any) => {
                    if (o.items) allItems.push(...o.items)
                })
            }

            setOrders(allItems)
            setStats({ totalOrders: allItems.length })

            // Hitung Top 3 Vendor dari histori pesanan
            const vendorCount: Record<string, { name: string; vendorName: string; count: number }> = {}
            allItems.forEach((item: any) => {
                const vid = item.vendorId
                if (!vid) return
                if (!vendorCount[vid]) {
                    vendorCount[vid] = {
                        name: item.vendorName || "Vendor",
                        vendorName: item.vendorName || "Vendor",
                        count: 0
                    }
                }
                vendorCount[vid].count++
            })

            const sorted = Object.values(vendorCount)
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)

            setTopVendors(sorted)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const tomorrow = addDays(new Date(), 1)
    const tomorrowMenu = orders.filter(item => isSameDay(new Date(item.date), tomorrow))

    const medalColors = [
        { bg: "bg-yellow-50", text: "text-yellow-600", icon: "text-yellow-500" },
        { bg: "bg-slate-50", text: "text-slate-600", icon: "text-slate-400" },
        { bg: "bg-orange-50", text: "text-orange-600", icon: "text-orange-400" },
    ]

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-primary">Dashboard Siswa</h2>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">Selama ini</p>
                    </CardContent>
                </Card>

                {/* Komponen Status Sistem */}
                <SystemStatus />
            </div>

            {/* Bottom Section */}
            <div className="grid gap-4 md:grid-cols-2">

                {/* Menu Besok */}
                <Card>
                    <CardHeader>
                        <CardTitle>Menu Besok ({format(tomorrow, "EEEE, dd MMMM", { locale: idLocale })})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tomorrowMenu.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                <Calendar className="h-10 w-10 mb-2 opacity-20" />
                                <p>Tidak ada pesanan untuk besok.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tomorrowMenu.map((item: any, idx) => (
                                    <div key={idx} className="flex items-center space-x-4 border p-3 rounded bg-accent/10">
                                        {item.menu?.imageUrl && <img src={item.menu.imageUrl} className="h-12 w-12 rounded object-cover" />}
                                        <div>
                                            <p className="font-bold">{item.menuName || item.menu?.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.vendorName} · Qty: {item.quantity}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top 3 Vendor Favorit */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-semibold">🏆 Vendor Favorit Saya</CardTitle>
                        <Trophy className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
                                ))}
                            </div>
                        ) : topVendors.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                <Medal className="h-10 w-10 mb-2 opacity-20" />
                                <p className="text-sm">Belum ada data pesanan.<br />Yuk mulai pesan!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topVendors.map((vendor, idx) => (
                                    <div key={idx} className={`flex items-center justify-between rounded-lg px-4 py-3 ${medalColors[idx].bg}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-2xl font-extrabold ${medalColors[idx].icon}`}>
                                                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                                            </span>
                                            <div>
                                                <p className={`font-semibold text-sm ${medalColors[idx].text}`}>{vendor.vendorName}</p>
                                                <p className="text-xs text-muted-foreground">{vendor.count} transaksi</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${medalColors[idx].bg} ${medalColors[idx].text} border`}>
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
