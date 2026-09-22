"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Power, PowerOff, ChefHat, Truck, CheckCircle2 } from "lucide-react"

export type SystemStatusType = "BUKA" | "MEMASAK" | "PENGANTARAN" | "SAMPAI_SEKOLAH" | "TUTUP"

export interface SystemStatusProps {
    role?: "ADMIN" | "VENDOR" | "STUDENT"
    hasOrderToday?: boolean
    studentOrdersDone?: boolean
}

interface SystemStatusState {
    type: SystemStatusType
    desc: string
}

const DAY_NAMES: Record<number, string> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday'
}

const DAY_LABELS: Record<string, string> = {
    sunday: 'Minggu', monday: 'Senin', tuesday: 'Selasa',
    wednesday: 'Rabu', thursday: 'Kamis', friday: 'Jumat', saturday: 'Sabtu'
}

function getWibDate(): Date {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    })
    const parts = formatter.formatToParts(now)
    const findPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10)
    const rawHour = findPart('hour')
    return new Date(
        findPart('year'),
        findPart('month') - 1,
        findPart('day'),
        rawHour === 24 ? 0 : rawHour,
        findPart('minute'),
        findPart('second')
    )
}

function getNextActiveDeadline(config: any, wibDate: Date) {
    const dayIndex = wibDate.getDay()
    for (let offset = 1; offset <= 7; offset++) {
        const targetIdx = (dayIndex + offset) % 7
        const targetKey = DAY_NAMES[targetIdx]
        if (config[targetKey] === true) {
            const raw = config.dailyDeadlines?.[targetKey]
            const deadlineObj = typeof raw === 'object' && raw !== null
                ? raw
                : { dayOffset: 0, time: typeof raw === 'string' ? raw : (config.deadlineTime || "08:00") }
            const deadlineTime = deadlineObj.time || "08:00"
            const dayOffset = deadlineObj.dayOffset ?? 0
            const [dHour, dMin] = deadlineTime.split(":").map(Number)

            const deadlineMoment = new Date(wibDate)
            deadlineMoment.setDate(deadlineMoment.getDate() + offset + dayOffset)
            deadlineMoment.setHours(dHour, dMin, 0, 0)

            const isPassed = wibDate >= deadlineMoment

            return {
                dayKey: targetKey,
                dayLabel: DAY_LABELS[targetKey] || targetKey,
                deadlineTime,
                dayOffset,
                isPassed,
                deadlineMoment
            }
        }
    }
    return null
}

export function SystemStatus({
    role = "ADMIN",
    hasOrderToday = false,
    studentOrdersDone = true
}: SystemStatusProps) {
    const [status, setStatus] = useState<SystemStatusState | null>(null)
    const [config, setConfig] = useState<any>(null)
    const [ticker, setTicker] = useState(0)

    // 1. Fetch working-days configuration
    useEffect(() => {
        let isMounted = true
        fetch("/api/admin/settings/working-days")
            .then(res => res.json())
            .then(data => {
                if (isMounted && data) setConfig(data)
            })
            .catch(err => console.error("Gagal memuat status sistem:", err))

        // Timer to update status every 30 seconds
        const timer = setInterval(() => {
            setTicker(t => t + 1)
        }, 30000)

        return () => {
            isMounted = false
            clearInterval(timer)
        }
    }, [])

    // 2. Compute system status based on WIB time, rules, and role
    useEffect(() => {
        if (!config) return

        const wibDate = getWibDate()
        const dayIndex = wibDate.getDay()
        const dayKey = DAY_NAMES[dayIndex]
        const isWorkingDay = config[dayKey] === true

        // Check if today is a custom holiday
        const todayYmd = `${wibDate.getFullYear()}-${String(wibDate.getMonth() + 1).padStart(2, '0')}-${String(wibDate.getDate()).padStart(2, '0')}`
        const isHoliday = Array.isArray(config.holidays) && config.holidays.includes(todayYmd)

        const nextInfo = getNextActiveDeadline(config, wibDate)

        // RULE 1: Hari Libur / Akhir Pekan -> Status BUKA
        if (!isWorkingDay || isHoliday) {
            const nextDesc = nextInfo
                ? `Pemesanan dibuka untuk ${nextInfo.dayLabel} (Batas: ${nextInfo.deadlineTime})`
                : "Hari libur · Pemesanan katering dibuka"
            setStatus({
                type: "BUKA",
                desc: nextDesc
            })
            return
        }

        // RULE 2: Hari Kerja (Operational Hours)
        // Minute thresholds:
        // 07:30 = 450
        // 10:30 = 630
        // 12:00 = 720
        // 13:00 = 780
        const currentMinutes = wibDate.getHours() * 60 + wibDate.getMinutes()

        // Today's cutoff deadline
        const rawToday = config.dailyDeadlines?.[dayKey]
        const deadlineToday = typeof rawToday === 'object' && rawToday !== null
            ? rawToday
            : { dayOffset: 0, time: typeof rawToday === 'string' ? rawToday : (config.deadlineTime || "08:00") }
        const todayDeadlineTime = deadlineToday.time || "08:00"
        const todayDayOffset = deadlineToday.dayOffset ?? 0
        const [tHour, tMin] = todayDeadlineTime.split(":").map(Number)
        const todayDeadlineMinutes = tHour * 60 + tMin
        const isTodayCutoffPassed = todayDayOffset < 0 || currentMinutes >= todayDeadlineMinutes

        let type: SystemStatusType = "TUTUP"
        let desc = ""

        if (currentMinutes < 450) {
            // Sebelum 07:30 (00:00 - 07:29)
            if (!isTodayCutoffPassed) {
                type = "BUKA"
                desc = `Pemesanan aktif (Cutoff: pukul ${todayDeadlineTime})`
            } else {
                type = "TUTUP"
                desc = `Batas pemesanan berakhir · Memasak mulai 07:30`
            }
        } else if (currentMinutes >= 450 && currentMinutes < 630) {
            // 07:30 - 10:30: MEMASAK
            if (role === "STUDENT") {
                if (hasOrderToday && !studentOrdersDone) {
                    type = "MEMASAK"
                    desc = "Pesanan katering Anda sedang dimasak oleh vendor"
                } else if (studentOrdersDone || !hasOrderToday) {
                    if (nextInfo && !nextInfo.isPassed) {
                        type = "BUKA"
                        desc = `Pemesanan dibuka untuk ${nextInfo.dayLabel} (Batas: ${nextInfo.deadlineTime})`
                    } else {
                        type = "MEMASAK"
                        desc = "Dapur katering sedang memasak pesanan hari ini"
                    }
                } else {
                    type = "MEMASAK"
                    desc = "Dapur katering sedang memasak pesanan hari ini"
                }
            } else {
                type = "MEMASAK"
                desc = "Dapur katering sedang memasak & memproses pesanan"
            }
        } else if (currentMinutes >= 630 && currentMinutes < 720) {
            // 10:30 - 12:00: PENGANTARAN
            if (role === "STUDENT") {
                if (hasOrderToday && !studentOrdersDone) {
                    type = "PENGANTARAN"
                    desc = "Pesanan katering Anda sedang diantar ke sekolah"
                } else if (studentOrdersDone || !hasOrderToday) {
                    if (nextInfo && !nextInfo.isPassed) {
                        type = "BUKA"
                        desc = `Pemesanan dibuka untuk ${nextInfo.dayLabel} (Batas: ${nextInfo.deadlineTime})`
                    } else {
                        type = "PENGANTARAN"
                        desc = "Pesanan katering sedang dalam pengantaran ke sekolah"
                    }
                } else {
                    type = "PENGANTARAN"
                    desc = "Pesanan katering sedang dalam pengantaran ke sekolah"
                }
            } else {
                type = "PENGANTARAN"
                desc = "Pesanan katering sedang diantar oleh vendor ke sekolah"
            }
        } else if (currentMinutes >= 720 && currentMinutes < 780) {
            // 12:00 - 13:00: SAMPAI SEKOLAH
            if (role === "STUDENT") {
                if (hasOrderToday && !studentOrdersDone) {
                    type = "SAMPAI_SEKOLAH"
                    desc = "Makanan sudah tiba di sekolah, silakan ambil katering Anda"
                } else if (studentOrdersDone) {
                    // Pesanan siswa sudah selesai diambil / diterima
                    if (nextInfo && !nextInfo.isPassed) {
                        type = "BUKA"
                        desc = `Pesanan hari ini selesai · Pemesanan ${nextInfo.dayLabel} dibuka`
                    } else {
                        type = "SAMPAI_SEKOLAH"
                        desc = "Pesanan katering hari ini telah selesai diterima"
                    }
                } else {
                    type = "SAMPAI_SEKOLAH"
                    desc = "Makanan sudah tiba di sekolah, waktu makan siang siswa"
                }
            } else {
                type = "SAMPAI_SEKOLAH"
                desc = "Pesanan telah tiba di sekolah (Waktu Makan Siang)"
            }
        } else {
            // 13:00 onwards (13:00 - 23:59): TUTUP KEMBALI
            if (role === "STUDENT") {
                if (studentOrdersDone || !hasOrderToday) {
                    // Cek batas pemesanan berikutnya
                    if (nextInfo && !nextInfo.isPassed) {
                        type = "BUKA"
                        desc = `Pemesanan dibuka untuk ${nextInfo.dayLabel} (Batas: ${nextInfo.deadlineTime})`
                    } else {
                        type = "TUTUP"
                        desc = "Layanan makan siang hari ini telah selesai (Tutup 13:00)"
                    }
                } else {
                    type = "TUTUP"
                    desc = "Layanan makan siang hari ini telah selesai (Tutup 13:00)"
                }
            } else {
                type = "TUTUP"
                desc = "Layanan makan siang hari ini telah selesai (Tutup 13:00)"
            }
        }

        setStatus({ type, desc })
    }, [config, ticker, role, hasOrderToday, studentOrdersDone])

    if (status === null) return (
        <Card className="border-l-4 border-l-slate-200 shadow-sm animate-pulse flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Status Sistem</CardTitle>
                <div className="h-8 w-8 rounded-full bg-slate-100" />
            </CardHeader>
            <CardContent>
                <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-36 bg-slate-100 rounded mt-2 animate-pulse" />
            </CardContent>
        </Card>
    )

    const { type, desc } = status

    const configMap: Record<SystemStatusType, {
        border: string
        iconBg: string
        dotColor: string
        label: string
        icon: React.ReactNode
    }> = {
        BUKA: {
            border: "border-l-emerald-500",
            iconBg: "bg-emerald-50 text-emerald-600",
            dotColor: "bg-emerald-500",
            label: "BUKA",
            icon: <Power className="h-4 w-4" />
        },
        MEMASAK: {
            border: "border-l-amber-500",
            iconBg: "bg-amber-50 text-amber-600",
            dotColor: "bg-amber-500",
            label: "MEMASAK",
            icon: <ChefHat className="h-4 w-4" />
        },
        PENGANTARAN: {
            border: "border-l-blue-500",
            iconBg: "bg-blue-50 text-blue-600",
            dotColor: "bg-blue-500",
            label: "PENGANTARAN",
            icon: <Truck className="h-4 w-4" />
        },
        SAMPAI_SEKOLAH: {
            border: "border-l-teal-500",
            iconBg: "bg-teal-50 text-teal-600",
            dotColor: "bg-teal-500",
            label: "SAMPAI SEKOLAH",
            icon: <CheckCircle2 className="h-4 w-4" />
        },
        TUTUP: {
            border: "border-l-rose-500",
            iconBg: "bg-rose-50 text-rose-600",
            dotColor: "bg-rose-500",
            label: "TUTUP",
            icon: <PowerOff className="h-4 w-4" />
        }
    }

    const currentConfig = configMap[type] ?? configMap["TUTUP"]

    return (
        <Card className={`border-l-4 shadow-sm flex flex-col justify-between ${currentConfig.border}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Status Sistem</CardTitle>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${currentConfig.iconBg}`}>
                    {currentConfig.icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full animate-pulse shrink-0 ${currentConfig.dotColor}`} />
                    <div className="text-2xl font-bold text-slate-800 tracking-tight">{currentConfig.label}</div>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed" title={desc}>
                    {desc}
                </p>
            </CardContent>
        </Card>
    )
}
