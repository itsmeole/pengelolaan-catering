"use client"

import { useEffect, useState } from "react"

export function SystemStatus() {
    const [isOpen, setIsOpen] = useState<boolean | null>(null)
    const [closingTime, setClosingTime] = useState("20:00") // Default

    useEffect(() => {
        // Fetch status
        fetch("/api/admin/settings/working-days")
            .then(res => res.json())
            .then(config => {
                if (!config) return

                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
                // Simple logic: If today is enabled in config, it's OPEN.
                // Assuming simple key mapping
                const isOpenDay = config[today]

                // Check exact date holiday
                const dateStr = new Date().toISOString().split('T')[0]
                const isHoliday = config.holidays?.includes(dateStr)

                setIsOpen(isOpenDay && !isHoliday)
            })
            .catch(err => console.error("Failed to fetch system status"))
    }, [])

    // If loading, show placeholder or nothing
    if (isOpen === null) return (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-sm animate-pulse">
            <div className="h-4 w-20 bg-slate-200 rounded mb-2"></div>
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
    )

    return (
        <div className={isOpen
            ? "bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm"
            : "bg-red-50 rounded-xl p-4 border border-red-100 shadow-sm"
        }>
            <div className={`text-xs font-bold mb-1 ${isOpen ? "text-blue-800" : "text-red-800"}`}>Status Sistem</div>
            <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full animate-pulse ${isOpen ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm font-bold text-slate-700">
                    Order Besok: {isOpen ? "BUKA" : "TUTUP"}
                </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
                {isOpen ? "Tutup otomatis jam 20:00" : "Hari Libur / Tidak Beroperasi"}
            </div>
        </div>
    )
}
