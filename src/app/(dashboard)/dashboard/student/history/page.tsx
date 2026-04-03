"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Receipt, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
    PENDING:   { label: "Menunggu",  variant: "secondary",    icon: Clock },
    PAID:      { label: "Dibayar",   variant: "default",      icon: CheckCircle },
    COMPLETED: { label: "Selesai",   variant: "default",      icon: CheckCircle },
    CANCELLED: { label: "Dibatalkan",variant: "destructive",  icon: XCircle },
}

const PAYMENT_MAP: Record<string, string> = {
    CASH_PAY_LATER: "Bayar Nanti",
    TRANSFER: "Transfer Bank",
}

export default function StudentHistoryPage() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/order")
            .then(r => r.json())
            .then(data => setOrders(Array.isArray(data) ? data : []))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

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
                        return (
                            <Card key={order.id} className="overflow-hidden">
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
                                            {status.label}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">{PAYMENT_MAP[order.paymentMethod] || order.paymentMethod}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {/* Daftar Item */}
                                    <div className="space-y-2 mb-3">
                                        {(order.items || []).map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2">
                                                {item.menu?.imageUrl && (
                                                    <img src={item.menu.imageUrl} className="h-10 w-10 rounded object-cover flex-shrink-0" alt={item.menu?.name} />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.menu?.name || "Menu"}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.menu?.vendor?.vendorName || item.menu?.vendor?.name || "Vendor"} ·{" "}
                                                        {format(new Date(item.date), "EEE, dd MMM", { locale: idLocale })}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-semibold">x{item.quantity}</p>
                                                    <p className="text-xs text-muted-foreground">Rp {(item.price * item.quantity).toLocaleString("id-ID")}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Total */}
                                    <div className="flex justify-between items-center border-t pt-3">
                                        <span className="text-sm text-muted-foreground">Total</span>
                                        <span className="font-bold text-primary">Rp {order.totalAmount.toLocaleString("id-ID")}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
