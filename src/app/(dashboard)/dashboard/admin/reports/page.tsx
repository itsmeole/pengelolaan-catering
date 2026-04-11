"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { FileSpreadsheet, FileText, Filter } from "lucide-react"

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function AdminReportsPage() {
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
      const res = await fetch(`/api/admin/reports?start=${startDate}&end=${endDate}`)
      if (res.ok) setData(await res.json())
    } catch (e) {
      toast.error("Gagal memuat laporan")
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val)

  function downloadExcel() {
    if (!data) return

    // 1. Summary Sheet
    const summary = [
      ["Laporan Keuangan Catering"],
      ["Periode", `${startDate} s/d ${endDate}`],
      [""],
      ["Total Pesanan", data.summary.totalOrders],
      ["Total Pemasukan (Kotor)", data.summary.grossRevenue],
      ["Pendapatan Bersih (Admin)", data.summary.netRevenue]
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summary)

    // 2. Details Sheet
    const details = data.details.map((d: any) => ({
      "Tgl Pesan": d.transactionDate,
      "Tgl Antar": d.deliveryDate,
      Siswa: d.studentName,
      Vendor: d.vendorName,
      Menu: d.itemName,
      Harga: d.price,
      Qty: d.quantity,
      Total: d.refundStatus === 'APPROVED' ? 0 : d.total,
      FeeAdmin: d.refundStatus === 'APPROVED' ? 0 : d.adminFee,
      Status: d.refundStatus === 'APPROVED' ? 'DIBATALKAN' : (d.refundStatus === 'PENDING' ? 'MINTA REFUND' : 'SUKSES')
    }))
    const wsDetails = XLSX.utils.json_to_sheet(details)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan")
    XLSX.utils.book_append_sheet(wb, wsDetails, "Detail Transaksi")

    XLSX.writeFile(wb, `Laporan_${startDate}_${endDate}.xlsx`)
    toast.success("Excel berhasil didownload")
  }

  function downloadPDF() {
    if (!data) return
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text("Laporan Keuangan Go Catering", 14, 20)

    doc.setFontSize(11)
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 30)
    doc.text(`Dicetak pada: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 36)

    // Summary
    doc.setFontSize(14)
    doc.text("Ringkasan", 14, 50)
    doc.setFontSize(12)
    doc.text(`Total Pesanan: ${data.summary.totalOrders}`, 14, 60)
    doc.text(`Total Pemasukan: ${formatMoney(data.summary.grossRevenue)}`, 14, 68)
    doc.text(`Pendapatan Bersih: ${formatMoney(data.summary.netRevenue)}`, 14, 76)

    // Table
    const rows = data.details.map((d: any) => [
      d.transactionDate,
      d.deliveryDate, 
      d.vendorName, 
      d.itemName, 
      d.quantity, 
      d.refundStatus === 'APPROVED' ? 'Rp 0 (BATAL)' : formatMoney(d.total), 
      d.refundStatus === 'APPROVED' ? 'Rp 0' : formatMoney(d.adminFee)
    ])

    autoTable(doc, {
      startY: 90,
      head: [['Tgl Pesan', 'Tgl Antar', 'Vendor', 'Menu', 'Qty', 'Total', 'Fee']],
      body: rows,
    })

    doc.save(`Laporan_${startDate}_${endDate}.pdf`)
    toast.success("PDF berhasil didownload")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Laporan Keuangan</h2>
          <p className="text-muted-foreground">Monitor pendapatan dan performa bisnis.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="grid gap-1.5">
            <Label>Dari Tanggal</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Sampai Tanggal</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <Button onClick={fetchReports} disabled={loading}>
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{formatMoney(data.summary.grossRevenue)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pendapatan Bersih</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{formatMoney(data.summary.netRevenue)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Volume Pesanan</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{data.summary.totalOrders} Transaksi</div></CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {data && (
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Grafik Pendapatan Harian</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "dd MMM")} />
                  <YAxis tickFormatter={(val) => `Rp ${val / 1000}k`} />
                  <Tooltip formatter={(value: any) => formatMoney(Number(value) || 0)} />
                  <Bar dataKey="gross" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Pemasukan" />
                  <Bar dataKey="net" fill="#82ca9d" radius={[4, 4, 0, 0]} name="Bersih" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Transaction Details Table */}
      {data && data.details && (
        <Card className="col-span-4 mt-6">
          <CardHeader>
            <CardTitle>Detail Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md max-h-[400px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr className="border-b">
                    <th className="h-10 px-4 text-left font-medium">Tgl Pesan</th>
                    <th className="h-10 px-4 text-left font-medium">Tgl Antar</th>
                    <th className="h-10 px-4 text-left font-medium">Siswa</th>
                    <th className="h-10 px-4 text-left font-medium">Vendor</th>
                    <th className="h-10 px-4 text-left font-medium text-xs">Menu</th>
                    <th className="h-10 px-4 text-right font-medium">Total</th>
                    <th className="h-10 px-4 text-right font-medium">Fee</th>
                    <th className="h-10 px-4 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.details.map((item: any, idx: number) => {
                    const isCancelled = item.refundStatus === 'APPROVED';
                    const isPending = item.refundStatus === 'PENDING';

                    return (
                      <tr key={idx} className={`border-b transition-colors hover:bg-muted/50 ${isCancelled ? 'bg-red-50/30 text-muted-foreground line-through' : (isPending ? 'bg-orange-50/50' : '')}`}>
                        <td className="p-4 text-[10px] whitespace-nowrap">{item.transactionDate}</td>
                        <td className="p-4 text-[10px] whitespace-nowrap">{item.deliveryDate}</td>
                        <td className="p-4">{item.studentName}</td>
                        <td className="p-4">{item.vendorName}</td>
                        <td className="p-4">{item.itemName}</td>
                        <td className="p-4 text-right">{formatMoney(item.total)}</td>
                        <td className="p-4 text-right">{formatMoney(item.adminFee)}</td>
                        <td className="p-4 text-center">
                          {isCancelled ? (
                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold uppercase">
                              Dibatalkan
                            </span>
                          ) : isPending ? (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold uppercase animate-pulse" title={item.refundReason}>
                              Minta Refund
                            </span>
                          ) : (
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold uppercase">
                              Sukses
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {data && (
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={downloadExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Export Excel
          </Button>
          <Button variant="outline" onClick={downloadPDF}>
            <FileText className="mr-2 h-4 w-4 text-red-600" /> Export PDF
          </Button>
        </div>
      )}
    </div>
  )
}
