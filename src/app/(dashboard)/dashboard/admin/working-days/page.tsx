"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Save, GraduationCap } from "lucide-react"
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
        <div className="space-y-6 max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-primary">Pengaturan Sistem</h2>
                <p className="text-muted-foreground text-sm">Atur jadwal operasional kantin dan biaya layanan aplikasi.</p>
            </div>

            {/* 1. Biaya Layanan (Admin Fee) */}
            <Card>
                <CardHeader>
                    <CardTitle>Biaya Layanan (Admin Fee)</CardTitle>
                    <CardDescription>
                        Biaya ini akan ditambahkan secara otomatis pada setiap porsi pesanan yang dibeli oleh siswa dari aplikasi, baik secara instan maupun bulanan.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="fee">Tarif Biaya Layanan per Porsi (Rp)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium tracking-wider">Rp</span>
                            <Input
                                id="fee"
                                type="number"
                                className="pl-10 max-w-[250px] bg-white"
                                value={adminFee}
                                onChange={(e) => setAdminFee(Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <Button size="lg" onClick={handleSaveFee} className="mt-4">
                        <Save className="mr-2 h-4 w-4" /> Simpan Biaya Layanan
                    </Button>
                </CardContent>
            </Card>

            {/* 2. Tahun Ajaran Baru (Reset Dashboard) */}
            <Card className="border border-amber-200 bg-amber-50/20">
                <CardHeader>
                    <CardTitle className="text-amber-800 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-amber-600" />
                        Tahun Ajaran Baru (Reset Statistik Dashboard)
                    </CardTitle>
                    <CardDescription className="text-amber-700/80">
                        Memulai tahun ajaran baru akan menyembunyikan transaksi tahun ajaran sebelumnya dari grafik dan statistik dashboard admin (mengembalikan statistik pendapatan dan aktivitas ke 0). Semua data histori pesanan/invoice lama Anda tetap tersimpan dengan aman di database.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="bg-white border rounded-lg p-4 shadow-sm max-w-xl">
                        <h4 className="font-semibold text-sm text-slate-800">Status Tahun Ajaran Saat Ini</h4>
                        {academicYearStart ? (
                            <p className="text-xs text-muted-foreground mt-1">
                                Aktif sejak: <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{format(new Date(academicYearStart), "dd MMMM yyyy, HH:mm", { locale: idLocale })}</span>
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground mt-1 text-slate-500 italic">
                                Belum pernah diset (menghitung seluruh data dari awal).
                            </p>
                        )}
                        
                        <div className="mt-4">
                            <ConfirmButton
                                title="Mulai Tahun Ajaran Baru?"
                                description="Apakah Anda yakin ingin memulai tahun ajaran baru? Statistik omzet, data pesanan mingguan, dan aktivitas terbaru pada dashboard utama admin akan diset ulang menjadi 0 mulai detik ini. Aksi ini tidak dapat dibatalkan."
                                onConfirm={handleStartNewAcademicYear}
                                confirmText="Ya, Mulai Sekarang"
                                variant="default"
                            >
                                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                                    Mulai Tahun Ajaran Baru
                                </Button>
                            </ConfirmButton>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Jadwal Mingguan */}
            <Card>
                <CardHeader>
                    <CardTitle>Jadwal Mingguan & Batas Pemesanan</CardTitle>
                    <CardDescription>
                        Aktifkan hari operasional kantin beserta batas hari dan jam pemesanannya.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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

                        return (
                            <div key={day.k} className="border-b pb-3 last:border-0 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="font-medium text-base">{day.l}</Label>
                                    <Switch
                                        checked={config[day.k]}
                                        onCheckedChange={() => toggleDay(day.k)}
                                    />
                                </div>
                                {config[day.k] && (
                                    <div className="flex items-center gap-3 flex-wrap pl-1">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Batas Hari</span>
                                            <select
                                                className="px-2 py-1 border rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary bg-white"
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
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Jam Cutoff</span>
                                            <input
                                                type="time"
                                                className="px-2 py-1 border rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary w-[90px]"
                                                value={deadlineObj.time}
                                                onChange={(e) => updateDeadline({ time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    <div className="pt-3 mt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                            <strong>Keterangan</strong>:<br/>
                            💡 <strong>H (Hari Itu)</strong>: Siswa harus pesan sebelum jam cutoff di hari yang sama.<br/>
                            💡 <strong>H-1</strong>: Siswa harus pesan sebelum jam cutoff di hari sebelumnya.
                        </p>
                    </div>

                    <div className="pt-4">
                        <Button size="lg" onClick={handleSave} className="w-full md:w-auto">
                            <Save className="mr-2 h-4 w-4" /> Simpan Jadwal Mingguan
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
