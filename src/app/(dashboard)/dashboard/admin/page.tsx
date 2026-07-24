"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, ShoppingBag, TrendingUp, CreditCard, Plus, Pencil, Trash2, Check, X, StickyNote } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SystemStatus } from "@/components/dashboard/system-status"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const WIB_MONTHS_SHORT: Record<string,string> = {
  January:'Jan', February:'Feb', March:'Mar', April:'Apr', May:'Mei',
  June:'Jun', July:'Jul', August:'Ags', September:'Sep',
  October:'Okt', November:'Nov', December:'Des'
}
function formatWIBShort(isoString: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: 'long',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date(isoString))
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const month = WIB_MONTHS_SHORT[get('month')] ?? get('month')
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('day')} ${month}, ${hour}:${get('minute')}`
}

// ── Catatan Pribadi Widget ──────────────────────────────────────────────────
function PersonalNotes() {
    const [notes, setNotes] = useState<any[]>([])
    const [newText, setNewText] = useState("")
    const [adding, setAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState("")
    const [saving, setSaving] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => { fetchNotes() }, [])

    async function fetchNotes() {
        try {
            const res = await fetch("/api/admin/notes")
            if (res.ok) setNotes(await res.json())
        } catch {}
    }

    async function handleAdd() {
        if (!newText.trim()) return
        setSaving(true)
        try {
            const res = await fetch("/api/admin/notes", {
                method: "POST",
                body: JSON.stringify({ content: newText })
            })
            if (res.ok) {
                setNewText("")
                setAdding(false)
                fetchNotes()
            } else {
                toast.error("Gagal menyimpan catatan")
            }
        } finally { setSaving(false) }
    }

    async function handleEdit(id: string) {
        if (!editText.trim()) return
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/notes/${id}`, {
                method: "PUT",
                body: JSON.stringify({ content: editText })
            })
            if (res.ok) {
                setEditingId(null)
                fetchNotes()
            } else {
                toast.error("Gagal mengupdate catatan")
            }
        } finally { setSaving(false) }
    }

    async function handleDelete(id: string) {
        try {
            const res = await fetch(`/api/admin/notes/${id}`, { method: "DELETE" })
            if (res.ok) fetchNotes()
            else toast.error("Gagal menghapus catatan")
        } catch {}
    }

    function startEdit(note: any) {
        setEditingId(note.id)
        setEditText(note.content)
        setAdding(false)
    }

    return (
        <Card className="shadow-sm border-none bg-amber-50/60 flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-amber-500" />
                    <CardTitle className="text-sm font-bold text-slate-700">Catatan Pribadi</CardTitle>
                </div>
                {!adding && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700"
                        onClick={() => { setAdding(true); setEditingId(null); setTimeout(() => inputRef.current?.focus(), 50) }}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                )}
            </CardHeader>

            <CardContent className="px-4 pb-4 flex flex-col gap-2 flex-1 overflow-y-auto max-h-[460px]">
                {/* Add form */}
                {adding && (
                    <div className="bg-white border border-slate-100 rounded-lg p-3 space-y-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        <textarea
                            ref={inputRef}
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            placeholder="Tulis catatan..."
                            rows={3}
                            className="w-full text-xs text-slate-700 resize-none bg-transparent focus:outline-none placeholder:text-slate-400"
                            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAdd() }}
                        />
                        <div className="flex gap-1.5 justify-end">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-slate-500"
                                onClick={() => { setAdding(false); setNewText("") }}>
                                <X className="h-3 w-3 mr-1" /> Batal
                            </Button>
                            <Button size="sm" className="h-6 px-2 text-xs bg-amber-500 hover:bg-amber-600"
                                onClick={handleAdd} disabled={saving || !newText.trim()}>
                                <Check className="h-3 w-3 mr-1" /> Simpan
                            </Button>
                        </div>
                    </div>
                )}

                {/* Notes list */}
                {notes.length === 0 && !adding ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-8 text-center text-slate-400">
                        <StickyNote className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-xs">Belum ada catatan.<br />Klik + untuk mulai menulis.</p>
                    </div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className="group bg-white border border-slate-100 rounded-lg p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative hover:shadow-md transition-all duration-200">
                            {editingId === note.id ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={editText}
                                        onChange={e => setEditText(e.target.value)}
                                        rows={3}
                                        autoFocus
                                        className="w-full text-xs text-slate-700 resize-none bg-transparent focus:outline-none"
                                        onKeyDown={e => { if (e.key === 'Escape') setEditingId(null) }}
                                    />
                                    <div className="flex gap-1.5 justify-end">
                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-slate-500"
                                            onClick={() => setEditingId(null)}>
                                            <X className="h-3 w-3 mr-1" /> Batal
                                        </Button>
                                        <Button size="sm" className="h-6 px-2 text-xs bg-amber-500 hover:bg-amber-600"
                                            onClick={() => handleEdit(note.id)} disabled={saving}>
                                            <Check className="h-3 w-3 mr-1" /> Simpan
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pr-12">{note.content}</p>
                                    <p className="text-[10px] text-slate-400 mt-1.5">{formatWIBShort(note.updatedAt)}</p>
                                    <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEdit(note)}
                                            className="p-1 rounded-md hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors">
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                        <button onClick={() => handleDelete(note.id)}
                                            className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetchStats() }, [])

    async function fetchStats() {
        try {
            const res = await fetch("/api/admin/stats")
            if (res.ok) setStats(await res.json())
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8">Loading dashboard...</div>
    if (!stats) return <div className="p-8 text-red-500">Gagal memuat data statistik.</div>

    const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Ringkasan Sistem</h2>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Pesanan (7 Hari ke Depan)</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <ShoppingBag className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">{stats.weeklyOrders.count}</div>
                        <p className="text-xs text-slate-400 font-medium mt-1">Akumulasi porsi mingguan</p>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-400">Jumlah Siswa Pemesan</p>
                            <p className="text-sm font-bold text-blue-600">{stats.weeklyOrders.uniqueStudents ?? '-'} siswa</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Keseluruhan Uang Masuk (Kotor)</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.revenue.gross)}</div>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-400">Pendapatan Bersih</p>
                            <p className="text-sm font-bold text-green-600">{formatCurrency(stats.revenue.net)}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Keseluruhan Rincian Metode Bayar</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <CreditCard className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500">Uang Masuk (TF)</p>
                            <p className="text-sm font-bold text-blue-600">{formatCurrency(stats.revenue.grossTF || 0)}</p>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500">Uang Masuk (Cash)</p>
                            <p className="text-sm font-bold text-orange-600">{formatCurrency(stats.revenue.grossCash || 0)}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Berdasarkan metode pembayaran</p>
                    </CardContent>
                </Card>

                <SystemStatus />
            </div>

            {/* Bottom Section: Notes | Activity (2 cols) | Top 5 */}
            <div className="grid gap-6 lg:grid-cols-4">

                {/* Catatan Pribadi — 1 col */}
                <PersonalNotes />

                {/* Activity Feed — 2 cols */}
                <Card className="lg:col-span-2 shadow-sm border-none">
                    <CardHeader className="flex flex-row items-center justify-between bg-transparent px-6 pt-6 pb-2">
                        <CardTitle className="text-lg font-bold text-slate-800">Aktivitas Terbaru</CardTitle>
                        <Link href="/dashboard/admin/orders" className="text-blue-600 text-sm font-medium hover:underline">Lihat Semua</Link>
                    </CardHeader>
                    <CardContent className="px-6">
                        <div className="space-y-4">
                            {stats.recentActivity.map((activity: any, idx: number) => (
                                <div key={activity.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center",
                                            idx % 2 === 0 ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                                        )}>
                                            {idx % 2 === 0 ? <CreditCard className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{activity.studentName}</p>
                                            <p className="text-xs text-slate-500">
                                                {activity.itemsCount} menu • {formatCurrency(activity.total)}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className={cn("font-normal",
                                            activity.status === 'PAID' || activity.status === 'COMPLETED'
                                                ? "bg-green-100 text-green-700 hover:bg-green-100"
                                                : activity.status === 'CANCELLED'
                                                ? "bg-red-100 text-red-700 hover:bg-red-100"
                                                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                                        )}
                                    >
                                        {activity.status === 'PAID' || activity.status === 'COMPLETED' ? 'Lunas'
                                        : activity.status === 'CANCELLED' ? 'Dibatalkan'
                                        : 'Menunggu'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top 5 Menu — 1 col */}
                <Card className="shadow-sm border-none bg-white">
                    <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
                        <CardTitle className="text-sm font-bold text-slate-800">Ranking Menu Terlaris (Minggu Ini)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent className="px-2 pb-6">
                        {stats.topWeeklyMenus && stats.topWeeklyMenus.length > 0 ? (
                            <div className="overflow-y-auto max-h-[350px] px-2 pr-3 scrollbar-thin">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[40px] text-xs">No</TableHead>
                                            <TableHead className="text-xs">Menu</TableHead>
                                            <TableHead className="text-xs text-right">Porsi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats.topWeeklyMenus.map((menu: any, idx: number) => (
                                            <TableRow key={menu.id} className="group">
                                                <TableCell className="text-xs text-slate-500">{idx + 1}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800 line-clamp-1">{menu.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">{menu.vendorName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 font-bold text-xs ring-1 ring-inset ring-blue-700/10">
                                                        {menu.count}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-lg mx-4 mt-4">
                                <ShoppingBag className="h-10 w-10 text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500 font-medium">Belum ada data mingguan.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
