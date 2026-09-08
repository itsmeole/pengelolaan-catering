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
    // Hitung TF & Cash dari details
    const grossTF = data.details
      .filter((d: any) => d.refundStatus !== 'APPROVED' && d.paymentMethod === 'TRANSFER')
      .reduce((s: number, d: any) => s + (d.total || 0), 0)
    const grossCash = data.details
      .filter((d: any) => d.refundStatus !== 'APPROVED' && d.paymentMethod === 'CASH_PAY_LATER')
      .reduce((s: number, d: any) => s + (d.total || 0), 0)

    const summary = [
      ["Laporan Keuangan Catering"],
      ["Periode", `${startDate} s/d ${endDate}`],
      [""],
      ["Total Pesanan", data.summary.totalOrders],
      ["Total Pemasukan (Kotor)", data.summary.grossRevenue],
      ["Pendapatan Bersih (Admin)", data.summary.netRevenue],
      ["  - Total Fee Admin (Porsi)", data.summary.totalAdminFee || 0],
      ["  - Total Biaya Layanan (Per Order)", data.summary.totalServiceFee || 0],
      ["Uang Masuk via Transfer", grossTF],
      ["Uang Masuk via Cash", grossCash]
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summary)

    // Helper to group details by student
    const groupDetailsByStudent = () => {
      const DAY_JS: Record<number, string> = { 1: 'SENIN', 2: 'SELASA', 3: 'RABU', 4: 'KAMIS', 5: 'JUMAT', 6: 'SABTU' }
      type StudentRow = { studentName: string; studentClass: string; paymentMethod: string; days: Record<string, string> }
      const studentMap: Record<string, StudentRow> = {}
      
      data.details.forEach((d: any) => {
        if (d.refundStatus === 'APPROVED') return
        const key = d.studentId || d.studentName
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
          const packageRepeated = Array(d.quantity || 1).fill(d.vendorName).join(', ')
          if (studentMap[key].days[dayName]) {
            studentMap[key].days[dayName] += `, ${packageRepeated}`
          } else {
            studentMap[key].days[dayName] = packageRepeated
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

    // 3. Ringkasan Per Vendor
    const DAYS_ID   = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const DAY_JS: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' }
    const PAKET_LETTERS = 'ABCDEFGHIJ'.split('')

    type VendorRow = { ownerName: string; kantinName: string; paket: string; days: Record<string, number>; jml: number; dibayarkan: number }
    const vendorMap: Record<string, VendorRow> = {}
    let paketIdx = 0

    data.details.forEach((d: any) => {
      if (d.refundStatus === 'APPROVED') return
      const key = d.vendorId || d.vendorName
      if (!vendorMap[key]) {
        vendorMap[key] = {
          ownerName: d.ownerName || d.vendorName,
          kantinName: d.vendorName,
          paket: PAKET_LETTERS[paketIdx++] ?? String(paketIdx),
          days: {},
          jml: 0,
          dibayarkan: 0
        }
      }
      const [dd, mm, yyyy] = d.deliveryDate.split('/')
      const date = new Date(+yyyy, +mm - 1, +dd)
      const dayName = DAY_JS[date.getDay()]
      if (dayName) vendorMap[key].days[dayName] = (vendorMap[key].days[dayName] || 0) + d.quantity
      vendorMap[key].jml        += d.quantity
      vendorMap[key].dibayarkan += (d.total - d.adminFee)
    })

    const vendors    = Object.values(vendorMap)
    const activeDays = DAYS_ID.filter(day => vendors.some(v => (v.days[day] || 0) > 0))

    const dayTotals  = activeDays.map(day => vendors.reduce((s, v) => s + (v.days[day] || 0), 0))
    const totalJml   = vendors.reduce((s, v) => s + v.jml, 0)
    const totalDibyr = vendors.reduce((s, v) => s + v.dibayarkan, 0)

    const vendorSummaryData = [
      ['NO', 'CATERING', 'PAKET', ...activeDays, 'JML', 'DIBAYARKAN'],
      ...vendors.map((v, i) => [
        i + 1,
        v.ownerName,
        v.kantinName,
        ...activeDays.map(d => v.days[d] || 0),
        v.jml,
        formatMoney(v.dibayarkan)
      ]),
      ['', 'J U M L A H', '', ...dayTotals, totalJml, formatMoney(totalDibyr)]
    ]
    const wsVendorSummary = XLSX.utils.aoa_to_sheet(vendorSummaryData)
    wsVendorSummary['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 15 },
      ...activeDays.map(() => ({ wch: 10 })),
      { wch: 10 },
      { wch: 20 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Umum")
    XLSX.utils.book_append_sheet(wb, wsVendorSummary, "Ringkasan Per Vendor")
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

    // Hitung TF & Cash dari details
    const grossTFPdf = data.details
      .filter((d: any) => d.refundStatus !== 'APPROVED' && d.paymentMethod === 'TRANSFER')
      .reduce((s: number, d: any) => s + (d.total || 0), 0)
    const grossCashPdf = data.details
      .filter((d: any) => d.refundStatus !== 'APPROVED' && d.paymentMethod === 'CASH_PAY_LATER')
      .reduce((s: number, d: any) => s + (d.total || 0), 0)

    // ── Ringkasan angka kecil di atas ─────────────────────────────────
    doc.setFontSize(9)
    doc.text(`Total Pesanan: ${data.summary.totalOrders}  |  Total Pemasukan: ${formatMoney(data.summary.grossRevenue)}  |  Pendapatan Bersih: ${formatMoney(data.summary.netRevenue)}`, pageW / 2, 34, { align: 'center' })
    doc.text(`(Fee Admin: ${formatMoney(data.summary.totalAdminFee || 0)}  |  Biaya Layanan: ${formatMoney(data.summary.totalServiceFee || 0)})  |  TF: ${formatMoney(grossTFPdf)}  |  Cash: ${formatMoney(grossCashPdf)}`, pageW / 2, 39, { align: 'center' })

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
    doc.text("Ringkasan Per Vendor", 14, 47)

    autoTable(doc, {
      startY: 50,
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
      const key = d.studentId || d.studentName
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
        const packageRepeated = Array(d.quantity || 1).fill(d.vendorName).join(', ')
        if (studentMap[key].days[dayName]) {
          studentMap[key].days[dayName] += `, ${packageRepeated}`
        } else {
          studentMap[key].days[dayName] = packageRepeated
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

  // Pagination states for details table
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    setCurrentPage(1)
  }, [data])

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Date Filter */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Laporan Keuangan</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Monitor pendapatan dan performa bisnis katering.</p>
        </div>
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 bg-white p-2 sm:p-2.5 rounded-xl border shadow-sm w-full md:w-auto">
          <div className="grid gap-0.5 flex-1 min-w-0">
            <Label className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500">Dari</Label>
            <Input 
              type="date" 
              className="h-8 sm:h-9 w-full sm:w-32 md:w-36 border-none focus-visible:ring-0 p-0 text-xs sm:text-sm" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </div>
          <div className="w-[1px] h-7 sm:h-8 bg-slate-200 mx-1 sm:mx-2 shrink-0" />
          <div className="grid gap-0.5 flex-1 min-w-0">
            <Label className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500">Sampai</Label>
            <Input 
              type="date" 
              className="h-8 sm:h-9 w-full sm:w-32 md:w-36 border-none focus-visible:ring-0 p-0 text-xs sm:text-sm" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>
          <Button size="sm" onClick={fetchReports} disabled={loading} className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs shrink-0 ml-1">
            <Filter className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden xs:inline sm:inline">Filter</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (() => {
        const grossTFUi = data.details
          .filter((d: any) => d.refundStatus !== 'APPROVED' && d.paymentMethod === 'TRANSFER')
          .reduce((s: number, d: any) => s + (d.total || 0), 0)
        const grossCashUi = data.details
          .filter((d: any) => d.refundStatus !== 'APPROVED' && d.paymentMethod === 'CASH_PAY_LATER')
          .reduce((s: number, d: any) => s + (d.total || 0), 0)
        return (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="border-l-4 border-l-green-500 shadow-sm col-span-2 sm:col-span-1 p-3.5 sm:p-4">
              <div className="text-xs font-semibold text-slate-500">Total Pemasukan</div>
              <div className="text-lg sm:text-2xl font-bold text-green-600 truncate mt-1" title={formatMoney(data.summary.grossRevenue)}>
                {formatMoney(data.summary.grossRevenue)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Total omzet kotor</p>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm col-span-2 sm:col-span-1 p-3.5 sm:p-4">
              <div className="text-xs font-semibold text-slate-500">Pendapatan Bersih</div>
              <div className="text-lg sm:text-2xl font-bold text-primary truncate mt-1" title={formatMoney(data.summary.netRevenue)}>
                {formatMoney(data.summary.netRevenue)}
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 space-y-0.5">
                <div className="flex justify-between items-center">
                  <span>Fee Admin:</span>
                  <span className="font-semibold text-slate-700">{formatMoney(data.summary.totalAdminFee || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Biaya Layanan:</span>
                  <span className="font-semibold text-slate-700">{formatMoney(data.summary.totalServiceFee || 0)}</span>
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-slate-400 shadow-sm col-span-1 sm:col-span-1 p-3.5 sm:p-4">
              <div className="text-xs font-semibold text-slate-500">Volume Pesanan</div>
              <div className="text-lg sm:text-2xl font-bold text-slate-800 mt-1">{data.summary.totalOrders} <span className="text-xs sm:text-sm font-normal text-slate-500">Item</span></div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Total menu dipesan</p>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 shadow-sm col-span-1 sm:col-span-1 p-3.5 sm:p-4">
              <div className="text-xs font-semibold text-slate-500">Transfer Bank</div>
              <div className="text-lg sm:text-2xl font-bold text-indigo-600 truncate mt-1" title={formatMoney(grossTFUi)}>
                {formatMoney(grossTFUi)}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Metode Transfer</p>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-sm col-span-2 sm:col-span-2 lg:col-span-1 p-3.5 sm:p-4">
              <div className="text-xs font-semibold text-slate-500">Cash di Sekolah</div>
              <div className="text-lg sm:text-2xl font-bold text-orange-600 truncate mt-1" title={formatMoney(grossCashUi)}>
                {formatMoney(grossCashUi)}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Bayar di Sekolah</p>
            </Card>
          </div>
        )
      })()}

      {/* Chart */}
      {data && (
        <Card className="border-none shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <CardTitle className="text-base sm:text-lg">Grafik Pendapatan Harian</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Perbandingan pemasukan kotor dan pendapatan bersih harian.</p>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="h-[260px] sm:h-[320px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.12} />
                  <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "dd MMM")} fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} width={45} tickFormatter={(val) => `Rp${val >= 1000 ? val / 1000 + 'k' : val}`} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        const count = payload[0]?.payload?.count ?? 0
                        return (
                          <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1">
                            <p className="font-bold text-slate-800">{label}</p>
                            <p className="text-muted-foreground text-[11px]">{count} item pesanan</p>
                            {payload.map((p: any) => (
                              <p key={p.name} style={{ color: p.color }} className="font-medium">
                                {p.name === 'gross' ? 'Pemasukan' : 'Bersih'}: {formatMoney(p.value)}
                              </p>
                            ))}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="gross" fill="#16a34a" radius={[4, 4, 0, 0]} name="Pemasukan" maxBarSize={32} />
                  <Bar dataKey="net" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Bersih" maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Details Table */}
      {data && data.details && (
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">Detail Transaksi</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Rincian seluruh pesanan pada rentang tanggal terpilih.</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border">
                {data.details.length} transaksi
              </span>
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
                        <div className="text-[11px] text-muted-foreground">
                          Antar: <strong className="text-slate-700">{item.deliveryDate}</strong>
                        </div>
                        {isCancelled ? (
                          <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">
                            Refund
                          </span>
                        ) : (
                          <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">
                            Sukses
                          </span>
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold text-slate-800 leading-snug line-clamp-1 ${isCancelled ? 'line-through text-slate-400' : ''}`}>
                            {item.itemName}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {item.studentName} <span className="text-[10px] text-slate-400 font-medium">({item.vendorName})</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-sm font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {formatMoney(isCancelled ? 0 : item.total)}
                          </div>
                          <div className="text-[11px] text-blue-600 font-medium">
                            Fee: {formatMoney(isCancelled ? 0 : item.adminFee)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>Pesan: {item.transactionDate}</span>
                        <span className="uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.paymentMethod === 'TRANSFER' ? 'Transfer' : 'Cash'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden md:block border-t max-h-[450px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50/80 sticky top-0 z-10 border-b">
                  <tr>
                    <th className="h-9 px-4 text-left font-semibold text-slate-600">Tgl Pesan</th>
                    <th className="h-9 px-4 text-left font-semibold text-slate-600">Tgl Antar</th>
                    <th className="h-9 px-4 text-left font-semibold text-slate-600">Siswa</th>
                    <th className="h-9 px-4 text-left font-semibold text-slate-600">Vendor</th>
                    <th className="h-9 px-4 text-left font-semibold text-slate-600">Menu</th>
                    <th className="h-9 px-4 text-center font-semibold text-slate-600">Bayar</th>
                    <th className="h-9 px-4 text-right font-semibold text-slate-600">Total</th>
                    <th className="h-9 px-4 text-right font-semibold text-slate-600">Fee Admin</th>
                    <th className="h-9 px-4 text-center font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.details.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item: any, idx: number) => {
                    const isCancelled = item.refundStatus === 'APPROVED';

                    return (
                      <tr key={idx} className={`transition-colors hover:bg-slate-50/60 ${isCancelled ? 'bg-red-50/30 text-slate-400' : ''}`}>
                        <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">{item.transactionDate}</td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{item.deliveryDate}</td>
                        <td className="px-4 py-3 max-w-[150px]">
                          <span className="font-medium text-slate-800 truncate block" title={item.studentName}>{item.studentName}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[130px]">
                          <span className="text-slate-600 truncate block" title={item.vendorName}>{item.vendorName}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[150px]">
                          <span className={`truncate block ${isCancelled ? 'line-through text-slate-400' : 'text-slate-700'}`} title={item.itemName}>
                            {item.itemName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.paymentMethod === 'TRANSFER' ? 'TF' : 'Cash'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatMoney(isCancelled ? 0 : item.total)}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-600">{formatMoney(isCancelled ? 0 : item.adminFee)}</td>
                        <td className="px-4 py-3 text-center">
                          {isCancelled ? (
                            <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">
                              Refund
                            </span>
                          ) : (
                            <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">
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
                    <option value={100}>100</option>
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

      {/* Action Buttons at bottom for quick access */}
      {data && (
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={downloadExcel} className="h-9 text-xs sm:text-sm">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPDF} className="h-9 text-xs sm:text-sm">
            <FileText className="mr-2 h-4 w-4 text-red-600" /> Export PDF
          </Button>
        </div>
      )}
    </div>
  )
}
