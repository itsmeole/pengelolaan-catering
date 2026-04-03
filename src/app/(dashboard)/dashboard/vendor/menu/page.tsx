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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash, Pencil } from "lucide-react"
import { toast } from "sonner"
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 1024 * 1024) {
                toast.error("File max 1MB")
                return
            }
            const reader = new FileReader()
            reader.onloadend = () => {
                form.setValue("imageUrl", reader.result as string)
            }
            reader.readAsDataURL(file)
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
        })
        setOpen(true)
    }

    async function handleDelete(id: string) {
        if (!confirm("Hapus menu ini?")) return
        try {
            const res = await fetch(`/api/vendor/menus/${id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Menu dihapus")
                fetchMenus()
            }
        } catch (error) {
            toast.error("Gagal menghapus")
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
                        <Button><Plus className="mr-2 h-4 w-4" /> Tambah Menu</Button>
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

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Harga</TableHead>
                            <TableHead>Deskripsi</TableHead>
                            <TableHead>Jadwal</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {menus.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada menu.</TableCell>
                            </TableRow>
                        )}
                        {menus.map((menu) => (
                            <TableRow key={menu.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {menu.imageUrl && <img src={menu.imageUrl} className="h-8 w-8 rounded object-cover" />}
                                        {menu.name}
                                    </div>
                                </TableCell>
                                <TableCell>Rp {menu.price.toLocaleString()}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{menu.description}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {(menu.availableDays || []).map((day: string) => (
                                            <span key={day} className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                                {day.substring(0, 3)}
                                            </span>
                                        ))}
                                        {(!menu.availableDays || menu.availableDays.length === 0) && (
                                            <span className="text-xs text-muted-foreground">Semua hari</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(menu)}>
                                            <Pencil className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(menu.id)}>
                                            <Trash className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
