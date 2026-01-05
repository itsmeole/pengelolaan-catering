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

export default function WorkingDaysPage() {
    const [config, setConfig] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [holidays, setHolidays] = useState<Date[]>([])

    useEffect(() => {
        fetchConfig()
    }, [])

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

    if (loading) return <div>Loading...</div>

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-primary">Kelola Hari Kerja</h2>
                <p className="text-muted-foreground">Atur jadwal operasional kantin dan hari libur.</p>
            </div>

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
                <Save className="mr-2 h-4 w-4" /> Simpan Perubahan
            </Button>
        </div>
    )
}
