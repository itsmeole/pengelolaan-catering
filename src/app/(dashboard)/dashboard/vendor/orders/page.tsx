"use client"

import { useEffect, useState } from "react"
import { format, isSameDay, startOfWeek, endOfWeek, addWeeks, isWithinInterval, parseISO } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ChefHat, CalendarDays, User, Utensils, CalendarClock, Download } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders"
import { cn } from "@/lib/utils"

export default function VendorOrdersPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'this_week' | 'next_week' | 'all'>('next_week')

  // Calculate date ranges
  const now = new Date()
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 })
  const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 })

  // Realtime listener for vendor orders
  useRealtimeOrders({
    role: "VENDOR",
    showToast: false, // Toast handled globally by RealtimeNotificationProvider in layout
    onOrderItemChanged: () => fetchItems(),
    onOrderUpdated: () => fetchItems(),
  })

  useEffect(() => {
    fetchItems()
  }, [filter])

  async function fetchItems() {
    setLoading(true)
    try {
      let url = "/api/vendor/orders"
      const params = new URLSearchParams()
      if (filter === 'this_week') {
        params.append('start', format(thisWeekStart, "yyyy-MM-dd"))
        params.append('end', format(thisWeekEnd, "yyyy-MM-dd"))
      } else if (filter === 'next_week') {
        params.append('start', format(nextWeekStart, "yyyy-MM-dd"))
        params.append('end', format(nextWeekEnd, "yyyy-MM-dd"))
      }
      
      const queryString = params.toString()
      if (queryString) {
        url += `?${queryString}`
      }

      const res = await fetch(url)
      if (res.ok) {
        setItems(await res.json())
      }
    } catch { /* Handle error */ }
    finally { setLoading(false) }
  }

  const filteredItems = items.filter(item => {
    const itemDate = parseISO(item.date)
    if (filter === 'this_week') {
      return isWithinInterval(itemDate, { start: thisWeekStart, end: thisWeekEnd })
    }
    if (filter === 'next_week') {
      return isWithinInterval(itemDate, { start: nextWeekStart, end: nextWeekEnd })
    }
    return true
  }).sort((a, b) => {
    // Sort utama: tanggal antar ascending
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    if (dateA !== dateB) return dateA - dateB
    // Sort sekunder: waktu order descending (terbaru di atas)
    const createdA = new Date(a.order?.createdAt || 0).getTime()
    const createdB = new Date(b.order?.createdAt || 0).getTime()
    return createdB - createdA
  })

  // Get unique dates from filtered items
  const uniqueDates = Array.from(new Set(filteredItems.map(i => i.date.split('T')[0]))).sort()

  const handleExportExcel = () => {
    if (filteredItems.length === 0) return toast.error("Tidak ada data untuk diekspor")
    
    // Siapkan array data object yang akan menjadi row di Excel
    const exportData = filteredItems.map((item) => {
        const dateStr = format(parseISO(item.date), "EEEE, dd MMMM yyyy", { locale: idLocale })
        const isCancelled = item.cancelStatus === 'APPROVED' || item.order?.status === 'CANCELLED'
        return {
            "Tanggal": dateStr,
            "Menu": item.menuName || "Menu Terhapus",
            "Siswa": item.order?.student?.name || "-",
            "Kelas": item.order?.student?.class || "-",
            "Jumlah Porsi": isCancelled ? 0 : item.quantity,
            "Status": isCancelled ? "DIBATALKAN / REFUND" : "AKTIF",
            "Catatan": item.note || "-"
        }
    })
    
    try {
        const worksheet = XLSX.utils.json_to_sheet(exportData)
        // Autoresizing lebar kolom (opsional tapi bagus)
        const colWidths = [
            { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 22 }, { wch: 25 }
        ]
        worksheet["!cols"] = colWidths
        
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Masak")
        
        let labelFilter = filter === 'this_week' ? 'Minggu_Ini' : filter === 'next_week' ? 'Minggu_Depan' : 'Semua'
        const fileName = `Daftar_Masak_Vendor_${labelFilter}_${format(new Date(), "ddMMyyyy")}.xlsx`
        
        XLSX.writeFile(workbook, fileName)
        toast.success("Berhasil mengunduh Excel!")
    } catch(e) {
        toast.error("Gagal membuat file excel")
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Daftar Masak</h2>
          <p className="text-muted-foreground text-sm">Kelola jadwal dan porsi menu katering per hari.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={() => setFilter('this_week')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'this_week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Minggu Ini
            </button>
            <button 
              onClick={() => setFilter('next_week')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'next_week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Minggu Depan
            </button>
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Semua
            </button>
          </div>
          
          <button 
            onClick={handleExportExcel}
            disabled={filteredItems.length === 0}
            title="Ekspor Excel"
            className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <ChefHat className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-medium text-slate-800">Tidak Ada Pesanan</p>
            <p className="text-sm text-slate-500 max-w-sm">
              {filter === 'next_week' ? "Belum ada pesanan masuk untuk minggu depan." : "Tidak ada jadwal masak di periode ini."}
            </p>
          </CardContent>
        </Card>
      ) : (
        uniqueDates.map((dateStr) => {
          const dateItems = filteredItems.filter(i => i.date.startsWith(dateStr))
          const date = new Date(dateStr)
          
          // Hanya hitung porsi aktif (bukan yang dibatalkan/direfund)
          const activeDateItems = dateItems.filter(i => i.cancelStatus !== 'APPROVED' && i.order?.status !== 'CANCELLED')
          
          // Summary for the day
          const menuSummary = activeDateItems.reduce((acc: any, curr) => {
            const name = curr.menuName || 'Menu Terhapus'
            acc[name] = (acc[name] || 0) + curr.quantity
            return acc
          }, {})
          const totalActivePortions = (Object.values(menuSummary) as number[]).reduce((a, b) => a + b, 0)

          return (
            <div key={dateStr} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">
                        {format(date, "EEEE, dd MMMM yyyy", { locale: idLocale })}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Total {activeDateItems.length} pesanan aktif · {totalActivePortions} porsi masak
                    </p>
                </div>
              </div>

              {/* Day Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(menuSummary).map(([name, qty]: [string, any]) => (
                      <Card key={name} className="bg-slate-50 border-none shadow-none">
                          <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center border">
                                      <Utensils className="h-4 w-4 text-slate-400" />
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700 truncate max-w-[120px]">{name}</span>
                              </div>
                              <span className="text-lg font-bold text-blue-600">{qty} porsi</span>
                          </CardContent>
                      </Card>
                  ))}
              </div>

              {/* Detailed Table */}
              <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-[280px]">Menu</TableHead>
                      <TableHead>Siswa</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead className="text-center">Jumlah</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dateItems.map((item) => {
                      const isItemCancelled = item.cancelStatus === 'APPROVED' || item.order?.status === 'CANCELLED'
                      return (
                        <TableRow key={item.id} className={isItemCancelled ? "bg-slate-50/80 opacity-60" : "hover:bg-slate-50/50 transition-colors"}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center border shrink-0">
                                <Utensils className="h-5 w-5 text-slate-400" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn("font-bold text-slate-800", isItemCancelled && "line-through text-slate-400")}>
                                    {item.menuName || "Menu Terhapus"}
                                  </span>
                                  {isItemCancelled && (
                                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                                      Batal / Refund
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-slate-400" />
                              <span className={cn("font-medium", isItemCancelled && "line-through text-slate-400")}>
                                {item.order?.student?.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                              {item.order?.student?.class}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("text-center font-bold text-lg", isItemCancelled ? "line-through text-slate-400" : "text-blue-600")}>
                            {isItemCancelled ? 0 : item.quantity}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground italic">
                            {item.note || "-"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
