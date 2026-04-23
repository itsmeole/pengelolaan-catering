"use client"

import { useEffect, useRef, useState } from "react"
import { format, addDays, nextDay } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { ShoppingCart, Loader2, UtensilsCrossed } from "lucide-react"
import { uploadImage } from "@/lib/uploadImage"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"



// Map key API (bahasa Inggris) ke nama hari Indonesia
const DAY_KEY_MAP: Record<string, string> = {
    monday: "Senin",
    tuesday: "Selasa",
    wednesday: "Rabu",
    thursday: "Kamis",
    friday: "Jumat",
    saturday: "Sabtu",
    sunday: "Minggu",
}
const ALL_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

export default function StudentOrderPage() {
    const [menus, setMenus] = useState<any[]>([])
    // Cart: mulai kosong agar server & client sinkron, lalu isi dari localStorage setelah mount
    const [cart, setCart] = useState<any[]>([])
    const cartLoaded = useRef(false) // mencegah overwrite sebelum load selesai
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [workingDays, setWorkingDays] = useState<string[]>(ALL_DAYS)
    const [adminFee, setAdminFee] = useState<number>(1000)
    const [orderWeek, setOrderWeek] = useState<'THIS_WEEK' | 'NEXT_WEEK'>('THIS_WEEK')
    const [deadlineInfo, setDeadlineInfo] = useState("20:00")
    const [userRole, setUserRole] = useState<string>("STUDENT")
    const [activeDay, setActiveDay] = useState<string>(() => {
        const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" })
        return ALL_DAYS.find(d => d === todayName) || ALL_DAYS[0]
    })

    // Checkout State
    const [paymentMethod, setPaymentMethod] = useState("CASH_PAY_LATER")
    const [proofImage, setProofImage] = useState("")

    // Add Item State
    const [selectedMenu, setSelectedMenu] = useState<any>(null)
    const [note, setNote] = useState("")
    const [quantity, setQuantity] = useState(1)
    const [isAddOpen, setIsAddOpen] = useState(false)
    // Key keranjang unik per user, diset setelah profile dimuat
    const [cartKey, setCartKey] = useState<string | null>(null)

    useEffect(() => {
        // Cart akan dimuat di fetchUserProfile setelah user ID diketahui
        fetchMenus()
        fetchWorkingDays()
        fetchUserProfile()
        fetchAdminFee()
    }, [])

    async function fetchAdminFee() {
        try {
            const res = await fetch("/api/public/settings/admin-fee")
            const data = await res.json()
            if (data.fee !== undefined) setAdminFee(data.fee)
        } catch { }
    }

    // Simpan cart ke localStorage setiap kali berubah — HANYA setelah load awal selesai & cartKey tersedia
    useEffect(() => {
        if (!cartLoaded.current || !cartKey) return
        localStorage.setItem(cartKey, JSON.stringify(cart))
    }, [cart, cartKey])

    async function fetchMenus() {
        try {
            const res = await fetch("/api/student/menus")
            const data = await res.json()
            setMenus(Array.isArray(data) ? data : [])
        } catch {
            toast.error("Gagal memuat menu")
        }
    }

    async function fetchWorkingDays() {
        try {
            const res = await fetch("/api/admin/settings/working-days")
            const config = await res.json()
            
            setDeadlineInfo(config.deadlineTime || "20:00")

            // Filter hari sesuai config admin
            const active = ALL_DAYS.filter(dayId => {
                const key = Object.entries(DAY_KEY_MAP).find(([, v]) => v === dayId)?.[0]
                return key ? config[key] === true : false
            })
            setWorkingDays(active.length > 0 ? active : ALL_DAYS)
            // Jika tab aktif bukan hari kerja, pindah ke hari kerja pertama
            setActiveDay(prev => active.includes(prev) ? prev : (active[0] || ALL_DAYS[0]))
        } catch { }
    }

    async function fetchUserProfile() {
        try {
            const res = await fetch("/api/auth/me")
            const data = await res.json()
            setUserRole(data.role || "STUDENT")

            // Buat key keranjang unik per user agar tidak tercampur antar siswa
            if (data.id) {
                const key = `student_cart_${data.id}`
                setCartKey(key)
                try {
                    const saved = localStorage.getItem(key)
                    if (saved) setCart(JSON.parse(saved))
                } catch { /* abaikan */ }
                cartLoaded.current = true
            }
        } catch { }
    }

    const getDeliveryDate = (dayName: string, week: 'THIS_WEEK' | 'NEXT_WEEK') => {
        const dayMap: Record<string, number> = { Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 0 }
        const targetWeekday = dayMap[dayName] ?? 1
        const today = new Date()
        
        if (week === 'THIS_WEEK') {
            const currentDay = today.getDay()
            let diff = targetWeekday - currentDay
            return addDays(today, diff)
        } else {
            let deliveryDate = nextDay(today, targetWeekday as 0|1|2|3|4|5|6)
            if (today.getDay() === targetWeekday) {
                deliveryDate = addDays(today, 7)
            }
            return deliveryDate
        }
    }

    const checkIsAvailable = (deliveryDate: Date) => {
        const now = new Date()
        const deadline = new Date(deliveryDate)
        const [dHour, dMin] = deadlineInfo.split(":").map(Number)
        deadline.setHours(dHour, dMin, 0, 0)
        return now <= deadline
    }

    const addToCart = () => {
        if (!quantity || quantity < 1) {
            toast.error("Silakan isi jumlah porsi minimal 1")
            return
        }

        const deliveryDate = getDeliveryDate(activeDay, orderWeek)

        setCart([...cart, {
            menuId: selectedMenu.id,
            name: selectedMenu.name,
            price: selectedMenu.price + adminFee, // Mark up for student
            date: deliveryDate,
            note: note,
            quantity: quantity
        }])
        setIsAddOpen(false)
        setNote("")
        setQuantity(1)
        toast.success(`Ditambahkan untuk ${activeDay}, ${format(deliveryDate, "dd MMM yyyy", { locale: idLocale })}`)
    }

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index))
    }

    const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            toast.loading("Mengupload bukti transfer...", { id: 'upload-proof' })
            const url = await uploadImage(file, 'proofs')
            setProofImage(url)
            toast.success("Bukti transfer berhasil diupload", { id: 'upload-proof' })
        } catch (err: any) {
            toast.error(err.message || "Gagal upload bukti transfer", { id: 'upload-proof' })
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
                body: JSON.stringify({ items: cart, paymentMethod, proofImage })
            })
            if (res.ok) {
                toast.success("Pesanan berhasil dibuat!")
                setCart([])
                if (cartKey) localStorage.removeItem(cartKey)
                setIsCartOpen(false)
            } else {
                const data = await res.json()
                toast.error(data.error || "Gagal membuat pesanan")
            }
        } catch {
            toast.error("Error sistem")
        } finally {
            setLoading(false)
        }
    }

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    // Gunakan hari kerja dari config admin
    const DAYS_ORDER = workingDays
    const menuByDay: Record<string, any[]> = {}
    DAYS_ORDER.forEach(d => { menuByDay[d] = [] })
    menus.forEach((menu) => {
        const days: string[] = menu.availableDays || []
        if (days.length === 0) {
            DAYS_ORDER.forEach(d => menuByDay[d].push(menu))
        } else {
            days.forEach((d) => {
                if (menuByDay[d]) menuByDay[d].push(menu)
            })
        }
    })
    // Urutkan tiap hari berdasarkan nama vendor (A–Z)
    DAYS_ORDER.forEach(d => {
        menuByDay[d].sort((a, b) =>
            (a.vendorName || a.vendor?.vendorName || "").localeCompare(
                b.vendorName || b.vendor?.vendorName || "", "id", { sensitivity: "base" }
            )
        )
    })

    return (
        <div className="space-y-5">
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

            <Tabs value={orderWeek} onValueChange={(v) => setOrderWeek(v as 'THIS_WEEK' | 'NEXT_WEEK')} className="w-full mb-2">
                <TabsList className="grid w-full max-w-sm grid-cols-2">
                    <TabsTrigger value="THIS_WEEK">Untuk Minggu Ini</TabsTrigger>
                    <TabsTrigger value="NEXT_WEEK">Untuk Minggu Depan</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Tab Hari */}
            <div className="flex gap-2 flex-wrap border-b pb-3">
                {DAYS_ORDER.map((day) => (
                    <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                            activeDay === day
                                ? "bg-primary text-white shadow"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        {day}
                        {menuByDay[day].length > 0 && (
                            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeDay === day ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
                                {menuByDay[day].length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Grid Menu per Hari */}
            {menuByDay[activeDay].length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <UtensilsCrossed className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm">Tidak ada menu tersedia untuk hari <strong>{activeDay}</strong>.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {menuByDay[activeDay].map((menu) => (
                        <Card key={menu.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                            {/* Gambar */}
                            <div className="h-24 w-full bg-muted relative flex-shrink-0">
                                {menu.imageUrl ? (
                                    <img src={menu.imageUrl} alt={menu.name} className="object-cover w-full h-full" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-100 text-xs">
                                        No Image
                                    </div>
                                )}
                                <div className="absolute top-1.5 right-1.5 bg-white/90 px-1.5 py-0.5 rounded text-[11px] font-bold text-primary shadow-sm">
                                    Rp {(menu.price + adminFee).toLocaleString()}
                                </div>
                            </div>
                            {/* Konten */}
                            <div className="flex flex-col flex-1 p-2.5 gap-1">
                                <p className="font-semibold text-sm leading-tight line-clamp-1">{menu.name}</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">{menu.vendor?.vendorName || menu.vendor?.name || "Vendor"}</p>
                                <p className="text-[11px] text-gray-500 line-clamp-2 flex-1">{menu.description}</p>
                                <Button 
                                    size="sm" 
                                    className="w-full mt-2 text-xs h-7" 
                                    disabled={!checkIsAvailable(getDeliveryDate(activeDay, orderWeek)) && userRole === 'STUDENT'}
                                    onClick={() => {
                                        setSelectedMenu(menu)
                                        setIsAddOpen(true)
                                    }}
                                >
                                    {checkIsAvailable(getDeliveryDate(activeDay, orderWeek)) || userRole === 'ADMIN' ? "Pilih" : "Batas Waktu Habis"}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Dialog Tambah ke Keranjang */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pesan: {selectedMenu?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="rounded-md bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                            Pesanan ini akan diantar pada <strong>hari {activeDay} {orderWeek === 'THIS_WEEK' ? 'minggu ini' : 'minggu depan'}</strong> ({format(getDeliveryDate(activeDay, orderWeek), "dd MMM yyyy", { locale: idLocale })}).
                        </div>
                        <div className="grid gap-2">
                            <Label>Jumlah</Label>
                            <Input type="number" min={1} value={Number.isNaN(quantity) || quantity === 0 ? "" : quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} />
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

            {/* Dialog Keranjang */}
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
                                        <p className="text-sm">x{item.quantity} Rp {item.price.toLocaleString()}</p>
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
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH_PAY_LATER">Bayar Nanti (Pay Later)</SelectItem>
                                        <SelectItem value="TRANSFER">Transfer Bank</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {paymentMethod === "TRANSFER" && (
                                <div className="space-y-2 bg-blue-50 p-3 rounded text-sm">
                                    <p className="font-bold">Info Transfer:</p>
                                    <p>Bank BRI:  1249 0100 4332 503 (Bu Tama)</p>
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
