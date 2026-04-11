"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Search, Utensils, CreditCard, ChevronRight, ChevronLeft, CheckCircle2, MessageSquare, Phone, Info } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

export default function InstantOrderPage() {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [selectedStudent, setSelectedStudent] = useState<any>(null)
    const [phone, setPhone] = useState("")
    
    const [menus, setMenus] = useState<any[]>([])
    const [selectedMenus, setSelectedMenus] = useState<Record<string, number>>({})
    
    const [paymentMethod, setPaymentMethod] = useState("CASH_PAY_LATER")
    const [proofImage, setProofImage] = useState<string | null>(null)
    const [orderSuccess, setOrderSuccess] = useState<any>(null)

    // Fetch Menus on Load
    useEffect(() => {
        fetch("/api/public/menus")
            .then(res => res.json())
            .then(data => setMenus(data))
    }, [])

    // Search Students
    useEffect(() => {
        if (searchQuery.length >= 3) {
            const delayDebounce = setTimeout(() => {
                fetch(`/api/public/students/search?q=${searchQuery}`)
                    .then(res => res.json())
                    .then(data => setSearchResults(data))
            }, 500)
            return () => clearTimeout(delayDebounce)
        } else {
            setSearchResults([])
        }
    }, [searchQuery])

    const handleNext = () => {
        if (step === 1) {
            if (!selectedStudent) {
                toast.error("Pilih identitas siswa terlebih dahulu")
                return
            }
            if (!phone || phone.trim().length < 10) {
                toast.error("Masukkan nomor WhatsApp yang valid (min. 10 digit)")
                return
            }
        }
        if (step === 2 && Object.keys(selectedMenus).length === 0) {
            toast.error("Pilih minimal satu menu")
            return
        }
        setStep(step + 1)
    }

    const handleBack = () => setStep(step - 1)

    const handleSubmit = async () => {
        if (paymentMethod === 'TRANSFER' && !proofImage) {
            toast.error("Silakan unggah bukti transfer terlebih dahulu")
            return
        }

        setLoading(true)
        try {
            const items = Object.entries(selectedMenus).map(([menuId, quantity]) => ({
                menuId, quantity
            }))

            const res = await fetch("/api/public/order/instan", {
                method: "POST",
                body: JSON.stringify({
                    studentId: selectedStudent.id,
                    phone,
                    items,
                    paymentMethod,
                    proofImage
                })
            })
            
            const data = await res.json()
            if (res.ok) {
                setOrderSuccess(data)
                setStep(4)
                toast.success("Pesanan berhasil dikirim!")
            } else {
                toast.error(data.error || "Gagal mengirim pesanan")
            }
        } catch (e) {
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setLoading(false)
        }
    }

    const totalAmount = menus.reduce((acc, menu) => {
        const qty = selectedMenus[menu.id] || 0
        return acc + (qty * (menu.price + 1000))
    }, 0)

    if (step === 4) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 space-y-6">
                    <div className="flex justify-center">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <CheckCircle2 className="h-12 w-12" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 text-center">Pesanan Berhasil!</h2>
                        <p className="text-slate-500 mt-2 text-center">Terima kasih sudah memesan. Pesanan Anda akan kami proses untuk jadwal minggu depan.</p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-left">
                        <div className="flex gap-3 text-blue-800">
                            <Info className="h-5 w-5 shrink-0 mt-0.5" />
                            <p className="text-sm">Untuk melihat riwayat pemesanan lengkap, silakan login ke akun siswa menggunakan NIS sebagai password.</p>
                        </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <Button className="w-full gap-2" variant="outline" onClick={() => window.open('https://wa.me/628123456789', '_blank')}>
                            <Phone className="h-4 w-4" /> Hubungi Admin
                        </Button>
                        <Button className="w-full" onClick={() => window.location.href = '/login'}>
                            Ke Halaman Login
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="flex flex-col items-center gap-2">
                        <Badge variant="secondary" className="px-3 py-1">Instant Order</Badge>
                        <img src="/logo-kujang.png" alt="Logo Pupuk Kujang" className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Go Catering Express</h1>
                    <p className="text-sm sm:text-lg text-slate-500 max-w-2xl mx-auto px-4">Pesan katering sekolah jadi jauh lebih mudah. Tanpa login, cukup cari nama siswa dan pilih menunya.</p>
                </div>

                {/* Stepper */}
                <div className="flex justify-center items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span className={step >= 1 ? "text-blue-600" : ""}>Identitas</span>
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className={step >= 2 ? "text-blue-600" : ""}>Pilih Menu</span>
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className={step >= 3 ? "text-blue-600" : ""}>Pembayaran</span>
                </div>

                {/* Step Content */}
                <Card className="border-none shadow-xl shadow-slate-200/50">
                    <CardHeader className="border-b bg-white rounded-t-xl py-4 sm:py-6">
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                            {step === 1 && <><Search className="h-5 w-5 text-blue-500" /> Identitas</>}
                            {step === 2 && <><Utensils className="h-5 w-5 text-blue-500" /> Pilih Menu</>}
                            {step === 3 && <><CreditCard className="h-5 w-5 text-blue-500" /> Pembayaran</>}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            {step === 1 && "Cari nama lengkap siswa untuk memulai."}
                            {step === 2 && "Pilih menu untuk jadwal minggu depan."}
                            {step === 3 && "Pilih cara Anda ingin membayar."}
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-8">
                        {step === 1 && (
                            <div className="space-y-6 max-w-lg mx-auto">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="Cari Nama Lengkap Siswa..." 
                                            className="pl-10 h-12"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    
                                    {searchResults.length > 0 && (
                                        <div className="border rounded-lg overflow-hidden divide-y bg-white shadow-sm">
                                            {searchResults.map((s) => (
                                                <button 
                                                    key={s.id}
                                                    onClick={() => {
                                                        setSelectedStudent(s)
                                                        setSearchQuery(s.name)
                                                        setSearchResults([])
                                                    }}
                                                    className={`w-full text-left p-4 hover:bg-blue-50 transition-colors flex justify-between items-center ${selectedStudent?.id === s.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-900">{s.name}</p>
                                                        <p className="text-sm text-slate-500">Kelas: {s.class} | NIS: {s.nis}</p>
                                                    </div>
                                                    {selectedStudent?.id === s.id && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {selectedStudent && (
                                        <div className="pt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <Label className="text-slate-700 font-semibold">Nomor WhatsApp</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                <Input 
                                                    placeholder="08xxxxxxxxxx" 
                                                    className="pl-10 h-12"
                                                    value={phone}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value.replace(/\D/g, "")
                                                        setPhone(newVal)
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400">Digunakan untuk konfirmasi pesanan oleh admin jika diperlukan.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-12">
                                {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
                                    .map(day => {
                                        const dayMenus = menus.filter(m => 
                                            m.availableDays?.includes(day) || 
                                            // Fallback if availableDays is empty/null, show in all week days? 
                                            // No, admin should define it. But for safety:
                                            (!m.availableDays && (day !== "Sabtu" && day !== "Minggu"))
                                        )
                                        
                                        if (dayMenus.length === 0) return null

                                        return (
                                            <div key={day} className="space-y-6">
                                                <div className="flex items-center gap-4">
                                                    <h3 className="text-xl font-extrabold text-slate-800 border-l-4 border-blue-500 pl-4">{day}</h3>
                                                    <Separator className="flex-1" />
                                                </div>
                                                
                                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                                    {dayMenus.map((menu) => (
                                                        <Card key={`${day}-${menu.id}`} className="overflow-hidden group hover:ring-2 hover:ring-blue-500 transition-all border-slate-200">
                                                            <div className="aspect-video relative overflow-hidden bg-slate-100">
                                                                <img 
                                                                    src={menu.imageUrl || "/placeholder-food.jpg"} 
                                                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                                                                />
                                                                <div className="absolute top-2 left-2">
                                                                    <Badge className="bg-white/90 text-blue-600 font-bold backdrop-blur-sm border-none shadow-sm">
                                                                        Rp {(menu.price + 1000).toLocaleString("id-ID")}
                                                                    </Badge>
                                                                </div>
                                                                <div className="absolute bottom-2 left-2">
                                                                    <Badge className="bg-blue-600/90 text-white border-none backdrop-blur-sm px-2 py-0.5 text-[10px] uppercase tracking-wider">
                                                                        {day}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <CardContent className="p-4 space-y-3">
                                                                <div>
                                                                    <h3 className="font-bold text-slate-900 line-clamp-1">{menu.name}</h3>
                                                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                                                        By: <span className="font-semibold text-blue-600">{menu.vendor?.vendorName}</span>
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2 pt-2">
                                                                    <div className="flex items-center gap-2 border rounded-full px-2 py-1 bg-slate-50">
                                                                        <Button 
                                                                            variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white"
                                                                            onClick={() => {
                                                                                const cur = selectedMenus[menu.id] || 0
                                                                                if (cur > 0) setSelectedMenus({...selectedMenus, [menu.id]: cur - 1})
                                                                            }}
                                                                        >-</Button>
                                                                        <span className="w-6 text-center font-bold text-slate-700">{selectedMenus[menu.id] || 0}</span>
                                                                        <Button 
                                                                            variant="ghost" size="icon" className="h-7 w-7 rounded-full text-blue-600 hover:bg-white"
                                                                            onClick={() => setSelectedMenus({...selectedMenus, [menu.id]: (selectedMenus[menu.id] || 0) + 1})}
                                                                        >+</Button>
                                                                    </div>
                                                                    <p className="text-xs font-semibold text-slate-400">Porsi</p>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        )}

                        {step === 3 && (
                            <div className="max-w-xl mx-auto space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-lg font-bold">Pilih Metode Pembayaran</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div 
                                            onClick={() => setPaymentMethod("CASH_PAY_LATER")}
                                            className={`cursor-pointer p-4 border-2 rounded-xl transition-all ${paymentMethod === 'CASH_PAY_LATER' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-slate-100'}`}
                                        >
                                            <p className="font-bold text-center">Bayar di Sekolah</p>
                                        </div>
                                        <div 
                                            onClick={() => setPaymentMethod("TRANSFER")}
                                            className={`cursor-pointer p-4 border-2 rounded-xl transition-all ${paymentMethod === 'TRANSFER' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-slate-100'}`}
                                        >
                                            <p className="font-bold text-center">Transfer Bank</p>
                                        </div>
                                    </div>
                                </div>

                                {paymentMethod === 'TRANSFER' && (
                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tujuan Transfer</p>
                                            <p className="font-bold text-lg text-slate-900">BANK BRI -  1249 0100 4332 503</p>
                                            <p className="text-sm font-semibold text-slate-600">A/N TAMA MUHAWA</p>
                                        </div>
                                        <Separator />
                                        <div className="space-y-4">
                                            <Label className="font-bold">Upload Bukti Transfer</Label>
                                            <div className="border-2 border-dashed rounded-lg p-6 text-center bg-white border-slate-300">
                                                {proofImage ? (
                                                    <div className="space-y-2">
                                                        <img src={proofImage} className="max-h-32 mx-auto rounded border" />
                                                        <Button variant="ghost" size="sm" onClick={() => setProofImage(null)}>Ganti File</Button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p className="text-sm text-slate-500">Klik untuk pilih gambar bukti bayar</p>
                                                        <Input 
                                                            type="file" accept="image/*" 
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0]
                                                                if (file) {
                                                                    const reader = new FileReader()
                                                                    reader.onloadend = () => setProofImage(reader.result as string)
                                                                    reader.readAsDataURL(file)
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-blue-600 text-white p-6 rounded-xl space-y-4 shadow-lg shadow-blue-200">
                                    <h4 className="font-bold text-center opacity-90">Ringkasan Pesanan</h4>
                                    <div className="space-y-2">
                                        {Object.entries(selectedMenus).map(([menuId, qty]) => {
                                            const menu = menus.find(m => m.id === menuId)
                                            return (
                                                <div key={menuId} className="flex justify-between text-sm">
                                                    <span>{menu?.name} (x{qty})</span>
                                                    <span className="font-bold">Rp {((menu?.price + 1000) * qty).toLocaleString("id-ID")}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <Separator className="bg-white/20" />
                                    <div className="flex justify-between items-center bg-white/10 p-3 rounded-lg">
                                        <p className="font-bold text-lg">Total Bayar</p>
                                        <p className="text-lg font-extrabold">Rp {totalAmount.toLocaleString("id-ID")}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    
                    <CardFooter className="bg-slate-50 rounded-b-xl border-t p-4 sm:p-6 flex flex-col-reverse sm:flex-row justify-between gap-3">
                        <Button 
                            variant="ghost" 
                            disabled={step === 1 || loading}
                            onClick={handleBack}
                            className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
                        >
                            <ChevronLeft className="h-4 w-4" /> Kembali
                        </Button>
                        
                        {step < 3 ? (
                            <Button className="px-8 gap-2 w-full sm:w-auto text-xs sm:text-sm h-10 sm:h-12" onClick={handleNext}>
                                Lanjut <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button 
                                className="px-6 sm:px-12 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-xs sm:text-sm h-10 sm:h-12" 
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? "Memproses..." : "Konfirmasi Pesanan"}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
