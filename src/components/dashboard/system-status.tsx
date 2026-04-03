"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Power, PowerOff } from "lucide-react"

export function SystemStatus() {
    const [isOpen, setIsOpen] = useState<boolean | null>(null)

    useEffect(() => {
        // Fetch status
        fetch("/api/admin/settings/working-days")
            .then(res => res.json())
            .then(config => {
                if (!config) return

                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                const tomorrowWeekday = tomorrow.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
                const isOpenDay = config[tomorrowWeekday]

                const dateStr = tomorrow.toISOString().split('T')[0]
                const isHoliday = config.holidays?.includes(dateStr)

                setIsOpen(isOpenDay && !isHoliday)
            })
            .catch(err => console.error("Failed to fetch system status"))
    }, [])

    if (isOpen === null) return (
        <Card className="border-l-4 border-l-slate-200 shadow-sm animate-pulse">
            <CardContent className="h-[104px] p-6 lg:p-6"></CardContent>
        </Card>
    )

    return (
        <Card className={`border-l-4 shadow-sm ${isOpen ? "border-l-blue-500" : "border-l-red-500"}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Status Sistem</CardTitle>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isOpen ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
                    {isOpen ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${isOpen ? "bg-green-500" : "bg-red-500"}`} />
                    <div className="text-2xl font-bold text-slate-800">{isOpen ? "BUKA" : "TUTUP"}</div>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                    {isOpen ? "Pesanan otomatis masuk" : "Hari Libur / Tidak Beroperasi"}
                </p>
            </CardContent>
        </Card>
    )
}
