"use client"

import { useEffect, useState } from "react"
import { format, addDays, isSameDay } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CheckCircle, Clock } from "lucide-react"

export default function StudentDashboard() {
    const [orders, setOrders] = useState<any[]>([])
    const [stats, setStats] = useState({ totalOrders: 0, weeklyAvg: 0 })

    useEffect(() => {
        fetchOrders()
    }, [])

    async function fetchOrders() {
        // We already have GET /api/order specific for student
        const res = await fetch("/api/order")
        const data = await res.json()
        // data is list of Orders. Each Order has `items`.
        // Flatten items for easier processing
        let allItems: any[] = []
        data.forEach((o: any) => {
            if (o.items) allItems.push(...o.items)
        })

        setOrders(allItems)
        setStats({
            totalOrders: allItems.length,
            weeklyAvg: allItems.length / 4 // Dummy calc
        })
    }

    const tomorrow = addDays(new Date(), 1)
    const tomorrowMenu = orders.filter(item => isSameDay(new Date(item.date), tomorrow))

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
            </div>

            {/* Tomorrow's Menu */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-2 md:col-span-1">
                    <CardHeader>
                        <CardTitle>Menu Besok ({format(tomorrow, "EEEE, dd MMMM")})</CardTitle>
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
                                            <p className="font-bold">{item.menu?.name}</p>
                                            <p className="text-sm text-muted-foreground">Qty: {item.quantity} | Note: {item.note || "-"}</p>
                                        </div>
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
