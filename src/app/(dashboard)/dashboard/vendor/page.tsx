"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChefHat, TrendingUp, Calendar, AlertCircle, DollarSign } from "lucide-react"
import { SystemStatus } from "@/components/dashboard/system-status"
import { Bar, BarChart as ReBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts"
import { format } from "date-fns"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders"

const COLORS = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"]

export default function VendorDashboard() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showAcademicYearAlert, setShowAcademicYearAlert] = useState(false)

    // Realtime updates for vendor dashboard stats
    useRealtimeOrders({
        role: "VENDOR",
        showToast: false, // Toast handled globally by RealtimeNotificationProvider in layout
        onOrderItemChanged: () => fetchStats(),
        onOrderUpdated: () => fetchStats(),
    })

    useEffect(() => {
        fetchStats()
    }, [])

    async function fetchStats() {
        setLoading(true)
        try {
            const res = await fetch(`/api/vendor/stats`)
            if (res.ok) {
                const data = await res.json()
                setStats(data)

                // Check if vendor has acknowledged this academic year reset
                if (data.academicYearStart) {
                    const ackKey = `ack_academic_year_${data.academicYearStart}`
                    const acknowledged = localStorage.getItem(ackKey)
                    if (!acknowledged) {
                        setShowAcademicYearAlert(true)
                    }
                }
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    function handleAcknowledge() {
        if (stats?.academicYearStart) {
            const ackKey = `ack_academic_year_${stats.academicYearStart}`
            localStorage.setItem(ackKey, "true")
        }
        setShowAcademicYearAlert(false)
    }

    if (loading) return <div className="p-8">Loading stats...</div>
    if (!stats) return <div className="p-8 text-red-500">Gagal memuat data statistik.</div>

    const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val)

    return (
        <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Dashboard Vendor</h2>

            {/* 4 Cards Top Row */}
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Order Minggu Depan</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Calendar className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold text-slate-800">{stats.nextWeekOrderCount ?? 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total pesanan minggu depan</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Order Minggu Ini</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold text-slate-800">{stats.weeklyOrderCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total pesanan minggu ini</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Pendapatan Bersih</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold text-slate-800 truncate" title={formatCurrency(stats.allTimeNetRevenue || 0)}>
                            {formatCurrency(stats.allTimeNetRevenue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Akumulasi seluruh waktu</p>
                    </CardContent>
                </Card>

                <SystemStatus />
            </div>

            {/* Split Row for Schedule and Charts */}
            <div className="grid gap-6 lg:grid-cols-3 min-w-0">
                {/* 1. Yearly Comparison Line Chart */}
                <Card className="shadow-sm border-none p-4 lg:col-span-1 min-w-0 overflow-hidden">
                    <CardHeader className="px-2 pb-4">
                        <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Perbandingan Penjualan Bulanan</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[320px] sm:h-[350px] px-0">
                        {stats.monthlyChartData && stats.monthlyChartData.length > 0 ? (
                            <div className="w-full h-full min-w-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={45} tickFormatter={(value) => `Rp${value / 1000}k`} />
                                        <Tooltip formatter={(value: any) => formatCurrency(value || 0)} cursor={{ strokeDasharray: '3 3' }} />
                                        <Legend verticalAlign="top" height={36} iconType="circle" />
                                        {(stats.years || []).map((year: string, idx: number) => (
                                            <Line
                                                key={year}
                                                type="monotone"
                                                dataKey={year}
                                                stroke={COLORS[idx % COLORS.length]}
                                                strokeWidth={3}
                                                dot={{ r: 4 }}
                                                activeDot={{ r: 8 }}
                                                name={`${year}`}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-muted-foreground text-sm">Belum ada data penjualan.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. 7 Days Sales Bar Chart */}
                <Card className="shadow-sm border-none p-4 lg:col-span-1 min-w-0 overflow-hidden">
                    <CardHeader className="px-2 pb-4">
                        <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Penjualan 7 Hari Terakhir</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[320px] sm:h-[350px] px-0">
                        {stats.chartData && stats.chartData.length > 0 ? (
                            <div className="w-full h-full min-w-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ReBarChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={45} tickFormatter={(value) => `Rp${value / 1000}k`} />
                                        <Tooltip formatter={(value: any) => formatCurrency(value || 0)} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </ReBarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-muted-foreground text-sm">Belum ada data penjualan.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 3. Class Weekly Pie Chart */}
                <Card className="shadow-sm border-none p-4 lg:col-span-1 min-w-0 overflow-hidden">
                    <CardHeader className="px-2 pb-4">
                        <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Porsi Terbanyak per Kelas</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[320px] sm:h-[350px] flex flex-col justify-between">
                        {stats.classPieData && stats.classPieData.length > 0 ? (
                            <>
                                <div className="h-[200px] w-full min-w-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.classPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={75}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {stats.classPieData.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: any) => `${value} Porsi`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] sm:text-xs overflow-y-auto max-h-[100px] p-2 bg-slate-50 rounded-lg border">
                                    {stats.classPieData.map((entry: any, index: number) => (
                                        <div key={entry.name} className="flex items-center gap-1.5 truncate">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="font-semibold text-slate-700 truncate">{entry.name}</span>
                                            <span className="text-slate-400">({entry.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-muted-foreground text-sm">Belum ada pemesanan minggu ini.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={showAcademicYearAlert} onOpenChange={setShowAcademicYearAlert}>
                <AlertDialogContent className="max-w-md p-5 sm:p-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-800 text-base sm:text-lg">
                            <ChefHat className="h-5 w-5 text-amber-600 shrink-0" />
                            Tahun Ajaran Baru Dimulai
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm text-slate-600 pt-1 leading-relaxed">
                            Statistik dashboard telah di-reset ke 0 untuk periode baru. Seluruh data riwayat pesanan dan laporan penjualan lama Anda tetap aman di sistem.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-3">
                        <AlertDialogAction onClick={handleAcknowledge} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold h-9 text-xs sm:text-sm w-full sm:w-auto">
                            Saya Mengerti
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
