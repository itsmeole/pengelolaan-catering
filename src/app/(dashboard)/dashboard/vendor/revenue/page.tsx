"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { FileSpreadsheet, FileText, Filter, TrendingUp, Wallet, Utensils, Download, Loader2 as Loader2Icon } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function VendorRevenuePage() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Pagination states for the details table
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    setLoading(true)
    try {
      const res = await fetch(`/api/vendor/reports?start=${startDate}&end=${endDate}`)
      if (res.ok) setData(await res.json())
    } catch (e) {
      toast.error("Gagal memuat laporan")
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val)

  function downloadExcel() {
    if (!data) return
    const wsData = [
      ["Laporan Pendapatan Vendor"],
      ["Periode", `${startDate} s/d ${endDate}`],
      [""],
      ["Total Porsi", data.summary.totalPortions],
      ["Total Omzet (Kotor)", data.summary.grossRevenue],
      ["Pendapatan Bersih (Setelah Potong Admin)", data.summary.netRevenue],
      [""],
      [""],
      ["Rincian Penjualan"],
      ["Tgl Pesan", "Tgl Antar", "Siswa", "Kelas", "Menu", "Qty", "Harga Jual", "Total Kotor", "Fee Admin", "Penghasilan Bersih", "Status"]
    ]
    
    data.details.forEach((d: any) => {
        wsData.push([
            d.processedAt ? format(new Date(d.processedAt), "dd/MM/yyyy HH:mm") : "-",
            d.date,
            d.studentName,
            d.studentClass,
            d.itemName,
            d.quantity,
            d.totalPrice / d.quantity,
            d.refundStatus === 'APPROVED' ? 0 : d.totalPrice,
            d.refundStatus === 'APPROVED' ? 0 : d.adminFee,
            d.refundStatus === 'APPROVED' ? 0 : d.netIncome,
            d.refundStatus === 'APPROVED' ? 'REFUND' : 'SUKSES'
        ])
    })

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Pendapatan")
    XLSX.writeFile(wb, `Pendapatan_Vendor_${startDate}_${endDate}.xlsx`)
    toast.success("Excel berhasil didownload")
  }

  function downloadPDF() {
    if (!data) return
    const doc = new jsPDF()
    doc.setFontSize(18); doc.text("Laporan Pendapatan Vendor", 14, 20)
    doc.setFontSize(11); doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 30)
    
    const summaryData = [
        ['Total Porsi Terjual', `${data.summary.totalPortions} Porsi`],
        ['Total Omzet Kotor', formatMoney(data.summary.grossRevenue)],
        ['Total Pendapatan Bersih', formatMoney(data.summary.netRevenue)]
    ]
    autoTable(doc, { startY: 40, head: [['Kategori', 'Nilai']], body: summaryData })

    // Insert subtitle for table
    const finalY = (doc as any).lastAutoTable.finalY || 40
    doc.setFontSize(14)
    doc.text("Rincian Penjualan", 14, finalY + 15)

    const tableData = data.details.map((d: any) => [
      d.processedAt ? format(new Date(d.processedAt), "dd/MM/yy HH:mm") : "-",
      d.date, 
      d.studentName,
      d.itemName, 
      d.quantity, 
      d.refundStatus === 'APPROVED' ? 'Rp 0' : formatMoney(d.totalPrice), 
      d.refundStatus === 'APPROVED' ? 'Rp 0' : formatMoney(d.netIncome),
      d.refundStatus === 'APPROVED' ? 'REFUND' : 'SUKSES'
    ])
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Tgl Pesan', 'Tgl Antar', 'Siswa', 'Menu', 'Qty', 'Kotor', 'Bersih', 'Status']],
      body: tableData,
      headStyles: { fillColor: [59, 130, 246] }, // Biru profesional
    })
    doc.save(`Pendapatan_Vendor_${startDate}_${endDate}.pdf`)
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Date Filter */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Analisis Pendapatan</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Monitor penghasilan bersih Anda setelah dikurangi biaya admin.</p>
        </div>
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 bg-white p-2 sm:p-2.5 rounded-xl border shadow-sm w-full md:w-auto">
          <div className="grid gap-0.5 flex-1 min-w-0">
            <Label className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500">Mulai</Label>
            <Input 
              type="date" 
              className="h-8 sm:h-9 w-full sm:w-32 md:w-36 border-none focus-visible:ring-0 p-0 text-xs sm:text-sm" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </div>
          <div className="w-[1px] h-7 sm:h-8 bg-slate-200 mx-1 sm:mx-2 shrink-0" />
          <div className="grid gap-0.5 flex-1 min-w-0">
            <Label className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500">Selesai</Label>
            <Input 
              type="date" 
              className="h-8 sm:h-9 w-full sm:w-32 md:w-36 border-none focus-visible:ring-0 p-0 text-xs sm:text-sm" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>
          <Button size="sm" onClick={fetchReports} disabled={loading} className="h-8 w-8 sm:h-9 sm:w-9 p-0 shrink-0 ml-1">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-none shadow-sm bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium opacity-90">Total Pendapatan Bersih</CardTitle>
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="text-2xl sm:text-3xl font-bold tracking-tight truncate" title={formatMoney(data.summary.netRevenue)}>
                  {formatMoney(data.summary.netRevenue)}
                </div>
                <p className="text-[11px] sm:text-xs opacity-80 mt-1">Estimasi uang yang Anda terima</p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Total Porsi Terjual</CardTitle>
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-50 flex items-center justify-center">
                  <Utensils className="h-4 w-4 text-slate-400" />
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="text-2xl sm:text-3xl font-bold text-slate-800">{data.summary.totalPortions} <span className="text-base sm:text-lg font-normal text-muted-foreground">Porsi</span></div>
                <p className="text-[11px] sm:text-xs text-green-600 font-medium mt-1">Menu telah diproses</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm sm:col-span-2 lg:col-span-1">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Omzet Kotor</CardTitle>
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-50 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-slate-400" />
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight truncate" title={formatMoney(data.summary.grossRevenue)}>
                  {formatMoney(data.summary.grossRevenue)}
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Total pembayaran siswa</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart and Top Menu */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 min-w-0">
        {/* Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <CardTitle className="text-base sm:text-lg">Tren Penghasilan</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Grafik harian pendapatan bersih Anda.</CardDescription>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button variant="outline" size="sm" onClick={downloadExcel} className="h-8 px-2.5 sm:px-3 text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 sm:mr-1.5 text-green-600" />
                  <span className="hidden xs:inline sm:inline">Excel</span>
                </Button>
                <Button variant="outline" size="sm" onClick={downloadPDF} className="h-8 px-2.5 sm:px-3 text-xs">
                  <FileText className="h-3.5 w-3.5 sm:mr-1.5 text-red-600" />
                  <span className="hidden xs:inline sm:inline">PDF</span>
                </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2">
            <div className="w-full h-[280px] sm:h-[350px] min-w-0">
              {data && data.chart && data.chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "dd MMM")} fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} width={45} tickFormatter={(val) => `Rp${val >= 1000 ? val / 1000 + 'k' : val}`} />
                      <Tooltip 
                          cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px'}}
                          formatter={(val: any) => [formatMoney(val), "Pendapatan Bersih"]} 
                      />
                      <Bar dataKey="income" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="flex items-center justify-center h-full text-xs sm:text-sm text-muted-foreground italic">Belum ada data untuk periode ini.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Items Table */}
        <Card className="border-none shadow-sm min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-base sm:text-lg">Top Menu</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Item paling laris periode ini.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2">
                {data && data.details && data.details.length > 0 ? (
                    <div className="space-y-3">
                        {Object.entries(data.details.reduce((acc: any, curr: any) => {
                            acc[curr.itemName] = (acc[curr.itemName] || 0) + curr.quantity
                            return acc
                        }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([name, qty]: [any, any], idx: number) => (
                            <div key={name} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="h-7 w-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                        #{idx + 1}
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-slate-700 truncate" title={name}>{name}</span>
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-blue-600 shrink-0 bg-blue-50/60 px-2 py-0.5 rounded">{qty} porsi</span>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-center text-xs sm:text-sm text-muted-foreground py-8">Belum ada data penjualan.</p>}
            </CardContent>
        </Card>
      </div>

      {/* Transaction Details Table & Mobile Card List */}
      {data && data.details && (
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">Rincian Penjualan</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Daftar transaksi per porsi menu.</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                Total: {data.details.length} transaksi
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile View: Card List */}
            <div className="block md:hidden divide-y divide-slate-100 border-t">
              {data.details.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">Tidak ada transaksi</div>
              ) : (
                data.details.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item: any, idx: number) => {
                  const isCancelled = item.refundStatus === 'APPROVED';
                  return (
                    <div key={idx} className={`p-3.5 space-y-2 transition-colors ${isCancelled ? 'bg-red-50/20' : 'bg-white'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>Antar: <strong className="text-slate-700">{item.date}</strong></span>
                        </div>
                        {isCancelled ? (
                          <Badge variant="destructive" className="text-[9px] uppercase font-bold py-0 h-5">Refund</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] uppercase font-bold text-green-700 bg-green-50 border-green-200 py-0 h-5">Terkirim</Badge>
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold text-slate-800 leading-snug line-clamp-1 ${isCancelled ? 'line-through text-slate-400' : ''}`}>
                            {item.itemName}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {item.studentName} <span className="text-[10px] text-slate-400 uppercase font-medium">({item.studentClass})</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-sm font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-blue-600'}`}>
                            {isCancelled ? '-' : formatMoney(item.netIncome)}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-medium">
                            {item.quantity} porsi
                          </div>
                        </div>
                      </div>

                      {item.processedAt && (
                        <div className="text-[10px] text-slate-400">
                          Dipesan: {format(new Date(item.processedAt), "dd/MM/yyyy HH:mm")}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden md:block border-t max-h-[450px] overflow-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="pl-6 text-xs">Tgl Pesan</TableHead>
                    <TableHead className="text-xs">Tgl Antar</TableHead>
                    <TableHead className="text-xs">Siswa</TableHead>
                    <TableHead className="text-xs">Menu</TableHead>
                    <TableHead className="text-right text-xs">Qty</TableHead>
                    <TableHead className="text-right text-xs">Penghasilan</TableHead>
                    <TableHead className="text-center pr-6 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.details.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item: any, idx: number) => {
                    const isCancelled = item.refundStatus === 'APPROVED';

                    return (
                      <TableRow key={idx} className={`transition-colors border-b hover:bg-slate-50/50 ${isCancelled ? 'bg-red-50/30 text-slate-400' : ''}`}>
                        <TableCell className="pl-6 py-3.5 text-[11px] text-muted-foreground whitespace-nowrap">
                            {item.processedAt ? format(new Date(item.processedAt), "dd/MM/yyyy HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="py-3.5 font-medium text-xs whitespace-nowrap">{item.date}</TableCell>
                        <TableCell className="py-3.5 max-w-[160px]">
                            <div className="flex flex-col">
                                <span className="font-medium text-xs text-slate-800 truncate" title={item.studentName}>{item.studentName}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{item.studentClass}</span>
                            </div>
                        </TableCell>
                        <TableCell className="py-3.5 font-medium text-xs max-w-[180px]">
                          <span className={`truncate block ${isCancelled ? 'line-through text-slate-400' : ''}`} title={item.itemName}>
                            {item.itemName}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 text-right text-xs font-semibold">{item.quantity}</TableCell>
                        <TableCell className="py-3.5 text-right text-xs font-bold text-blue-600">
                            {isCancelled ? '-' : formatMoney(item.netIncome)}
                        </TableCell>
                        <TableCell className="py-3.5 text-center pr-6">
                          {isCancelled ? (
                            <Badge variant="destructive" className="text-[9px] uppercase font-bold py-0 h-5">Refund</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[9px] uppercase font-bold text-green-700 bg-green-50 border-green-200 py-0 h-5">Terkirim</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 sm:p-4 border-t gap-3">
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Baris:</span>
                  <select 
                    value={pageSize} 
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="text-xs border rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="sm:hidden text-xs font-medium text-muted-foreground">
                  Hal {currentPage} dari {Math.ceil(data.details.length / pageSize) || 1}
                </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
                <Button 
                  variant="outline" size="sm" className="h-8 text-xs flex-1 sm:flex-initial px-3"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >Sebelumnya</Button>
                <div className="hidden sm:flex items-center gap-1 mx-2 text-xs font-medium text-muted-foreground">
                    Hal {currentPage} dari {Math.ceil(data.details.length / pageSize) || 1}
                </div>
                <Button 
                  variant="outline" size="sm" className="h-8 text-xs flex-1 sm:flex-initial px-3"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(data.details.length / pageSize), p + 1))}
                  disabled={currentPage >= Math.ceil(data.details.length / pageSize) || data.details.length === 0}
                >Berikutnya</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}

function Loader2({ className }: { className?: string }) {
    return <Loader2Icon className={`animate-spin ${className}`} />
}
