"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChefHat, TrendingUp, Calendar, AlertCircle } from "lucide-react"

export default function VendorDashboard() {
    const [stats, setStats] = useState<any>(null)

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
        }
    }

    if (!stats) return <div className="p-8">Loading stats...</div>

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-primary">Dashboard Vendor</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Order Besok</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{stats.tomorrowOrderCount}</div>
                        <p className="text-xs text-muted-foreground">Pesanan untuk besok</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Order Minggu Ini</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.weeklyOrderCount}</div>
                        <p className="text-xs text-muted-foreground">Total minggu ini</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-2 md:col-span-1">
                    <CardHeader>
                        <CardTitle>Jadwal Masak Besok</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.cookingList.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Tidak ada jadwal masak.</p>
                        ) : (
                            <div className="space-y-4">
                                {stats.cookingList.map((item: any, idx: number) => (
                                    <div key={idx} className="border-b pb-2 last:border-0">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-lg">{item.name}</span>
                                            <span className="bg-primary/10 text-primary px-2 py-1 rounded font-bold">x{item.qty}</span>
                                        </div>
                                        {item.notes.length > 0 && (
                                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                                <div className="flex items-center gap-1 mb-1 font-semibold">
                                                    <AlertCircle className="h-3 w-3" /> Catatan Khusus:
                                                </div>
                                                <ul className="list-disc pl-4">
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
            </div>
        </div>
    )
}
