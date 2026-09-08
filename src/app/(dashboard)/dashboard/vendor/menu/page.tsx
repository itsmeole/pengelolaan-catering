"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash, Pencil } from "lucide-react"
import { toast } from "sonner"
import { uploadImage } from "@/lib/uploadImage"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const formSchema = z.object({
    name: z.string().min(1, "Nama Menu wajib"),
    description: z.string().optional(),
    price: z.string().min(1, "Harga wajib"),
    imageUrl: z.string().optional(),
    availableDays: z.array(z.string()).min(1, "Pilih minimal 1 hari"),
    expiredDate: z.string().min(1, "Tanggal expired wajib"),
})

const DAYS_OF_WEEK = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

export default function VendorMenuPage() {
    const [menus, setMenus] = useState<any[]>([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            price: "",
            imageUrl: "",
            availableDays: [],
            expiredDate: "",
        },
    })

    useEffect(() => {
        fetchMenus()
    }, [])

    async function fetchMenus() {
        try {
            const res = await fetch("/api/vendor/menus")
            const data = await res.json()
            setMenus(data)
        } catch (error) {
            toast.error("Gagal memuat menu")
        }
    }

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            toast.loading("Mengupload gambar menu...", { id: 'upload-menu' })
            const url = await uploadImage(file, 'menus')
            form.setValue("imageUrl", url)
            toast.success("Gambar menu berhasil diupload", { id: 'upload-menu' })
        } catch (err: any) {
            toast.error(err.message || "Gagal upload gambar", { id: 'upload-menu' })
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const url = editingId ? `/api/vendor/menus/${editingId}` : "/api/vendor/menus"
            const method = editingId ? "PUT" : "POST"
            
            const res = await fetch(url, {
                method,
                body: JSON.stringify(values),
            })
            if (res.ok) {
                toast.success(editingId ? "Menu berhasil diubah" : "Menu berhasil ditambahkan")
                handleCloseModal()
                fetchMenus()
            } else {
                toast.error("Gagal menambah menu")
            }
        } catch (error) {
            toast.error("Error sistem")
        } finally {
            setLoading(false)
        }
    }

    function handleCloseModal() {
        setOpen(false)
        setEditingId(null)
        form.reset({
            name: "",
            description: "",
            price: "",
            imageUrl: "",
            availableDays: [],
            expiredDate: "",
        })
    }

    function handleEdit(menu: any) {
        setEditingId(menu.id)
        form.reset({
            name: menu.name,
            description: menu.description || "",
            price: String(menu.price),
            imageUrl: menu.imageUrl || "",
            availableDays: menu.availableDays || [],
            expiredDate: menu.expiredDate || "",
        })
        setOpen(true)
    }

    async function handleDelete(id: string) {
        try {
            const res = await fetch(`/api/vendor/menus/${id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Menu berhasil dihapus")
                fetchMenus()
            } else {
                const data = await res.json()
                toast.error(data.error || "Gagal menghapus menu")
            }
        } catch (error) {
            console.error(error)
            toast.error("Terjadi kesalahan sistem")
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Menu saya</h2>
                <Dialog open={open} onOpenChange={(val) => {
                    if (!val) handleCloseModal()
                    else setOpen(true)
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-bold shadow-sm">
                            <Plus className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Tambah Menu</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Edit Menu" : "Tambah Menu Baru"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid w-full gap-2">
                                <Label>Nama Menu</Label>
                                <Input {...form.register("name")} placeholder="Contoh: Paket Ayam Bakar" />
                            </div>
                            <div className="grid w-full gap-2">
                                <Label>Deskripsi</Label>
                                <Textarea {...form.register("description")} placeholder="Isi paket..." />
                            </div>
                            <div className="grid w-full gap-2">
                                <Label>Harga (Rp)</Label>
                                <Input type="number" {...form.register("price")} placeholder="15000" />
                            </div>
                            <div className="grid w-full gap-2">
                                <Label>Gambar (Optional)</Label>
                                <Input type="file" accept="image/*" onChange={handleImageChange} />
                            </div>
                            <div className="grid w-full gap-2">
                                <Label>Tanggal Expired *</Label>
                                <Input type="date" {...form.register("expiredDate")} />
                                {form.formState.errors.expiredDate && (
                                    <p className="text-red-500 text-xs mt-1">{form.formState.errors.expiredDate.message}</p>
                                )}
                            </div>
                            <div className="grid w-full gap-2">
                                <Label>Jadwal Hari Tersedia *</Label>
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <label key={day} className="flex items-center gap-2 text-sm border p-2 rounded cursor-pointer hover:bg-slate-50">
                                            <input
                                                type="checkbox"
                                                value={day}
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                                {...form.register("availableDays")}
                                            />
                                            {day}
                                        </label>
                                    ))}
                                </div>
                                {form.formState.errors.availableDays && (
                                    <p className="text-red-500 text-xs mt-1">{form.formState.errors.availableDays.message}</p>
                                )}
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Menyimpan..." : "Simpan Menu"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[180px] sm:w-auto">Nama</TableHead>
                                <TableHead className="whitespace-nowrap">Harga</TableHead>
                                <TableHead className="hidden md:table-cell">Deskripsi</TableHead>
                                <TableHead className="hidden sm:table-cell">Jadwal</TableHead>
                                <TableHead className="hidden lg:table-cell">Expired</TableHead>
                                <TableHead className="w-[80px] text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {menus.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada menu.</TableCell>
                                </TableRow>
                            )}
                            {menus.map((menu) => (
                                <TableRow key={menu.id}>
                                    <TableCell className="font-medium max-w-[150px] sm:max-w-[240px] md:max-w-none">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {menu.imageUrl ? (
                                                <img src={menu.imageUrl} className="h-9 w-9 rounded-lg object-cover shrink-0 border border-slate-100" alt={menu.name} />
                                            ) : (
                                                <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 text-xs font-bold">
                                                    🍽️
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <span className="font-bold text-slate-800 text-xs sm:text-sm truncate block" title={menu.name}>
                                                    {menu.name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 sm:hidden block truncate">
                                                    {(menu.availableDays || []).join(", ") || "Semua hari"}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap font-bold text-xs sm:text-sm text-slate-800">
                                        Rp {menu.price.toLocaleString('id-ID')}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-xs text-slate-500 hidden md:table-cell">{menu.description || '-'}</TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <div className="flex flex-wrap gap-1">
                                            {(menu.availableDays || []).map((day: string) => (
                                                <span key={day} className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                                                    {day.substring(0, 3)}
                                                </span>
                                            ))}
                                            {(!menu.availableDays || menu.availableDays.length === 0) && (
                                                <span className="text-xs text-muted-foreground">Semua hari</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-red-600 whitespace-nowrap hidden lg:table-cell">
                                        {menu.expiredDate ? new Date(menu.expiredDate).toLocaleDateString('id-ID') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50" onClick={() => handleEdit(menu)}>
                                                <Pencil className="h-3.5 w-3.5 text-blue-600" />
                                            </Button>
                                            <ConfirmButton
                                              title="Hapus Menu"
                                              description={`Apakah Anda yakin ingin menghapus menu "${menu.name}"? Data ini tidak dapat dikembalikan.`}
                                              onConfirm={() => handleDelete(menu.id)}
                                              confirmText="Hapus"
                                              variant="destructive"
                                            >
                                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50">
                                                  <Trash className="h-3.5 w-3.5 text-destructive" />
                                              </Button>
                                            </ConfirmButton>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
