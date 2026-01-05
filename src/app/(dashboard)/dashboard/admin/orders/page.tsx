"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [filterPayment, setFilterPayment] = useState("ALL")

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      const res = await fetch("/api/admin/orders")
      if (res.ok) {
        setOrders(await res.json())
      }
    } catch (e) {
      toast.error("Gagal memuat data pesanan")
    } finally {
      setLoading(false)
    }
  }

  async function confirmPayment(orderId: string) {
    if (!confirm("Konfirmasi pembayaran ini sebagai LUNAS?")) return

    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        body: JSON.stringify({ orderId, status: "PAID" })
      })

      if (res.ok) {
        toast.success("Pembayaran dikonfirmasi")
        fetchOrders() // Refresh
      } else {
        toast.error("Gagal update status")
      }
    } catch (e) {
      toast.error("Error sistem")
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filterStatus !== "ALL" && order.status !== filterStatus) return false;
    if (filterPayment === "PAY_LATER" && order.paymentMethod !== "CASH_PAY_LATER") return false;
    if (filterPayment === "TRANSFER" && order.paymentMethod !== "TRANSFER") return false;
    return true;
  })

  // Calculate totals for summary
  const totalPaidLater = filteredOrders.filter(o => o.paymentMethod === "CASH_PAY_LATER" && o.status === "PENDING").length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Data Pemesanan</h2>
          <p className="text-muted-foreground">Kelola status pembayaran dan pesanan siswa.</p>
        </div>
        {totalPaidLater > 0 && (
          <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-md font-bold">
            {totalPaidLater} Pesanan Pay Later Belum Lunas
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status Pembayaran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="PENDING">Belum Lunas (Pending)</SelectItem>
            <SelectItem value="PAID">Lunas (Paid)</SelectItem>
            <SelectItem value="COMPLETED">Selesai</SelectItem>
            <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Metode Pembayaran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Metode</SelectItem>
            <SelectItem value="PAY_LATER">Cash / Pay Later</SelectItem>
            <SelectItem value="TRANSFER">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Siswa</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Metode Bayar</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Tidak ada data pesanan.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id.slice(-8)}</TableCell>
                  <TableCell>
                    <div className="font-bold">{order.student?.name}</div>
                    <div className="text-xs text-muted-foreground">{order.student?.class}</div>
                  </TableCell>
                  <TableCell>{format(new Date(order.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    {order.paymentMethod === "CASH_PAY_LATER" ? (
                      <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">Pay Later</Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">Transfer</Badge>
                    )}
                  </TableCell>
                  <TableCell>Rp {order.totalAmount.toLocaleString("id-ID")}</TableCell>
                  <TableCell>
                    {order.status === "PAID" && <Badge className="bg-green-600 hover:bg-green-700">Lunas</Badge>}
                    {order.status === "PENDING" && <Badge variant="destructive">Belum Bayar</Badge>}
                    {order.status === "COMPLETED" && <Badge variant="secondary">Selesai</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {/* If Pay Later AND Pending, show confirm button */}
                    {order.status === "PENDING" && order.paymentMethod === "CASH_PAY_LATER" && (
                      <Button size="sm" onClick={() => confirmPayment(order.id)}>
                        Konfirmasi Bayar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
