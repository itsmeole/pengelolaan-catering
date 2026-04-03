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
    const summary = [
      ["Laporan Pendapatan Vendor"],
      ["Periode", `${startDate} s/d ${endDate}`],
      [""],
      ["Total Porsi", data.summary.totalPortions],
      ["Total Omzet (Kotor)", data.summary.grossRevenue],
      ["Pendapatan Bersih (Setelah Potong Admin)", data.summary.netRevenue]
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summary)
    
    const details = data.details.map((d: any) => ({
      Tanggal: d.date,
      Siswa: d.studentName,
      Kelas: d.studentClass,
      Menu: d.itemName,
      Qty: d.quantity,
      HargaJual: d.totalPrice / d.quantity,
      TotalKotor: d.totalPrice,
      FeeAdmin: d.adminFee,
      PenghasilanBersih: d.netIncome
    }))
    const wsDetails = XLSX.utils.json_to_sheet(details)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan")
    XLSX.utils.book_append_sheet(wb, wsDetails, "Detail Penjualan")
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

    const tableData = data.details.map((d: any) => [d.date, d.itemName, d.quantity, formatMoney(d.totalPrice), formatMoney(d.netIncome)])
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Tanggal', 'Menu', 'Qty', 'Kotor', 'Bersih']],
      body: tableData,
    })
    doc.save(`Pendapatan_Vendor_${startDate}_${endDate}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Analisis Pendapatan</h2>
          <p className="text-muted-foreground">Monitor penghasilan bersih Anda setelah dikurangi biaya admin.</p>
        </div>
        <div className="flex items-end gap-2 bg-white p-3 rounded-xl border shadow-sm">
          <div className="grid gap-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Mulai</Label>
            <Input type="date" className="h-9 w-36 border-none focus-visible:ring-0 p-0" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="w-[1px] h-8 bg-slate-200 mx-2" />
          <div className="grid gap-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Selesai</Label>
            <Input type="date" className="h-9 w-36 border-none focus-visible:ring-0 p-0" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <Button size="sm" onClick={fetchReports} disabled={loading} className="ml-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm bg-blue-600 text-white">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium opacity-80">Total Pendapatan Bersih</CardTitle>
                <Wallet className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{formatMoney(data.summary.netRevenue)}</div>
                <p className="text-xs opacity-70 mt-1">Estimasi uang yang Anda terima</p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Total Porsi Terjual</CardTitle>
                <Utensils className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-slate-800">{data.summary.totalPortions}</div>
                <p className="text-xs text-muted-foreground mt-1 text-green-600 font-medium">Menu telah diproses</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Omzet Kotor</CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-slate-800">{formatMoney(data.summary.grossRevenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total pembayaran siswa</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Tren Penghasilan</CardTitle>
                <CardDescription>Grafik harian pendapatan bersih Anda.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadExcel}><FileSpreadsheet className="h-4 w-4 mr-2" /> Excel</Button>
                <Button variant="outline" size="sm" onClick={downloadPDF}><FileText className="h-4 w-4 mr-2" /> PDF</Button>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pl-2">
            {data && data.chart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "dd MMM")} fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${val / 1000}k`} />
                    <Tooltip 
                        cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                        formatter={(val: any) => [formatMoney(val), "Pendapatan Bersih"]} 
                    />
                    <Bar dataKey="income" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic">Belum ada data untuk periode ini.</div>
            )}
          </CardContent>
        </Card>

        {/* Top Items Table Simple */}
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle>Top Menu</CardTitle>
                <CardDescription>Item paling laris periode ini.</CardDescription>
            </CardHeader>
            <CardContent>
                {data && data.details.length > 0 ? (
                    <div className="space-y-4">
                        {/* Group logic in render for demo simplicity */}
                        {Object.entries(data.details.reduce((acc: any, curr: any) => {
                            acc[curr.itemName] = (acc[curr.itemName] || 0) + curr.quantity
                            return acc
                        }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([name, qty]: [any, any]) => (
                            <div key={name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-slate-50 rounded flex items-center justify-center text-slate-400 font-bold text-xs border">
                                        <Utensils className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">{name}</span>
                                </div>
                                <span className="text-sm font-bold text-blue-600">{qty} porsi</span>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-center text-sm text-muted-foreground mt-8">No data.</p>}
            </CardContent>
        </Card>
      </div>

      {/* Transaction Details Table */}
      {data && data.details && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Rincian Penjualan</CardTitle>
            <CardDescription>Daftar transaksi per porsi menu.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="pl-6">Tanggal</TableHead>
                    <TableHead>Siswa</TableHead>
                    <TableHead>Menu</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Kotor</TableHead>
                    <TableHead className="text-right pr-6">Bersih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.details.map((item: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6">{item.date}</TableCell>
                      <TableCell>
                          <div className="flex flex-col">
                              <span className="font-medium text-slate-800">{item.studentName}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">{item.studentClass}</span>
                          </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right text-slate-500">{formatMoney(item.totalPrice)}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600 pr-6">{formatMoney(item.netIncome)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
