"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Receipt, Clock, CheckCircle, XCircle, Loader2, AlertTriangle, Upload, CheckCircle2, PackageCheck } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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

    // Form konfirmasi diterima per-item
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [confirmOrder, setConfirmOrder] = useState<any>(null)
    const [confirmItemIds, setConfirmItemIds] = useState<string[]>([])
    const [confirming, setConfirming] = useState(false)

    // Form re-upload
    const [isReuploadOpen, setIsReuploadOpen] = useState(false)
    const [reuploadImage, setReuploadImage] = useState<string | null>(null)
    const [reuploadOrder, setReuploadOrder] = useState<any>(null)

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

    const handleConfirmItems = async () => {
        if (!confirmOrder) return
        if (confirmItemIds.length === 0) {
            toast.error("Pilih setidaknya satu menu untuk dikonfirmasi")
            return
        }
        setConfirming(true)
        try {
            const res = await fetch("/api/order", {
                method: "PATCH",
                body: JSON.stringify({ orderId: confirmOrder.id, itemIds: confirmItemIds })
            })
            if (res.ok) {
                const data = await res.json()
                toast.success(data.allDone ? "Semua makanan dikonfirmasi! Pesanan selesai." : "Konfirmasi berhasil disimpan.")
                setIsConfirmOpen(false)
                setConfirmItemIds([])
                fetchOrders()
            } else {
                toast.error("Gagal konfirmasi")
            }
        } catch {
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setConfirming(false)
        }
    }

    const handleReupload = async () => {
        if (!reuploadImage) return toast.error("Silakan pilih bukti transfer baru")

        setCancelling(true)
        try {
            const res = await fetch("/api/order", {
                method: "PATCH",
                body: JSON.stringify({
                    orderId: reuploadOrder.id,
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

                        // Items yang belum dikonfirmasi dan belum dibatalkan (kandidat konfirmasi)
                        const confirmableItems = (order.items || []).filter(
                            (i: any) => !i.receivedAt && i.cancelStatus !== 'APPROVED'
                        )
                        const hasConfirmable = order.status === 'PAID' && confirmableItems.length > 0
                            && (order.cancelStatus === 'NONE' || !order.cancelStatus)

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
                                            <Button size="sm" variant="destructive" className="w-fit gap-2 h-8 text-xs" onClick={() => { setReuploadOrder(order); setIsReuploadOpen(true) }}>
                                                <Upload className="h-3.5 w-3.5" />
                                                Kirim Ulang Bukti
                                            </Button>
                                        </div>
                                    )}

                                    {/* Daftar Item */}
                                    <div className="space-y-2">
                                        {(order.items || []).map((item: any, idx: number) => {
                                            const isReceived = !!item.receivedAt
                                            const isCancelled = item.cancelStatus === 'APPROVED'
                                            return (
                                                <div key={idx} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isReceived ? 'bg-green-50/60 border border-green-100' : isCancelled ? 'bg-red-50/40 border border-red-100 opacity-60' : 'bg-muted/40'}`}>
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
                                                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                                                        <p className="text-sm font-semibold">x{item.quantity}</p>
                                                        <p className="text-xs text-muted-foreground font-medium">Rp {((item.price + item.adminFee) * item.quantity).toLocaleString("id-ID")}</p>
                                                        {isReceived && (
                                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-0.5">
                                                                <CheckCircle2 className="h-3 w-3" /> Diterima
                                                            </span>
                                                        )}
                                                        {isCancelled && (
                                                            <span className="text-[10px] text-red-500 font-bold">Dibatalkan</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Footer & Aksi */}
                                    <div className="flex flex-col sm:flex-row justify-between items-center border-t pt-4 mt-2 gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Pembayaran</span>
                                            <span className="font-bold text-primary text-xl">Rp {order.totalAmount.toLocaleString("id-ID")}</span>
                                        </div>

                                        <div className="flex gap-2 w-full sm:w-auto mt-2">
                                            {/* Button Konfirmasi Diterima per-item */}
                                            {hasConfirmable && (
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white h-9 gap-2 shadow-sm font-bold"
                                                    onClick={() => {
                                                        setConfirmOrder(order)
                                                        // Pre-select semua item yang bisa dikonfirmasi
                                                        setConfirmItemIds(confirmableItems.map((i: any) => i.id))
                                                        setIsConfirmOpen(true)
                                                    }}
                                                >
                                                    <PackageCheck className="h-4 w-4" />
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

            {/* Modal Konfirmasi Diterima per-item */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PackageCheck className="h-5 w-5 text-green-600" />
                            Konfirmasi Makanan Diterima
                        </DialogTitle>
                        <DialogDescription>
                            Pilih makanan yang sudah kamu terima. Pesanan akan selesai otomatis jika semua item dikonfirmasi.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-4">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Makanan yang Diterima:</Label>
                        <div className="space-y-2 max-h-64 overflow-auto border rounded-lg p-2">
                            {confirmOrder?.items
                                ?.filter((i: any) => !i.receivedAt && i.cancelStatus !== 'APPROVED')
                                .map((item: any) => (
                                <div key={item.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-green-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        id={`confirm-item-${item.id}`}
                                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        checked={confirmItemIds.includes(item.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setConfirmItemIds([...confirmItemIds, item.id])
                                            } else {
                                                setConfirmItemIds(confirmItemIds.filter(id => id !== item.id))
                                            }
                                        }}
                                    />
                                    <label htmlFor={`confirm-item-${item.id}`} className="flex-1 cursor-pointer">
                                        <p className="text-sm font-medium">{item.menuName || "Menu"}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {item.vendorName} · {format(new Date(item.date), "EEEE, dd MMM", { locale: idLocale })}
                                        </p>
                                    </label>
                                    <span className="text-xs font-bold text-green-700">
                                        Rp {((item.price + item.adminFee) * item.quantity).toLocaleString("id-ID")}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground italic">
                            💡 Jika tidak dikonfirmasi, sistem akan otomatis mengonfirmasi setelah 1×24 jam dari jadwal pengiriman.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsConfirmOpen(false)}>Batal</Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 gap-2"
                            disabled={confirming || confirmItemIds.length === 0}
                            onClick={handleConfirmItems}
                        >
                            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Konfirmasi {confirmItemIds.length} Makanan
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

