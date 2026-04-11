"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Power, PowerOff } from "lucide-react"

export function SystemStatus() {
    const [status, setStatus] = useState<{ isOpen: boolean; deadline: string } | null>(null)

    useEffect(() => {
        // Fetch status
        fetch("/api/admin/settings/working-days")
            .then(res => res.json())
            .then(config => {
                if (!config) return

                const now = new Date()
                const day = now.getDay() // 0: Sunday, 6: Saturday
                const deadlineTime = config.deadlineTime || "20:00"
                const [dHour, dMin] = deadlineTime.split(":").map(Number)

                let isOpen = false
                if (day === 6) { // Saturday
                    isOpen = true
                } else if (day === 0) { // Sunday
                    const deadline = new Date(now)
                    deadline.setHours(dHour, dMin, 0, 0)
                    isOpen = now <= deadline
                }

                setStatus({ isOpen, deadline: deadlineTime })
            })
            .catch(err => console.error("Failed to fetch system status"))
    }, [])

    if (status === null) return (
        <Card className="border-l-4 border-l-slate-200 shadow-sm animate-pulse">
            <CardContent className="h-[104px] p-6 lg:p-6"></CardContent>
        </Card>
    )

    const { isOpen, deadline } = status

    return (
        <Card className={`border-l-4 shadow-sm ${isOpen ? "border-l-green-500" : "border-l-red-500"}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Pemesanan Mingguan</CardTitle>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isOpen ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                    {isOpen ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${isOpen ? "bg-green-500" : "bg-red-500"}`} />
                    <div className="text-2xl font-bold text-slate-800">{isOpen ? "BUKA" : "TUTUP"}</div>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                    {isOpen 
                        ? `Batas: Minggu pukul ${deadline}` 
                        : "Hanya Sabtu s/d Minggu"}
                </p>
            </CardContent>
        </Card>
    )
}
