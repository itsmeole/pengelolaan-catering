"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Power, PowerOff, Clock } from "lucide-react"

type StatusType = "BUKA" | "TUTUP_SEMENTARA" | "TUTUP"

interface SystemStatusState {
    type: StatusType
    deadline: string
    workingDays: Record<string, boolean>
}

const DAY_NAMES: Record<number, string> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday'
}

export function SystemStatus() {
    const [status, setStatus] = useState<SystemStatusState | null>(null)

    useEffect(() => {
        fetch("/api/admin/settings/working-days")
            .then(res => res.json())
            .then(config => {
                if (!config) return

                const now = new Date()
                const dayIndex = now.getDay()
                const dayKey = DAY_NAMES[dayIndex]
                const isWorkingDay = config[dayKey] === true

                // Parse per-day deadline (new object format or old string/global)
                const raw = config.dailyDeadlines?.[dayKey]
                const deadlineObj = typeof raw === 'object' && raw !== null
                    ? raw
                    : { dayOffset: 0, time: typeof raw === 'string' ? raw : (config.deadlineTime || "08:00") }
                const deadlineTime = deadlineObj.time || "08:00"
                const dayOffset = deadlineObj.dayOffset ?? 0
                const [dHour, dMin] = deadlineTime.split(":").map(Number)

                // Deadline is on (today + dayOffset) at cutoff time
                // For H-0: deadline is today at cutoff
                // For H-1: deadline was yesterday at cutoff — meaning it's always past for today
                const deadlineMoment = new Date(now)
                deadlineMoment.setDate(deadlineMoment.getDate() + dayOffset)
                deadlineMoment.setHours(dHour, dMin, 0, 0)

                const noon = new Date(now)
                noon.setHours(12, 0, 0, 0)

                let type: StatusType = "TUTUP"

                if (isWorkingDay) {
                    if (now < deadlineMoment) {
                        type = "BUKA"
                    } else if (now >= deadlineMoment && now < noon) {
                        type = "TUTUP_SEMENTARA"
                    } else {
                        type = "BUKA"
                    }
                }

                // Build human-readable deadline label
                const deadlineLabel = dayOffset === -1
                    ? `H-1 pukul ${deadlineTime}`
                    : `pukul ${deadlineTime}`

                setStatus({ type, deadline: deadlineLabel, workingDays: config })
            })
            .catch(() => console.error("Failed to fetch system status"))
    }, [])

    if (status === null) return (
        <Card className="border-l-4 border-l-slate-200 shadow-sm animate-pulse">
            <CardContent className="h-[104px] p-6 lg:p-6"></CardContent>
        </Card>
    )

    const { type, deadline } = status

    const configMap = {
        BUKA: {
            border: "border-l-green-500",
            iconBg: "bg-green-50 text-green-600",
            dotColor: "bg-green-500",
            label: "BUKA",
            icon: <Power className="h-4 w-4" />,
            desc: `Pemesanan aktif (Cutoff: ${deadline})`
        },
        TUTUP_SEMENTARA: {
            border: "border-l-yellow-500",
            iconBg: "bg-yellow-50 text-yellow-600",
            dotColor: "bg-yellow-500",
            label: "ISTIRAHAT",
            icon: <Clock className="h-4 w-4" />,
            desc: `Buka kembali pukul 12:00`
        },
        TUTUP: {
            border: "border-l-red-500",
            iconBg: "bg-red-50 text-red-600",
            dotColor: "bg-red-500",
            label: "TUTUP",
            icon: <PowerOff className="h-4 w-4" />,
            desc: `Hari ini bukan hari kerja`
        }
    }

    const config = configMap[type] ?? configMap["TUTUP"]

    return (
        <Card className={`border-l-4 shadow-sm ${config.border}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Status Sistem</CardTitle>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${config.iconBg}`}>
                    {config.icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${config.dotColor}`} />
                    <div className="text-2xl font-bold text-slate-800">{config.label}</div>
                </div>
                <p className="text-xs text-slate-400 mt-1">{config.desc}</p>
            </CardContent>
        </Card>
    )
}
