"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChefHat, TrendingUp, Calendar, AlertCircle, DollarSign } from "lucide-react"
import { SystemStatus } from "@/components/dashboard/system-status"
import { Bar, BarChart as ReBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export default function VendorDashboard() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    async function fetchStats() {
        try {
            const res = await fetch("/api/vendor/stats")
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

    if (loading) return <div className="p-8">Loading stats...</div>
    if (!stats) return <div className="p-8 text-red-500">Gagal memuat data statistik.</div>

    const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val)

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-primary">Dashboard Vendor</h2>

            {/* 4 Cards Top Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Order Besok</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Calendar className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stats.tomorrowOrderCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Pesanan untuk besok</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Order Minggu Ini</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stats.weeklyOrderCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total pesanan minggu ini</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Pendapatan Bersih</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalRevenue || 0)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total minggu ini</p>
                    </CardContent>
                </Card>

                <SystemStatus />
            </div>

            {/* Split Row for Schedule and Charts */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-sm border-none">
                    <CardHeader>
                        <CardTitle>Jadwal Masak Besok</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.cookingList?.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Tidak ada pesanan masak besok.</p>
                        ) : (
                            <div className="space-y-4">
                                {stats.cookingList?.map((item: any, idx: number) => (
                                    <div key={idx} className="border-b pb-3 last:border-0">
                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                            <span className="font-bold text-lg text-slate-800">{item.name}</span>
                                            <span className="bg-primary/10 text-primary px-3 py-1 rounded font-bold">x{item.qty} Porsi</span>
                                        </div>
                                        {item.notes.length > 0 && (
                                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
                                                <div className="flex items-center gap-1 mb-2 font-bold">
                                                    <AlertCircle className="h-4 w-4" /> Catatan Custom Siswa:
                                                </div>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {item.notes.map((note: string, i: number) => (
                                                        <li key={i}>{note}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-none">
                    <CardHeader>
                        <CardTitle>Penjualan 7 Hari Terakhir</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {stats.chartData && stats.chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ReBarChart data={stats.chartData}>
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `Rp${value / 1000}k`}
                                    />
                                    <Tooltip 
                                        formatter={(value: any) => formatCurrency(value || 0)}
                                        cursor={{fill: 'transparent'}}
                                    />
                                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </ReBarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-muted-foreground text-sm">Belum ada data penjualan.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
