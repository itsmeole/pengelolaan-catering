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
import { Loader2, ChefHat, CalendarDays, User, Utensils, CalendarClock } from "lucide-react"

export default function VendorOrdersPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'this_week' | 'next_week' | 'all'>('next_week')

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    try {
      const res = await fetch("/api/vendor/orders")
      if (res.ok) {
        setItems(await res.json())
      }
    } catch { /* Handle error */ }
    finally { setLoading(false) }
  }

  // Calculate date ranges
  const now = new Date()
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 })
  const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 })

  const filteredItems = items.filter(item => {
    const itemDate = parseISO(item.date)
    if (filter === 'this_week') {
      return isWithinInterval(itemDate, { start: thisWeekStart, end: thisWeekEnd })
    }
    if (filter === 'next_week') {
      return isWithinInterval(itemDate, { start: nextWeekStart, end: nextWeekEnd })
    }
    return true
  })

  // Get unique dates from filtered items
  const uniqueDates = Array.from(new Set(filteredItems.map(i => i.date.split('T')[0]))).sort()

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Daftar Masak</h2>
          <p className="text-muted-foreground">Jadwal persiapan menu berdasarkan pesanan siswa.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg w-fit border">
          <button 
            onClick={() => setFilter('this_week')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'this_week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Minggu Ini
          </button>
          <button 
            onClick={() => setFilter('next_week')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'next_week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Minggu Depan
          </button>
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Semua
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
          
          // Summary for the day
          const menuSummary = dateItems.reduce((acc: any, curr) => {
            const name = curr.menuName || 'Menu Terhapus'
            acc[name] = (acc[name] || 0) + curr.quantity
            return acc
          }, {})

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
                    <p className="text-xs text-muted-foreground">Total {dateItems.length} pesanan · {(Object.values(menuSummary) as number[]).reduce((a, b) => a + b, 0)} porsi</p>
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
                    {dateItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center border">
                              <Utensils className="h-5 w-5 text-slate-400" />
                            </div>
                            <span className="font-bold text-slate-800">{item.menuName || "Menu Terhapus"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-slate-400" />
                                <span className="font-medium">{item.order?.student?.name}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                            {item.order?.student?.class}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold text-blue-600 text-lg">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground italic">
                          {item.note || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
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
