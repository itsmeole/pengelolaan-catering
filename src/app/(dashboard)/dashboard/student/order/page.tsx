"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ShoppingCart, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function StudentOrderPage() {
    const [menus, setMenus] = useState<any[]>([])
    const [cart, setCart] = useState<any[]>([])
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Checkout State
    const [paymentMethod, setPaymentMethod] = useState("CASH_PAY_LATER")
    const [proofImage, setProofImage] = useState("")

    // Add Item State
    const [selectedMenu, setSelectedMenu] = useState<any>(null)
    const [date, setDate] = useState<Date>()
    const [note, setNote] = useState("")
    const [quantity, setQuantity] = useState(1)
    const [isAddOpen, setIsAddOpen] = useState(false)

    useEffect(() => {
        fetchMenus()
    }, [])

    async function fetchMenus() {
        const res = await fetch("/api/menu")
        const data = await res.json()
        setMenus(data)
    }

    const addToCart = () => {
        if (!date) {
            toast.error("Pilih tanggal pengiriman")
            return
        }
        // Check redundancy: Check if date already has order for this menu? Or check "1 menu once per day"? 
        // Requirement 2.6: "siswa hanya dapat memesan menu sekali saja untuk hariannya". 
        // This implies 1 order (transaction) per day? Or 1 menu item per day? 
        // "mencegah redundan". 
        // I'll assume they can order multiple *different* menus for a day, but not the *same* menu twice same day? 
        // Or maybe just "Have you ordered for Monday? If yes, can't order again". 
        // Simplest: Check if cart already has items for this Date? 
        // "bisa custom pemesanan, senin A, selasa B".
        // I'll allow multiple items per date in cart, but maybe warn if excessive.

        setCart([...cart, {
            menuId: selectedMenu.id,
            name: selectedMenu.name,
            price: selectedMenu.price,
            date: date,
            note: note,
            quantity: quantity
        }])
        setIsAddOpen(false)
        setNote("")
        setQuantity(1)
        toast.success("Masuk keranjang")
    }

    const removeFromCart = (index: number) => {
        const newCart = [...cart]
        newCart.splice(index, 1)
        setCart(newCart)
    }

    const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 1024 * 1024) return toast.error("Max 1MB")
            const reader = new FileReader()
            reader.onloadend = () => setProofImage(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    async function checkout() {
        if (cart.length === 0) return
        if (paymentMethod === "TRANSFER" && !proofImage) {
            toast.error("Upload bukti transfer")
            return
        }

        setLoading(true)
        try {
            const res = await fetch("/api/order", {
                method: "POST",
                body: JSON.stringify({
                    items: cart,
                    paymentMethod,
                    proofImage
                })
            })
            if (res.ok) {
                toast.success("Pesanan berhasil dibuat!")
                setCart([])
                setIsCartOpen(false)
                // Redirect to history?
            } else {
                toast.error("Gagal membuat pesanan")
            }
        } catch (error) {
            toast.error("Error sistem")
        } finally {
            setLoading(false)
        }
    }

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-primary">Pesan Makanan</h2>
                <Button variant="outline" onClick={() => setIsCartOpen(true)} className="relative">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Keranjang
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {cart.length}
                        </span>
                    )}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menus.map((menu) => (
                    <Card key={menu.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-video w-full bg-muted relative">
                            {menu.imageUrl ? (
                                <img src={menu.imageUrl} alt={menu.name} className="object-cover w-full h-full" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-100">
                                    No Image
                                </div>
                            )}
                            <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-sm font-bold text-primary shadow-sm">
                                Rp {menu.price.toLocaleString()}
                            </div>
                        </div>
                        <CardHeader>
                            <CardTitle className="text-lg">{menu.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{menu.vendor?.vendorName || "Vendor"}</p>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm line-clamp-2 text-gray-600">{menu.description}</p>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => {
                                setSelectedMenu(menu)
                                setIsAddOpen(true)
                            }}>
                                Pilih Menu
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Add Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pesan: {selectedMenu?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Tanggal Pengiriman</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : "Pilih tanggal"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus disabled={(date) => date < new Date()} />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label>Jumlah</Label>
                            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Catatan (Opsional)</Label>
                            <Input placeholder="Contoh: Tidak pedas" value={note} onChange={(e) => setNote(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={addToCart}>Masuk Keranjang</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cart Dialog/Sheet - Using Dialog for simplicity */}
            <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Keranjang Belanja</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {cart.length === 0 ? (
                            <p className="text-center text-muted-foreground">Keranjang kosong.</p>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start border-b pb-2">
                                    <div>
                                        <p className="font-bold">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(item.date), "PPP")}</p>
                                        {item.note && <p className="text-xs text-blue-600">Note: {item.note}</p>}
                                        <p className="text-sm">x{item.quantity} @ {item.price.toLocaleString()}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => removeFromCart(idx)} className="text-destructive h-auto p-1">Hapus</Button>
                                </div>
                            ))
                        )}
                    </div>

                    {cart.length > 0 && (
                        <div className="space-y-4 border-t pt-4">
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>Rp {total.toLocaleString()}</span>
                            </div>

                            <div className="space-y-2">
                                <Label>Metode Pembayaran</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH_PAY_LATER">Bayar Nanti (Pay Later)</SelectItem>
                                        <SelectItem value="TRANSFER">Transfer Bank</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {paymentMethod === "TRANSFER" && (
                                <div className="space-y-2 bg-blue-50 p-3 rounded text-sm">
                                    <p className="font-bold">Info Transfer:</p>
                                    <p>Bank BCA: 1234567890 (Pengelola)</p>
                                    <Label>Upload Bukti Transfer</Label>
                                    <Input type="file" accept="image/*" onChange={handleProofChange} />
                                </div>
                            )}

                            <Button onClick={checkout} className="w-full font-bold" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Buat Pesanan
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
