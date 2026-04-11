"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"

import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
    // Tab 1: Working Days
    const [config, setConfig] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [holidays, setHolidays] = useState<Date[]>([])

    // Tab 2: Admin Fee
    const [adminFee, setAdminFee] = useState<number>(1000)
    const [feeLoading, setFeeLoading] = useState(true)

    useEffect(() => {
        fetchConfig()
        fetchAdminFee()
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
                // Parse holidays strings to Dates
                if (data.holidays) {
                    setHolidays(data.holidays.map((d: string) => new Date(d)))
                }
            }
        } catch (e) {
            toast.error("Gagal memuat pengaturan")
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        try {
            const payload = {
                ...config,
                holidays: holidays.map(d => format(d, "yyyy-MM-dd"))
            }

            const res = await fetch("/api/admin/settings/working-days", {
                method: "PUT",
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                toast.success("Pengaturan tersimpan")
            } else {
                toast.error("Gagal menyimpan")
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

    if (loading || feeLoading) return <div>Loading...</div>

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-primary">Pengaturan Sistem</h2>
                <p className="text-muted-foreground">Atur jadwal operasional kantin dan biaya layanan aplikasi.</p>
            </div>

            <Tabs defaultValue="calendar" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="calendar">Jadwal & Hari Libur</TabsTrigger>
                    <TabsTrigger value="fee">Biaya Layanan</TabsTrigger>
                </TabsList>

                <TabsContent value="calendar" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                {/* Weekly Schedule */}
                <Card>
                    <CardHeader>
                        <CardTitle>Jadwal Mingguan</CardTitle>
                        <CardDescription>Aktifkan hari dimana kantin beroperasi rutin.</CardDescription>
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
                        ].map((day) => (
                            <div key={day.k} className="flex items-center justify-between border-b pb-2 last:border-0">
                                <Label className="font-medium text-base">{day.l}</Label>
                                <Switch
                                    checked={config[day.k]}
                                    onCheckedChange={() => toggleDay(day.k)}
                                />
                            </div>
                        ))}

                        <div className="pt-4 border-t mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Batas Waktu Harian (Hari H)</Label>
                                    <p className="text-xs text-muted-foreground">Siswa hanya bisa memesan/membatalkan menu untuk hari ini (Current Day) sebelum jam ini terlewati.</p>
                                </div>
                                <input
                                    type="time"
                                    className="px-3 py-1 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={config.deadlineTime || "20:00"}
                                    onChange={(e) => setConfig({ ...config, deadlineTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Holiday Calendar */}
                <Card>
                    <CardHeader>
                        <CardTitle>Kalender Libur Nasional / Khusus</CardTitle>
                        <CardDescription>Pilih tanggal spesifik dimana kantin libur.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="multiple"
                            selected={holidays}
                            onSelect={setHolidays as any}
                            className="rounded-md border"
                            locale={id}
                        />
                    </CardContent>
                </Card>
            </div>

                    <Button size="lg" onClick={handleSave} className="w-full md:w-auto">
                        <Save className="mr-2 h-4 w-4" /> Simpan Kalender
                    </Button>
                </TabsContent>

                <TabsContent value="fee">
                    <Card className="max-w-xl">
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
                                        className="pl-10 max-w-[250px]"
                                        value={adminFee}
                                        onChange={(e) => setAdminFee(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <Button size="lg" onClick={handleSaveFee} className="mt-4">
                                <Save className="mr-2 h-4 w-4" /> Simpan Biaya
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
