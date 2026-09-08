"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Save, GraduationCap, Coins, CalendarClock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

const DAY_INDEX_MAP: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
}
const DAY_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

function getTargetDayLabel(dayKey: string, dayOffset: number): string {
    const startIdx = DAY_INDEX_MAP[dayKey]
    if (startIdx === undefined) return ""
    const targetIdx = (startIdx + dayOffset + 700) % 7
    return DAY_LABELS[targetIdx]
}

export default function SettingsPage() {
    // State for Working Days Config
    const [config, setConfig] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // State for Admin Fee Config
    const [adminFee, setAdminFee] = useState<number>(1000)
    const [feeLoading, setFeeLoading] = useState(true)

    // State for Academic Year Config
    const [academicYearStart, setAcademicYearStart] = useState<string | null>(null)
    const [academicYearLoading, setAcademicYearLoading] = useState(true)

    useEffect(() => {
        fetchConfig()
        fetchAdminFee()
        fetchAcademicYear()
    }, [])

    async function fetchAdminFee() {
        try {
            const res = await fetch("/api/admin/settings/admin-fee")
            if (res.ok) {
                const data = await res.json()
                setAdminFee(data.fee === undefined ? 1000 : data.fee)
            }
        } catch (e) {
            console.error("Failed to fetch admin fee")
        } finally {
            setFeeLoading(false)
        }
    }

    async function fetchConfig() {
        try {
            const res = await fetch("/api/admin/settings/working-days")
            if (res.ok) {
                const data = await res.json()
                setConfig(data)
            }
        } catch (e) {
            toast.error("Gagal memuat pengaturan")
        } finally {
            setLoading(false)
        }
    }

    async function fetchAcademicYear() {
        try {
            const res = await fetch("/api/admin/settings/academic-year")
            if (res.ok) {
                const data = await res.json()
                setAcademicYearStart(data.academicYearStart)
            }
        } catch (e) {
            console.error("Failed to fetch academic year start")
        } finally {
            setAcademicYearLoading(false)
        }
    }

    async function handleSave() {
        try {
            const payload = {
                ...config,
                holidays: [] // Kosongkan hari libur karena fiturnya disederhanakan
            }

            const res = await fetch("/api/admin/settings/working-days", {
                method: "PUT",
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                toast.success("Jadwal mingguan disimpan")
            } else {
                toast.error("Gagal menyimpan jadwal")
            }
        } catch (e) {
            toast.error("Error sistem")
        }
    }

    const toggleDay = (day: string) => {
        setConfig({ ...config, [day]: !config[day] })
    }

    async function handleSaveFee() {
        try {
            const res = await fetch("/api/admin/settings/admin-fee", {
                method: "PUT",
                body: JSON.stringify({ fee: Number(adminFee) })
            })

            if (res.ok) {
                toast.success("Biaya layanan diperbarui")
            } else {
                toast.error("Gagal menyimpan biaya layanan")
            }
        } catch (e) {
            toast.error("Error sistem")
        }
    }

    async function handleStartNewAcademicYear() {
        try {
            const res = await fetch("/api/admin/settings/academic-year", {
                method: "POST"
            })
            if (res.ok) {
                const data = await res.json()
                setAcademicYearStart(data.academicYearStart)
                toast.success("Tahun ajaran baru berhasil dimulai! Statistik dashboard kembali dari 0.")
            } else {
                toast.error("Gagal memulai tahun ajaran baru")
            }
        } catch (e) {
            toast.error("Error sistem")
        }
    }

    if (loading || feeLoading || academicYearLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Memuat Pengaturan...</div>

    return (
        <div className="space-y-6 max-w-5xl pb-8">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Pengaturan Sistem</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Kelola biaya layanan, tahun ajaran, dan jadwal operasional kantin.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 items-start">
                {/* Left Column: Admin Fee & Academic Year */}
                <div className="space-y-6">
                    {/* 1. Biaya Layanan (Admin Fee) */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="p-4 sm:p-5 pb-2">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-800">
                                <Coins className="h-4 w-4 text-primary shrink-0" />
                                Biaya Layanan (Admin Fee)
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Biaya admin otomatis per porsi pesanan siswa.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-5 pt-2">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <Label htmlFor="fee" className="text-xs font-semibold text-slate-600">Tarif per Porsi (Rp)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
                                        <Input
                                            id="fee"
                                            type="number"
                                            className="pl-9 h-9 text-sm bg-white"
                                            value={adminFee}
                                            onChange={(e) => setAdminFee(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                                <Button size="sm" onClick={handleSaveFee} className="h-9 px-4 text-xs font-semibold shrink-0">
                                    <Save className="mr-1.5 h-3.5 w-3.5" /> Simpan
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Tahun Ajaran Baru (Reset Dashboard) */}
                    <Card className="border border-amber-200/80 bg-amber-50/20 shadow-sm">
                        <CardHeader className="p-4 sm:p-5 pb-2">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-amber-900">
                                <GraduationCap className="h-4 w-4 text-amber-600 shrink-0" />
                                Tahun Ajaran Baru
                            </CardTitle>
                            <CardDescription className="text-xs text-amber-800/80">
                                Reset statistik dashboard ke 0 untuk periode baru. Data riwayat lama tetap tersimpan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
                            <div className="bg-white border border-amber-100 rounded-lg p-3 shadow-xs">
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status Periode</div>
                                {academicYearStart ? (
                                    <div className="text-xs text-slate-700 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                                        <span>Aktif sejak:</span>
                                        <span className="font-bold text-slate-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                                            {format(new Date(academicYearStart), "dd MMM yyyy, HH:mm", { locale: idLocale })}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-1 italic">Menghitung seluruh data dari awal.</p>
                                )}
                            </div>
                            
                            <ConfirmButton
                                title="Mulai Tahun Ajaran Baru?"
                                description="Statistik omzet, pesanan mingguan, dan grafik di dashboard admin akan dimulai kembali dari 0. Riwayat transaksi lama tetap aman di laporan."
                                onConfirm={handleStartNewAcademicYear}
                                confirmText="Ya, Mulai Sekarang"
                                variant="default"
                            >
                                <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white h-9 text-xs font-semibold">
                                    Mulai Tahun Ajaran Baru
                                </Button>
                            </ConfirmButton>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Working Days & Deadlines */}
                <div>
                    <Card className="border-none shadow-sm">
                        <CardHeader className="p-4 sm:p-5 pb-2">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-800">
                                <CalendarClock className="h-4 w-4 text-primary shrink-0" />
                                Jadwal & Batas Pemesanan
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Atur hari aktif katering dan batas waktu (cutoff) pemesanan siswa.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-5 pt-2 space-y-2.5">
                            {[
                                { k: "monday", l: "Senin" },
                                { k: "tuesday", l: "Selasa" },
                                { k: "wednesday", l: "Rabu" },
                                { k: "thursday", l: "Kamis" },
                                { k: "friday", l: "Jumat" },
                                { k: "saturday", l: "Sabtu" },
                                { k: "sunday", l: "Minggu" },
                            ].map((day) => {
                                const raw = config.dailyDeadlines?.[day.k]
                                const deadlineObj = typeof raw === 'object' && raw !== null
                                    ? raw
                                    : { dayOffset: 0, time: typeof raw === 'string' ? raw : (config.deadlineTime || "08:00") }

                                const updateDeadline = (patch: any) => setConfig({
                                    ...config,
                                    dailyDeadlines: {
                                        ...(config.dailyDeadlines || {}),
                                        [day.k]: { ...deadlineObj, ...patch }
                                    }
                                })

                                const isActive = !!config[day.k]

                                return (
                                    <div 
                                        key={day.k} 
                                        className={`p-2.5 rounded-lg border transition-all ${isActive ? 'bg-white border-slate-200' : 'bg-slate-50/60 border-slate-100 opacity-60'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <Label className={`font-semibold text-xs sm:text-sm cursor-pointer ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                                                {day.l}
                                            </Label>
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={() => toggleDay(day.k)}
                                                className="scale-90"
                                            />
                                        </div>
                                        {isActive && (
                                            <div className="flex items-center gap-2 pt-2 mt-1.5 border-t border-slate-100 flex-wrap">
                                                <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
                                                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Batas:</span>
                                                    <select
                                                        className="px-2 py-1 border rounded-md text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-primary w-full"
                                                        value={deadlineObj.dayOffset ?? 0}
                                                        onChange={(e) => updateDeadline({ dayOffset: Number(e.target.value) })}
                                                    >
                                                        <option value={0}>H ({getTargetDayLabel(day.k, 0)})</option>
                                                        <option value={-1}>H-1 ({getTargetDayLabel(day.k, -1)})</option>
                                                        <option value={-2}>H-2 ({getTargetDayLabel(day.k, -2)})</option>
                                                        <option value={-3}>H-3 ({getTargetDayLabel(day.k, -3)})</option>
                                                        <option value={-4}>H-4 ({getTargetDayLabel(day.k, -4)})</option>
                                                        <option value={-5}>H-5 ({getTargetDayLabel(day.k, -5)})</option>
                                                        <option value={-6}>H-6 ({getTargetDayLabel(day.k, -6)})</option>
                                                        <option value={-7}>H-7 ({getTargetDayLabel(day.k, -7)})</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="text-[10px] text-slate-400 font-medium">Jam:</span>
                                                    <input
                                                        type="time"
                                                        className="px-2 py-1 border rounded-md text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-primary w-[75px]"
                                                        value={deadlineObj.time}
                                                        onChange={(e) => updateDeadline({ time: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            <div className="pt-2 text-[11px] text-muted-foreground flex items-start gap-1">
                                <span className="font-semibold text-slate-600">💡 Info:</span>
                                <span>H = hari antar, H-1 = 1 hari sebelum pengantaran.</span>
                            </div>

                            <div className="pt-2">
                                <Button size="sm" onClick={handleSave} className="w-full h-9 text-xs font-semibold">
                                    <Save className="mr-1.5 h-3.5 w-3.5" /> Simpan Jadwal
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
