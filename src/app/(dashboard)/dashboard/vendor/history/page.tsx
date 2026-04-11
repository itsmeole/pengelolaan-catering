"use client"

import { useEffect, useState } from "react"
import { format, startOfMonth, endOfMonth } from "date-fns"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, History, User, CheckCircle2, XCircle, Filter } from "lucide-react"

export default function VendorHistoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filter States
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)
    try {
      const res = await fetch(`/api/vendor/history?start=${startDate}&end=${endDate}`)
      if (res.ok) {
        setItems(await res.json())
        setCurrentPage(1) // Reset ke halaman 1 setiap ambil data baru
      }
    } catch { /* Handle error */ }
    finally { setLoading(false) }
  }

  const totalPages = Math.ceil(items.length / pageSize)
  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Riwayat Transaksi</h2>
          <p className="text-muted-foreground">Catatan seluruh pesanan yang telah diproses.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border shadow-sm w-full sm:w-fit">
          <div className="grid gap-1 flex-1 min-w-[120px]">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Mulai</Label>
            <Input type="date" className="h-9 w-full border-none focus-visible:ring-0 p-0 text-sm font-medium" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="w-[1px] h-8 bg-slate-200 mx-1 hidden sm:block" />
          <div className="grid gap-1 flex-1 min-w-[120px]">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Selesai</Label>
            <Input type="date" className="h-9 w-full border-none focus-visible:ring-0 p-0 text-sm font-medium" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <Button size="sm" onClick={fetchHistory} disabled={loading} className="w-full sm:w-auto h-9 mt-1 sm:mt-0">
             {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Filter className="h-4 w-4 sm:mr-0 mr-2" />} 
             <span className="sm:hidden">Filter Data</span>
          </Button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <History className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-medium text-slate-800">Belum Ada Riwayat</p>
            <p className="text-sm text-slate-500 max-w-sm">Pesanan yang sudah selesai atau lunas akan muncul di sini.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[140px] whitespace-nowrap">Tgl Pesan</TableHead>
                  <TableHead className="w-[140px] whitespace-nowrap">Tgl Antar</TableHead>
                  <TableHead className="min-w-[150px]">Menu</TableHead>
                  <TableHead className="min-w-[150px]">Siswa</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Pendapatan</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {paginatedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.order?.createdAt ? format(new Date(item.order.createdAt), "dd/MM/yy HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(item.date), "dd MMM yyyy", { locale: idLocale })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{item.menuName || item.menu?.name}</span>
                        <span className="text-xs text-muted-foreground">x{item.quantity} porsi</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-slate-400 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{item.order?.student?.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{item.order?.student?.class}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600 whitespace-nowrap">
                      Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.order?.status === "PAID" && (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none whitespace-nowrap">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Lunas
                          </Badge>
                      )}
                      {item.order?.status === "COMPLETED" && (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none whitespace-nowrap">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Selesai
                          </Badge>
                      )}
                      {item.order?.status === "CANCELLED" && (
                          <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 whitespace-nowrap">
                             <XCircle className="mr-1 h-3 w-3" /> Batal
                          </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 border-t">
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Lihat per:</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                  }}
                  className="text-xs border rounded p-1"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end items-center">
                <Button 
                  variant="outline" size="sm" className="h-8 text-xs shrink-0"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >Prev</Button>
                <div className="flex items-center gap-2 mx-2 text-xs font-medium whitespace-nowrap">
                    Hal {currentPage} dari {totalPages || 1}
                </div>
                <Button 
                  variant="outline" size="sm" className="h-8 text-xs shrink-0"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || totalPages === 0}
                >Next</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
