"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Receipt, Clock, CheckCircle, XCircle, Loader2, AlertTriangle, Upload, History } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
    PENDING: { label: "Menunggu", variant: "secondary", icon: Clock },
    PAID: { label: "Dibayar", variant: "default", icon: CheckCircle },
    COMPLETED: { label: "Selesai", variant: "outline", icon: CheckCircle },
    CANCELLED: { label: "Dibatalkan", variant: "destructive", icon: XCircle },
}

const PAYMENT_MAP: Record<string, string> = {
    CASH_PAY_LATER: "Bayar Nanti",
    TRANSFER: "Transfer Bank",
}

export default function StudentHistoryPage() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [cancelling, setCancelling] = useState(false)

    // Form pembatalan
    const [isCancelOpen, setIsCancelOpen] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [selectedItems, setSelectedItems] = useState<string[]>([])
    const [cancelReason, setCancelReason] = useState("VENDOR_LATE")
    const [otherReason, setOtherReason] = useState("")
    const [cancelImage, setCancelImage] = useState<string | null>(null)

    // Form re-upload
    const [isReuploadOpen, setIsReuploadOpen] = useState(false)
    const [reuploadImage, setReuploadImage] = useState<string | null>(null)

    const fetchOrders = () => {
        setLoading(true)
        fetch("/api/order")
            .then(r => r.json())
            .then(data => setOrders(Array.isArray(data) ? data : []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => setter(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const handleCancelSubmit = async () => {
        if (!selectedOrder) return
        if (selectedItems.length === 0) {
            toast.error("Mohon pilih setidaknya satu makanan untuk dibatalkan")
            return
        }
        if (cancelReason === 'OTHER' && !otherReason.trim()) {
            toast.error("Mohon isi alasan pembatalan Anda")
            return
        }
        if (cancelReason === 'DEFECTIVE_FOOD' && !cancelImage) {
            toast.error("Foto bukti wajib diunggah untuk keluhan cacat produksi")
            return
        }

        setCancelling(true)
        try {
            const res = await fetch("/api/order/cancel", {
                method: "POST",
                body: JSON.stringify({
                    orderId: selectedOrder.id,
                    itemIds: selectedItems,
                    reason: cancelReason,
                    otherReason: cancelReason === 'OTHER' ? otherReason : null,
                    cancelImage
                })
            })
            if (res.ok) {
                toast.success("Pengajuan pembatalan terkirim. Menunggu konfirmasi Admin.")
                setIsCancelOpen(false)
                setSelectedItems([])
                setOtherReason("")
                fetchOrders()
            }
        } catch (e) {
            toast.error("Gagal mengirim pengajuan")
        } finally {
            setCancelling(false)
        }
    }

    const handleReupload = async () => {
        if (!reuploadImage) return toast.error("Silakan pilih bukti transfer baru")

        setCancelling(true)
        try {
            const res = await fetch("/api/order", {
                method: "PATCH",
                body: JSON.stringify({
                    orderId: selectedOrder.id,
                    proofImage: reuploadImage
                })
            })
            if (res.ok) {
                toast.success("Bukti transfer berhasil dikirim ulang")
                setIsReuploadOpen(false)
                fetchOrders()
            }
        } catch (e) {
            toast.error("Gagal mengirim bukti")
        } finally {
            setCancelling(false)
        }
    }

    const handleCompleteOrder = async (orderId: string) => {
        setLoading(true)
        try {
            const res = await fetch("/api/order", {
                method: "PATCH",
                body: JSON.stringify({
                    orderId,
                    status: 'COMPLETED' // Status khusus untuk penyelesaian mandiri
                })
            })
            if (res.ok) {
                toast.success("Pesanan selesai! Terima kasih sudah memesan.")
                fetchOrders()
            }
        } catch (e) {
            toast.error("Gagal menyelesaikan pesanan")
        } finally {
            setLoading(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )

    return (
        <div className="space-y-5">
            <h2 className="text-2xl font-bold tracking-tight text-primary">Riwayat Pesanan</h2>

            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                    <Receipt className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm">Belum ada riwayat pesanan.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => {
                        const status = STATUS_MAP[order.status] || STATUS_MAP.PENDING
                        const StatusIcon = status.icon
                        const isCancelPending = order.cancelStatus === 'PENDING'

                        return (
                            <Card key={order.id} className="overflow-hidden border-2 transition-all hover:border-primary/20">
                                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-sm font-mono text-muted-foreground">
                                            #{order.id.substring(0, 8).toUpperCase()}
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {format(new Date(order.createdAt), "dd MMMM yyyy, HH:mm", { locale: idLocale })}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <Badge variant={status.variant} className="flex items-center gap-1">
                                            <StatusIcon className="h-3 w-3" />
                                            {isCancelPending ? "Menunggu Pembatalan" : (order.status === 'COMPLETED' ? "Pesanan Diterima" : status.label)}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">{PAYMENT_MAP[order.paymentMethod] || order.paymentMethod}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-4">
                                    {/* Alert Penolakan Bukti */}
                                    {order.isProofInvalid && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-red-700 text-sm font-semibold">
                                                <AlertTriangle className="h-4 w-4" />
                                                Bukti Transfer Ditolak
                                            </div>
                                            <p className="text-xs text-red-600">Alasan: {order.rejectionReason}</p>
                                            <Button size="sm" variant="destructive" className="w-fit gap-2 h-8 text-xs" onClick={() => { setSelectedOrder(order); setIsReuploadOpen(true) }}>
                                                <Upload className="h-3.5 w-3.5" />
                                                Kirim Ulang Bukti
                                            </Button>
                                        </div>
                                    )}

                                    {/* Daftar Item */}
                                    <div className="space-y-2">
                                        {(order.items || []).map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2">
                                                {item.menu?.imageUrl && (
                                                    <img src={item.menu.imageUrl} className="h-10 w-10 rounded object-cover flex-shrink-0" alt={item.menuName} />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.menuName || "Menu"}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.vendorName || "Vendor"} ·{" "}
                                                        {format(new Date(item.date), "EEE, dd MMM", { locale: idLocale })}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-semibold">x{item.quantity}</p>
                                                    <p className="text-xs text-muted-foreground font-medium">Rp {((item.price + item.adminFee) * item.quantity).toLocaleString("id-ID")}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer & Aksi */}
                                    <div className="flex flex-col sm:flex-row justify-between items-center border-t pt-4 mt-2 gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Pembayaran</span>
                                            <span className="font-bold text-primary text-xl">Rp {order.totalAmount.toLocaleString("id-ID")}</span>
                                        </div>

                                        <div className="flex gap-2 w-full sm:w-auto mt-2">
                                            {/* Button Batalkan - Hanya jika belum tuntas/batal */}
                                            {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (order.cancelStatus === 'NONE' || !order.cancelStatus) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-200 hover:bg-red-50 h-9 font-medium"
                                                    onClick={() => { 
                                                        setSelectedOrder(order); 
                                                        setCancelReason("VENDOR_LATE"); 
                                                        setCancelImage(null);
                                                        setOtherReason("");
                                                        // Default: Pilih semua item
                                                        setSelectedItems(order.items.map((i: any) => i.id));
                                                        setIsCancelOpen(true); 
                                                    }}
                                                >
                                                    Ajukan Batal
                                                </Button>
                                            )}

                                            {/* Button Konfirmasi Diterima - Muncul jika sudah dibayar */}
                                            {order.status === 'PAID' && (order.cancelStatus === 'NONE' || !order.cancelStatus) && (
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white h-9 gap-2 shadow-sm font-bold"
                                                    onClick={() => handleCompleteOrder(order.id)}
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                    Konfirmasi Diterima
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {isCancelPending && (
                                      <p className="text-[11px] text-orange-600 bg-orange-50 p-2 rounded border border-orange-100 italic">
                                        Pengembalian uang akan segera dilakukan setelah disetujui, silakan hubungi pengelola catering di sekolah untuk info lebih lanjut.
                                      </p>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Modal Pembatalan */}
            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ajukan Pembatalan</DialogTitle>
                        <DialogDescription>
                            Pilih makanan yang ingin dibatalkan. Dana akan dikembalikan setelah disetujui Admin.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        {/* Pilih Item Makanan */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Pilih Makanan yang Dibatalkan:</Label>
                            <div className="space-y-2 max-h-48 overflow-auto border rounded-lg p-2">
                                {selectedOrder?.items?.map((item: any) => (
                                    <div key={item.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            id={`item-${item.id}`}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={selectedItems.includes(item.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedItems([...selectedItems, item.id]);
                                                } else {
                                                    setSelectedItems(selectedItems.filter(id => id !== item.id));
                                                }
                                            }}
                                        />
                                        <label htmlFor={`item-${item.id}`} className="flex-1 text-sm font-medium cursor-pointer">
                                            {item.menuName || "Menu"}
                                            <span className="block text-[10px] text-muted-foreground font-normal">
                                                {format(new Date(item.date), "EEEE, dd MMM", { locale: idLocale })}
                                            </span>
                                        </label>
                                        <span className="text-xs font-bold">Rp {(item.price + item.adminFee).toLocaleString("id-ID")}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Alasan Pembatalan</Label>
                            <Select value={cancelReason} onValueChange={setCancelReason}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih alasan..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VENDOR_LATE">Vendor Terlambat Datang</SelectItem>
                                    <SelectItem value="DEFECTIVE_FOOD">Makanan Cacat Produksi (Butuh Foto)</SelectItem>
                                    <SelectItem value="OTHER">Alasan Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {cancelReason === 'OTHER' && (
                            <div className="space-y-2">
                                <Label>Detail Alasan</Label>
                                <Input 
                                    placeholder="Misal: Rasa makanan kurang segar..." 
                                    value={otherReason} 
                                    onChange={(e) => setOtherReason(e.target.value)} 
                                />
                            </div>
                        )}

                        {cancelReason === 'DEFECTIVE_FOOD' && (
                            <div className="space-y-2">
                                <Label>Foto Bukti Cacat Produksi</Label>
                                <Input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setCancelImage)} />
                                {cancelImage && <img src={cancelImage} className="mt-2 h-32 w-full object-cover rounded-md" alt="Preview" />}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCancelOpen(false)}>Kembali</Button>
                        <Button variant="destructive" disabled={cancelling} onClick={handleCancelSubmit}>
                            {cancelling ? "Mengirim..." : "Kirim Pengajuan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Re-upload Bukti */}
            <Dialog open={isReuploadOpen} onOpenChange={setIsReuploadOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Unggah Ulang Bukti Transfer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">Silakan unggah bukti transfer yang valid untuk melanjutkan proses pesanan.</p>
                        <div className="space-y-2">
                            <Label>Bukti Transfer Baru</Label>
                            <Input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setReuploadImage)} />
                            {reuploadImage && <img src={reuploadImage} className="mt-2 h-48 w-full object-cover rounded-md" alt="Preview" />}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsReuploadOpen(false)}>Tutup</Button>
                        <Button disabled={cancelling} onClick={handleReupload}>
                            {cancelling ? "Mengirim..." : "Kirim Bukti Baru"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

