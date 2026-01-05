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
import { Plus, Trash } from "lucide-react"
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
})

export default function VendorMenuPage() {
    const [menus, setMenus] = useState<any[]>([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            price: "",
            imageUrl: "",
        },
    })

    useEffect(() => {
        fetchMenus()
    }, [])

    async function fetchMenus() {
        try {
            const res = await fetch("/api/menu")
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
            const res = await fetch("/api/menu", {
                method: "POST",
                body: JSON.stringify(values),
            })
            if (res.ok) {
                toast.success("Menu berhasil ditambahkan")
                setOpen(false)
                form.reset()
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

    async function handleDelete(id: string) {
        if (!confirm("Hapus menu ini?")) return
        try {
            const res = await fetch(`/api/menu/${id}`, { method: "DELETE" })
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
                <h2 className="text-2xl font-bold tracking-tight">Menu Saya</h2>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Tambah Menu</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Menciptakan Menu Baru</DialogTitle>
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
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(menu.id)}>
                                        <Trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
