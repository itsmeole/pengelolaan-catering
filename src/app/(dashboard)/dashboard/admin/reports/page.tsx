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

    // Helper to group details by student
    const groupDetailsByStudent = () => {
      const DAY_JS: Record<number, string> = { 1: 'SENIN', 2: 'SELASA', 3: 'RABU', 4: 'KAMIS', 5: 'JUMAT', 6: 'SABTU' }
      type StudentRow = { studentName: string; studentClass: string; paymentMethod: string; days: Record<string, string> }
      const studentMap: Record<string, StudentRow> = {}
      
      data.details.forEach((d: any) => {
        if (d.refundStatus === 'APPROVED') return
        const key = d.studentName
        if (!studentMap[key]) {
          studentMap[key] = {
            studentName: d.studentName,
            studentClass: d.studentClass || '-',
            paymentMethod: d.paymentMethod === 'TRANSFER' ? 'TF' : (d.paymentMethod === 'CASH_PAY_LATER' ? 'CASH' : d.paymentMethod),
            days: {}
          }
        }
        
        const [dd, mm, yyyy] = d.deliveryDate.split('/')
        const date = new Date(+yyyy, +mm - 1, +dd)
        const dayName = DAY_JS[date.getDay()]
        if (dayName) {
          if (studentMap[key].days[dayName]) {
            studentMap[key].days[dayName] += `, ${d.vendorName}`
          } else {
            studentMap[key].days[dayName] = d.vendorName
          }
        }
      })
      return Object.values(studentMap)
    }

    // 2. Details Sheet
    const studentRowsExcel = groupDetailsByStudent()
    const detailsExcel = studentRowsExcel.map((s: any) => ({
      "SISWA/SISWI PEMESAN": s.studentName,
      "KELAS": s.studentClass,
      "SENIN": s.days['SENIN'] || '',
      "SELASA": s.days['SELASA'] || '',
      "RABU": s.days['RABU'] || '',
      "KAMIS": s.days['KAMIS'] || '',
      "JUMAT": s.days['JUMAT'] || '',
      "METODE BAYAR": s.paymentMethod
    }))
    const wsDetails = XLSX.utils.json_to_sheet(detailsExcel)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan")
    XLSX.utils.book_append_sheet(wb, wsDetails, "Detail Transaksi")

    XLSX.writeFile(wb, `Laporan_${startDate}_${endDate}.xlsx`)
    toast.success("Excel berhasil didownload")
  }

  function downloadPDF() {
    if (!data) return

    // ── Landscape mode agar cukup untuk banyak kolom ──────────────────
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageW = doc.internal.pageSize.getWidth()

    // ── Header ────────────────────────────────────────────────────────
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.text("LAPORAN KEUANGAN GO CATERING", pageW / 2, 16, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate}  s/d  ${endDate}`, pageW / 2, 23, { align: 'center' })
    doc.text(`Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageW / 2, 28, { align: 'center' })

    // ── Ringkasan angka kecil di atas ─────────────────────────────────
    doc.setFontSize(9)
    doc.text(`Total Pesanan: ${data.summary.totalOrders}  |  Total Pemasukan: ${formatMoney(data.summary.grossRevenue)}  |  Pendapatan Bersih: ${formatMoney(data.summary.netRevenue)}`, pageW / 2, 34, { align: 'center' })

    // ── BUILD VENDOR SUMMARY ──────────────────────────────────────────
    const DAYS_ID   = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const DAY_JS: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' }
    const PAKET_LETTERS = 'ABCDEFGHIJ'.split('')

    type VendorRow = { ownerName: string; kantinName: string; paket: string; days: Record<string, number>; jml: number; dibayarkan: number }
    const vendorMap: Record<string, VendorRow> = {}
    let paketIdx = 0

    data.details.forEach((d: any) => {
      if (d.refundStatus === 'APPROVED') return
      // group by vendorId if available, else by vendorName
      const key = d.vendorId || d.vendorName
      if (!vendorMap[key]) {
        vendorMap[key] = {
          ownerName: d.ownerName || d.vendorName,  // nama pemilik → kolom CATERING
          kantinName: d.vendorName,                 // nama kantin  → kolom PAKET
          paket: PAKET_LETTERS[paketIdx++] ?? String(paketIdx),
          days: {},
          jml: 0,
          dibayarkan: 0
        }
      }
      // Parse "dd/MM/yyyy" → Date
      const [dd, mm, yyyy] = d.deliveryDate.split('/')
      const date = new Date(+yyyy, +mm - 1, +dd)
      const dayName = DAY_JS[date.getDay()]
      if (dayName) vendorMap[key].days[dayName] = (vendorMap[key].days[dayName] || 0) + d.quantity
      vendorMap[key].jml        += d.quantity
      vendorMap[key].dibayarkan += (d.total - d.adminFee)
    })

    const vendors    = Object.values(vendorMap)
    const activeDays = DAYS_ID.filter(day => vendors.some(v => (v.days[day] || 0) > 0))

    // Hitung total per hari untuk baris JUMLAH
    const dayTotals  = activeDays.map(day => vendors.reduce((s, v) => s + (v.days[day] || 0), 0))
    const totalJml   = vendors.reduce((s, v) => s + v.jml, 0)
    const totalDibyr = vendors.reduce((s, v) => s + v.dibayarkan, 0)

    const summaryHead = [['NO', 'CATERING', 'PAKET', ...activeDays, 'JML', 'DIBAYARKAN']]
    const summaryBody: (string | number)[][] = vendors.map((v, i) => [
      i + 1,
      v.ownerName,    // nama pemilik vendor
      v.kantinName,   // nama kantin
      ...activeDays.map(d => v.days[d] || 0),
      v.jml,
      formatMoney(v.dibayarkan)
    ])
    // Baris total
    summaryBody.push(['', 'J U M L A H', '', ...dayTotals, totalJml, formatMoney(totalDibyr)])

    const dibayarColIdx = 3 + activeDays.length + 1
    const colStyles: Record<number, any> = {
      0: { cellWidth: 10, halign: 'center' },
      1: { halign: 'left' },
      2: { cellWidth: 16, halign: 'center' },
      [dibayarColIdx]: { halign: 'right', cellWidth: 38 }
    }
    // Hari + JML: center
    activeDays.forEach((_, i) => { colStyles[3 + i] = { halign: 'center', cellWidth: 22 } })
    colStyles[3 + activeDays.length] = { halign: 'center', cellWidth: 16 } // JML

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text("Ringkasan Per Vendor", 14, 41)

    autoTable(doc, {
      startY: 44,
      head: summaryHead,
      body: summaryBody,
      headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
      bodyStyles: { halign: 'center', fontSize: 8 },
      columnStyles: colStyles,
      didParseCell: (hookData) => {
        // Bold baris JUMLAH (baris terakhir)
        if (hookData.row.index === summaryBody.length - 1) {
          hookData.cell.styles.fontStyle = 'bold'
        }
      },
      theme: 'grid'
    })

    // ── DETAIL TABLE (GROUPED BY STUDENT) ──────────────────────────────
    const summaryFinalY = (doc as any).lastAutoTable?.finalY ?? 120
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text("Detail Transaksi (Per Siswa)", 14, summaryFinalY + 10)

    const DAY_JS_UPPER: Record<number, string> = { 1: 'SENIN', 2: 'SELASA', 3: 'RABU', 4: 'KAMIS', 5: 'JUMAT', 6: 'SABTU' }
    type StudentRow = { studentName: string; studentClass: string; paymentMethod: string; days: Record<string, string> }
    const studentMap: Record<string, StudentRow> = {}
    
    data.details.forEach((d: any) => {
      if (d.refundStatus === 'APPROVED') return
      const key = d.studentName
      if (!studentMap[key]) {
        studentMap[key] = {
          studentName: d.studentName,
          studentClass: d.studentClass || '-',
          paymentMethod: d.paymentMethod === 'TRANSFER' ? 'TF' : (d.paymentMethod === 'CASH_PAY_LATER' ? 'CASH' : d.paymentMethod),
          days: {}
        }
      }
      
      const [dd, mm, yyyy] = d.deliveryDate.split('/')
      const date = new Date(+yyyy, +mm - 1, +dd)
      const dayName = DAY_JS_UPPER[date.getDay()]
      if (dayName) {
        if (studentMap[key].days[dayName]) {
          studentMap[key].days[dayName] += `, ${d.vendorName}`
        } else {
          studentMap[key].days[dayName] = d.vendorName
        }
      }
    })

    const studentRows = Object.values(studentMap)
    const studentTableHead = [['SISWA/SISWI PEMESAN', 'KELAS', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'METODE BAYAR']]
    const studentTableBody = studentRows.map(s => [
      s.studentName,
      s.studentClass,
      s.days['SENIN'] || '',
      s.days['SELASA'] || '',
      s.days['RABU'] || '',
      s.days['KAMIS'] || '',
      s.days['JUMAT'] || '',
      s.paymentMethod
    ])

    autoTable(doc, {
      startY: summaryFinalY + 13,
      head: studentTableHead,
      body: studentTableBody,
      headStyles: { fillColor: [255, 255, 0], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, halign: 'center' },
      columnStyles: {
        0: { halign: 'left' }
      },
      theme: 'grid'
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
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        const count = payload[0]?.payload?.count ?? 0
                        return (
                          <div className="bg-white border rounded-lg shadow-lg p-3 text-sm space-y-1">
                            <p className="font-bold text-slate-700">{label}</p>
                            <p className="text-muted-foreground text-xs">{count} item pesanan</p>
                            {payload.map((p: any) => (
                              <p key={p.name} style={{ color: p.color }}>
                                {p.name === 'gross' ? 'Pemasukan' : 'Bersih'}: {formatMoney(p.value)}
                              </p>
                            ))}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
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

                    return (
                      <tr key={idx} className={`border-b transition-colors hover:bg-muted/50 ${isCancelled ? 'bg-red-50/30 text-muted-foreground line-through' : ''}`}>
                        <td className="p-4 text-[10px] whitespace-nowrap">{item.transactionDate}</td>
                        <td className="p-4 text-[10px] whitespace-nowrap">{item.deliveryDate}</td>
                        <td className="p-4">{item.studentName}</td>
                        <td className="p-4">{item.vendorName}</td>
                        <td className="p-4">{item.itemName}</td>
                        <td className="p-4 text-right">{formatMoney(isCancelled ? 0 : item.total)}</td>
                        <td className="p-4 text-right">{formatMoney(isCancelled ? 0 : item.adminFee)}</td>
                        <td className="p-4 text-center">
                          {isCancelled ? (
                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold uppercase">
                              Refund
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
