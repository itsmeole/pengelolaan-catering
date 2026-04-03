"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, History, User, CheckCircle2, XCircle } from "lucide-react"

export default function VendorHistoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    try {
      const res = await fetch("/api/vendor/history")
      if (res.ok) {
        setItems(await res.json())
      }
    } catch { /* Handle error */ }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Riwayat Transaksi</h2>
        <p className="text-muted-foreground">Catatan seluruh pesanan yang telah diproses.</p>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <History className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-medium text-slate-800">Belum Ada Riwayat</p>
            <p className="text-sm text-slate-500 max-w-sm">Pesanan yang sudah selesai atau lunas akan muncul di sini.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pesanan</TableHead>
                <TableHead>Siswa</TableHead>
                <TableHead className="text-right">Total Pendapatan</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium">
                    {format(new Date(item.date), "dd MMM yyyy", { locale: idLocale })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{item.menu?.name}</span>
                      <span className="text-xs text-muted-foreground">x{item.quantity} porsi</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-slate-400" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{item.order?.student?.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{item.order?.student?.class}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.order?.status === "PAID" && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Lunas
                        </Badge>
                    )}
                    {item.order?.status === "COMPLETED" && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Selesai
                        </Badge>
                    )}
                    {item.order?.status === "CANCELLED" && (
                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                           <XCircle className="mr-1 h-3 w-3" /> Dibatalkan
                        </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
