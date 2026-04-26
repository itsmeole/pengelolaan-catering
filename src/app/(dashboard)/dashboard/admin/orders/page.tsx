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
import { cn } from "@/lib/utils"
import { 
  Loader2, Plus, Search, User, Calendar, 
  ChevronRight, Filter, Eye, XCircle, CheckCircle2,
  Trash2, AlertCircle, FileText, CheckCircle,
  LayoutGrid, Utensils, CalendarClock, UserPlus, RotateCcw
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadImage } from "@/lib/uploadImage"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { ConfirmButton } from "@/components/ui/confirm-button"

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [filterPayment, setFilterPayment] = useState("ALL")
  const [selectedProof, setSelectedProof] = useState<string | null>(null)
  const [adminFee, setAdminFee] = useState<number>(1000)
  const [searchName, setSearchName] = useState("")

  // States for Refund (Admin)
  const [isRefundOpen, setIsRefundOpen]       = useState(false)
  const [refundOrder, setRefundOrder]         = useState<any>(null)
  const [refundItems, setRefundItems]         = useState<string[]>([])
  const [refundReason, setRefundReason]       = useState("VENDOR_LATE")
  const [refundOther, setRefundOther]         = useState("")
  const [refundImage, setRefundImage]         = useState<string | null>(null)
  const [submittingRefund, setSubmittingRefund] = useState(false)

  // States for Add Order
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [availableMenus, setAvailableMenus] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState("CASH_PAY_LATER")
  const [proofImage, setProofImage] = useState<string | null>(null)

  // Current item being added
  const [itemForm, setItemForm] = useState({
    menuId: "",
    date: "",
    quantity: 1,
    note: ""
  })

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<any>(null)

  useEffect(() => {
    fetchOrders()
    fetchStudents()
    fetchMenus()
    fetchAdminFee()
  }, [])

  async function fetchAdminFee() {
      try {
          const res = await fetch("/api/public/settings/admin-fee")
          const data = await res.json()
          if (data.fee !== undefined) setAdminFee(data.fee)
      } catch { }
  }

  async function fetchStudents() {
    try {
      const res = await fetch("/api/admin/users/students")
      if (res.ok) setStudents(await res.json())
    } catch {}
  }

  async function fetchMenus() {
    try {
      const res = await fetch("/api/admin/menus")
      if (res.ok) setAvailableMenus(await res.json())
    } catch {}
  }

  const filteredStudents = studentSearch.length > 1 
    ? students.filter(s => 
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
        s.nis?.includes(studentSearch)
      ).slice(0, 5)
    : []

  const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      toast.loading("Mengupload bukti transfer...", { id: 'upload-proof' })
      const url = await uploadImage(file, 'proofs')
      setProofImage(url)
      toast.success("Bukti transfer berhasil diupload", { id: 'upload-proof' })
    } catch (err: any) {
      toast.error(err.message || "Gagal upload bukti transfer", { id: 'upload-proof' })
    }
  }

  function addItemToOrder() {
    if (!itemForm.menuId || !itemForm.date) {
      return toast.error("Pilih menu dan tanggal terlebih dahulu")
    }
    const menu = availableMenus.find(m => m.id === itemForm.menuId)
    if (!menu) return

    const newItem = {
      ...itemForm,
      menuName: menu.name,
      price: menu.price, // Harga vendor
      id: Math.random().toString(36).substr(2, 9)
    }

    setOrderItems([...orderItems, newItem])
    setItemForm({ ...itemForm, menuId: "", note: "" })
    toast.success("Ditambahkan ke daftar")
  }

  function removeItemFromOrder(id: string) {
    setOrderItems(orderItems.filter(item => item.id !== id))
  }

  async function handleAddOrder() {
    if (!selectedStudent) {
      return toast.error("Pilih siswa terlebih dahulu")
    }
    if (orderItems.length === 0) {
      return toast.error("Daftar pesanan masih kosong")
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/orders/create", {
        method: "POST",
        body: JSON.stringify({
          studentId: selectedStudent.id,
          paymentMethod: paymentMethod,
          proofImage: proofImage,
          items: orderItems.map(item => ({
            menuId: item.menuId,
            date: item.date,
            quantity: item.quantity,
            note: item.note,
            price: item.price // API akan otomatis nambah adminFee
          }))
        })
      })

      if (res.ok) {
        toast.success(`Berhasil membuat ${orderItems.length} pesanan. Status: PENDING`)
        setIsAddModalOpen(false)
        fetchOrders()
        // Reset all states
        setSelectedStudent(null)
        setStudentSearch("")
        setOrderItems([])
        setProofImage(null)
        setItemForm({ menuId: "", date: "", quantity: 1, note: "" })
      } else {
        const err = await res.json()
        toast.error(err.error || "Gagal membuat pesanan")
      }
    } catch (e) {
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setIsSubmitting(false)
    }
  }

  const orderSubtotal = orderItems.reduce((acc, item) => acc + ((item.price + adminFee) * item.quantity), 0)

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        body: JSON.stringify({ orderId, status })
      })
      if (res.ok) {
        toast.success(`Status berhasil diubah ke ${status}`)
        fetchOrders()
      } else {
        toast.error("Gagal mengubah status")
      }
    } catch {
      toast.error("Error sistem")
    }
  }

  async function fetchOrders(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/admin/orders`)
      if (res.ok) {
        setOrders(await res.json())
      }
    } catch (e) {
      toast.error("Gagal memuat data pesanan")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function confirmPayment(orderId: string) {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "PAID" })
      })

      if (res.ok) {
        toast.success("Pembayaran berhasil dikonfirmasi sebagai LUNAS")
        fetchOrders()
      } else {
        toast.error("Gagal memperbarui status pembayaran")
      }
    } catch (e) {
      console.error(e)
      toast.error("Terjadi kesalahan sistem")
    }
  }

  async function handleRejectProof(orderId: string, reason: string) {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        body: JSON.stringify({ orderId, type: 'REJECT_PROOF', rejectionReason: reason })
      })
      if (res.ok) {
        toast.success("Bukti transfer ditolak. Siswa akan diminta upload ulang.")
        fetchOrders()
      }
    } catch (e) { toast.error("Gagal menolak bukti") }
  }

  async function handleCancelRequest(orderId: string, type: 'APPROVE_CANCEL' | 'REJECT_CANCEL') {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        body: JSON.stringify({ orderId, type })
      })
      if (res.ok) {
        toast.success(type === 'APPROVE_CANCEL' ? "Pembatalan disetujui" : "Pembatalan ditolak")
        fetchOrders()
      }
    } catch (e) { toast.error("Gagal memproses pembatalan") }
  }

  async function handleAdminRefund() {
    if (!refundOrder) return
    if (refundItems.length === 0) return toast.error("Pilih minimal satu item untuk direfund")
    if (refundReason === 'OTHER' && !refundOther.trim()) return toast.error("Isi alasan pembatalan")

    setSubmittingRefund(true)
    try {
      const res = await fetch("/api/order/cancel", {
        method: "POST",
        body: JSON.stringify({
          orderId: refundOrder.id,
          itemIds: refundItems,
          reason: refundReason,
          otherReason: refundReason === 'OTHER' ? refundOther : null,
          cancelImage: refundImage,
          adminInitiated: true   // flag admin
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Refund disetujui & pesanan dibatalkan")
        setIsRefundOpen(false)
        fetchOrders()
      } else {
        toast.error(data.error || "Gagal memproses refund")
      }
    } catch {
      toast.error("Error sistem")
    } finally {
      setSubmittingRefund(false)
    }
  }

  function openRefundDialog(order: any) {
    setRefundOrder(order)
    setRefundItems(order.items?.map((i: any) => i.id) || [])
    setRefundReason("VENDOR_LATE")
    setRefundOther("")
    setRefundImage(null)
    setIsRefundOpen(true)
  }

  function handleRefundImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    toast.loading("Mengupload bukti refund...", { id: 'upload-refund' })
    uploadImage(file, 'refunds')
      .then(url => {
        setRefundImage(url)
        toast.success("Bukti refund diupload", { id: 'upload-refund' })
      })
      .catch((err: any) => toast.error(err.message || "Gagal upload", { id: 'upload-refund' }))
  }

  const filteredOrders = orders.filter(order => {
    if (filterStatus !== "ALL" && order.status !== filterStatus) return false;
    if (filterPayment === "PAY_LATER" && order.paymentMethod !== "CASH_PAY_LATER") return false;
    if (filterPayment === "TRANSFER" && order.paymentMethod !== "TRANSFER") return false;
    if (searchName.trim() !== "") {
      const q = searchName.toLowerCase()
      const name = (order.student?.name || "").toLowerCase()
      const kelas = (order.student?.class || "").toLowerCase()
      if (!name.includes(q) && !kelas.includes(q)) return false;
    }
    return true;
  })

  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, filterPayment, searchName])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-primary">Data Pemesanan</h2>
          <p className="text-muted-foreground text-sm">Kelola status pembayaran dan pesanan siswa.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 h-10 gap-2">
                <Plus className="h-4 w-4" />
                Tambah Pesanan
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl p-0 h-[95vh] md:h-auto flex flex-col gap-0 border-none sm:border overflow-hidden">
            <DialogHeader className="p-6 pb-2 border-b">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <LayoutGrid className="h-5 w-5 text-blue-600" />
                Buat Pesanan Manual (Admin)
              </DialogTitle>
            </DialogHeader>

              <div className="flex-1 overflow-y-auto px-1 py-4">
                <div className="space-y-8">
                  {/* Bagian Atas: Input & Selector */}
                  <div className="space-y-6">
                    {/* 1. Pilih Siswa */}
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase text-blue-600 flex items-center gap-2">
                        <span className="bg-blue-600 text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                        Pilih Siswa
                      </Label>
                      
                      {!selectedStudent ? (
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                              placeholder="Ketik Nama atau NIS..." 
                              value={studentSearch} 
                              onChange={(e) => setStudentSearch(e.target.value)}
                              className="pl-9 h-11 bg-slate-50 border-slate-200"
                            />
                          </div>
                          
                          {filteredStudents.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                              {filteredStudents.map(s => (
                                <button 
                                  key={s.id} 
                                  onClick={() => {
                                    setSelectedStudent(s)
                                    setStudentSearch("")
                                  }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b last:border-0 flex flex-col"
                                >
                                  <span className="font-bold text-sm">{s.name}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase">{s.class} • NIS: {s.nis || '-'}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex justify-between items-center group">
                          <div className="flex flex-col">
                            <span className="font-bold text-blue-900">{selectedStudent.name}</span>
                            <span className="text-[10px] text-blue-700 uppercase">{selectedStudent.class}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-100 px-2 text-xs">Ganti</Button>
                        </div>
                      )}
                    </div>

                    {/* 2. Tambah Menu (Hanya jika siswa dipilih) */}
                    <div className={cn("space-y-4 pt-2 transition-opacity", !selectedStudent && "opacity-30 pointer-events-none")}>
                      <Label className="text-xs font-bold uppercase text-blue-600 flex items-center gap-2">
                        <span className="bg-blue-600 text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                        Tambah ke Daftar
                      </Label>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-500">Pilih Menu</Label>
                            <Select value={itemForm.menuId} onValueChange={(val) => setItemForm({ ...itemForm, menuId: val })}>
                              <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih menu..." /></SelectTrigger>
                              <SelectContent>
                                {availableMenus.map(m => (
                                  <SelectItem key={m.id} value={m.id}>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-semibold">{m.name} (Rp {(m.price + adminFee).toLocaleString()})</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded italic font-medium">
                                          Vendor: {m.vendor?.vendorName || m.vendor?.name || "Anonim"}
                                        </span>
                                        <span className="text-[10px] text-slate-500 italic">
                                          Hari: {m.availableDays && m.availableDays.length > 0 ? m.availableDays.join(", ") : "Semua Hari"}
                                        </span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase text-slate-500">Tanggal Makan</Label>
                            <Input 
                              type="date" 
                              value={itemForm.date} 
                              onChange={(e) => setItemForm({ ...itemForm, date: e.target.value })}
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase text-slate-500">Jumlah (Porsi)</Label>
                            <Input 
                              type="number" min="1" 
                              value={itemForm.quantity} 
                              onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) })}
                              className="bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 items-end">
                            <div className="space-y-1.5 flex-1">
                                <Label className="text-[10px] font-bold uppercase text-slate-500">Catatan Khusus</Label>
                                <Input 
                                    placeholder="Tidak pedas, dll..." 
                                    value={itemForm.note} 
                                    onChange={(e) => setItemForm({ ...itemForm, note: e.target.value })}
                                    className="bg-white h-10"
                                />
                            </div>
                            <Button 
                                type="button" 
                                onClick={addItemToOrder}
                                className="bg-slate-800 hover:bg-slate-900 h-10 px-4 sm:px-6 text-xs whitespace-nowrap"
                            >
                                <Plus className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Tambah</span>
                            </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bagian Bawah: Daftar Pesanan (Summary) */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold uppercase text-slate-600 flex items-center gap-2">
                        Daftar Pesanan ({orderItems.length})
                      </Label>
                      {orderItems.length > 0 && (
                        <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          Total: Rp {orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="border rounded-xl overflow-hidden bg-slate-50/50 flex flex-col min-h-[150px]">
                      {orderItems.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                          <Utensils className="h-10 w-10 text-slate-200 mb-2" />
                          <p className="text-[11px] text-slate-400">Belum ada menu yang ditambahkan.</p>
                        </div>
                      ) : (
                        <div className="overflow-y-auto max-h-[250px]">
                          <Table>
                            <TableHeader className="bg-white sticky top-0 z-10">
                              <TableRow className="bg-slate-100/50 h-8">
                                <TableHead className="text-[10px] h-8 px-3">Tanggal</TableHead>
                                <TableHead className="text-[10px] h-8">Menu</TableHead>
                                <TableHead className="text-[10px] h-8 text-center text-blue-600">Qty</TableHead>
                                <TableHead className="text-[10px] h-8 text-right px-3"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orderItems.map((item) => (
                                <TableRow key={item.id} className="bg-white">
                                  <TableCell className="py-2 text-[11px] px-3">
                                    {format(new Date(item.date), "EEE, dd MMM")}
                                  </TableCell>
                                  <TableCell className="py-2 text-[11px]">
                                    <div className="flex flex-col">
                                      <span className="font-bold">{item.menuName}</span>
                                      {item.note && <span className="text-[9px] text-blue-600 italic">"{item.note}"</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 text-center font-black text-blue-600 font-mono">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="py-2 text-right px-3">
                                    <Button 
                                      variant="ghost" size="icon" 
                                      onClick={() => removeItemFromOrder(item.id)}
                                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-slate-50 rounded-b-lg border-t space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">Metode Pembayaran</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-9 w-full sm:w-[180px] text-xs bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH_PAY_LATER">Bayar di Sekolah</SelectItem>
                          <SelectItem value="TRANSFER">Transfer Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {paymentMethod === 'TRANSFER' && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-blue-600 font-bold">Unggah Bukti Transfer</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleProofChange}
                            className="h-9 text-[10px] w-full sm:w-[200px] bg-blue-50 border-blue-200"
                          />
                          {proofImage && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-left sm:text-right flex justify-between sm:block items-center bg-white sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0">
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Total Harga Siswa</p>
                    <p className="text-xl font-black text-slate-900 leading-tight">
                      Rp {orderSubtotal.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <Button variant="outline" className="w-full sm:flex-1 h-11 text-xs font-bold" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
                    <Button 
                        className="w-full sm:flex-[2] bg-blue-600 hover:bg-blue-700 h-11 text-sm font-bold shadow-lg shadow-blue-200" 
                        onClick={handleAddOrder} 
                        disabled={isSubmitting || orderItems.length === 0}
                    >
                        {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Simpan & Buat {orderItems.length} Pesanan
                    </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="h-10 w-[1px] bg-slate-200 mx-2 hidden md:block" />

          {/* Filter Status & Payment */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-10 border-slate-200 bg-white shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAID">Lunas</SelectItem>
              <SelectItem value="COMPLETED">Selesai</SelectItem>
              <SelectItem value="CANCELLED">Batal</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="w-[140px] h-10 border-slate-200 bg-white shadow-sm">
              <SelectValue placeholder="Metode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Metode Bayar</SelectItem>
              <SelectItem value="TRANSFER">Transfer</SelectItem>
              <SelectItem value="PAY_LATER">Pay Later</SelectItem>
            </SelectContent>
          </Select>
          
          <Button size="icon" variant="outline" className="h-10 w-10 text-primary border-slate-200" onClick={() => fetchOrders(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Cari nama siswa atau kelas..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="pl-9 h-10 bg-white"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Siswa</TableHead>
              <TableHead>Metode Bayar</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : paginatedOrders.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">Tidak ada data.</TableCell></TableRow>
            ) : (
              paginatedOrders.map((order) => {
                const isCancelRequested = order.cancelStatus === 'PENDING';
                return (
                  <TableRow key={order.id} className={isCancelRequested ? "bg-orange-50/50" : ""}>
                    <TableCell className="font-medium">#{order.id.slice(-8).toUpperCase()}</TableCell>
                    <TableCell>
                      <div className="font-bold">{order.student?.name}</div>
                      <div className="text-xs text-muted-foreground">{order.student?.class}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.paymentMethod === "CASH_PAY_LATER" ? "Pay Later" : "Transfer"}</Badge>
                    </TableCell>
                    <TableCell>Rp {order.totalAmount.toLocaleString("id-ID")}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {order.status === "PAID" && <Badge className="bg-green-600">Lunas</Badge>}
                        {order.status === "PENDING" && <Badge variant="secondary">Pending</Badge>}
                        {order.status === "CANCELLED" && <Badge variant="destructive">Batal</Badge>}
                        {order.status === "COMPLETED" && <Badge variant="outline">Selesai</Badge>}
                        
                        {isCancelRequested && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600 bg-orange-50 animate-pulse">
                            Minta Pembatalkan
                          </Badge>
                        )}
                        {order.isProofInvalid && <Badge variant="destructive" className="text-[10px]">Bukti Ditolak</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <Button 
                            variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1"
                            onClick={() => setSelectedOrderForDetail(order)}
                        >
                            <Eye className="h-3 w-3" /> Detail
                        </Button>

                        {/* Aksi Pembatalan */}
                        {isCancelRequested && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-orange-600 border-orange-200">Review Batal</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Review Pengajuan Pembatalan</DialogTitle>
                              </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="bg-muted p-3 rounded-lg border">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Alasan Siswa:</label>
                                    <p className="text-sm font-semibold mt-1">
                                      {order.cancelReason?.startsWith('LAINNYA:') 
                                        ? order.cancelReason.replace('LAINNYA:', '').trim() 
                                        : order.cancelReason === 'VENDOR_LATE' 
                                          ? 'Vendor Terlambat Datang' 
                                          : order.cancelReason === 'DEFECTIVE_FOOD' 
                                            ? 'Makanan Cacat Produksi' 
                                            : order.cancelReason}
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Makanan yang Dibatalkan:</label>
                                    <div className="space-y-2 border rounded-lg p-2 bg-muted/30">
                                      {order.items?.filter((i: any) => i.cancelStatus === 'PENDING').map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center text-xs p-1.5 border-b last:border-0">
                                          <div className="flex flex-col">
                                            <span className="font-bold">{item.menu?.name}</span>
                                            <span className="text-[10px] text-muted-foreground">{format(new Date(item.date), "EEEE, dd MMM")}</span>
                                          </div>
                                          <span className="font-mono font-bold text-primary">Rp {(item.price + item.adminFee).toLocaleString("id-ID")}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {order.cancelImage && (
                                    <div>
                                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bukti Foto:</label>
                                      <img src={order.cancelImage} className="mt-2 rounded-lg border max-h-64 w-full object-contain bg-white" alt="Bukti Cacat" />
                                    </div>
                                  )}
                                </div>
                                <DialogFooter className="gap-2">
                                  <Button variant="ghost" className="text-xs" onClick={() => handleCancelRequest(order.id, 'REJECT_CANCEL')}>Tolak Pembatalan</Button>
                                  <Button variant="destructive" className="text-xs font-bold" onClick={() => handleCancelRequest(order.id, 'APPROVE_CANCEL')}>Setujui & Batalkan</Button>
                                </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        {/* Tombol Lihat Bukti (Tersedia untuk semua status asalkan metode TRANSFER dan ada bukti) */}
                        {order.paymentMethod === "TRANSFER" && order.proofImage && (
                          <Button size="icon" variant="outline" className="h-8 w-8 text-blue-600 mr-1" onClick={() => setSelectedProof(order.proofImage)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Aksi Pembayaran */}
                        {order.status === "PENDING" && order.paymentMethod === "TRANSFER" && order.proofImage && !order.isProofInvalid && (
                          <div className="flex gap-1">
                            <ConfirmButton title="Tolak Bukti Transfer?" description="Siswa akan diminta mengunggah ulang bukti transfer." onConfirm={() => handleRejectProof(order.id, "Bukti transfer tidak valid/salah foto")} variant="destructive">
                              <Button size="icon" variant="outline" className="h-8 w-8 text-red-600"><XCircle className="h-4 w-4" /></Button>
                            </ConfirmButton>

                            <ConfirmButton title="Konfirmasi Lunas?" onConfirm={() => confirmPayment(order.id)}>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8">Lunas</Button>
                            </ConfirmButton>
                          </div>
                        )}

                        {/* Tombol Refund (Admin) */}
                        {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && order.cancelStatus !== 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                            onClick={() => openRefundDialog(order)}
                          >
                            <RotateCcw className="h-3 w-3" /> Refund
                          </Button>
                        )}

                        {order.status === "PENDING" && order.paymentMethod === "CASH_PAY_LATER" && (
                          <ConfirmButton title="Konfirmasi Lunas?" onConfirm={() => confirmPayment(order.id)}>
                            <Button size="sm" className="h-8">Set Lunas</Button>
                          </ConfirmButton>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border">
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Lihat per:</span>
            <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                <SelectTrigger className="w-20 h-9 border-slate-200">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">data</span>
        </div>

        <div className="flex items-center gap-1">
            <Button 
                variant="outline" size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 px-3"
            >
                Prev
            </Button>
            <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Simple page numbers logic
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                        pageNum = currentPage - 2 + i;
                        if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    if (pageNum <= 0) return null;
                    if (pageNum > totalPages) return null;

                    return (
                        <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn("h-9 w-9 p-0", currentPage === pageNum ? "bg-blue-600" : "")}
                        >
                            {pageNum}
                        </Button>
                    );
                })}
            </div>
            <Button 
                variant="outline" size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-9 px-3"
            >
                Next
            </Button>
        </div>

        <div className="text-xs text-muted-foreground">
            Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredOrders.length)} dari {filteredOrders.length} data
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedOrderForDetail} onOpenChange={(open) => !open && setSelectedOrderForDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center pr-8">
              <span>Detail Transaksi #{selectedOrderForDetail?.id.slice(-8).toUpperCase()}</span>
              {selectedOrderForDetail && (
                <Badge variant={selectedOrderForDetail.status === 'PAID' ? 'default' : 'secondary'}>
                    {selectedOrderForDetail.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrderForDetail && (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div>
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Pemesan</Label>
                        <p className="font-bold text-slate-900">{selectedOrderForDetail.student?.name}</p>
                        <p className="text-xs text-slate-600 uppercase">{selectedOrderForDetail.student?.class}</p>
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Metode Pembayaran</Label>
                        <p className="font-bold text-slate-900">{selectedOrderForDetail.paymentMethod === 'TRANSFER' ? 'Transfer Bank' : 'Bayar di Sekolah'}</p>
                        <p className="text-xs text-slate-600">Waktu Order: {format(new Date(selectedOrderForDetail.createdAt), "dd MMM yyyy HH:mm")}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase text-blue-600">Rincian Menu</Label>
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="text-[10px]">Tgl Antar</TableHead>
                                    <TableHead className="text-[10px]">Item</TableHead>
                                    <TableHead className="text-[10px] text-center">Qty</TableHead>
                                    <TableHead className="text-[10px] text-right">Harga</TableHead>
                                    <TableHead className="text-[10px] text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedOrderForDetail.items?.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="text-xs">{format(new Date(item.date), "dd/MM/yyyy")}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold">{item.menuName || item.menu?.name}</span>
                                                <span className="text-[10px] text-muted-foreground italic">{item.vendorName || item.menu?.vendor?.vendorName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center text-xs font-bold">{item.quantity}</TableCell>
                                        <TableCell className="text-right text-xs">Rp {(item.price + item.adminFee).toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-xs font-bold">Rp {((item.price + item.adminFee) * item.quantity).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <div className="flex flex-col items-end">
                        <p className="text-xs text-muted-foreground">Total Keseluruhan</p>
                        <p className="text-2xl font-black text-blue-600">Rp {selectedOrderForDetail.totalAmount.toLocaleString()}</p>
                    </div>
                </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrderForDetail(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedProof} onOpenChange={(open) => !open && setSelectedProof(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Bukti Transfer</DialogTitle></DialogHeader>
          {selectedProof && <img src={selectedProof} className="w-full rounded-lg border shadow-sm" alt="Bukti" />}
          <Button variant="secondary" className="w-full mt-4" onClick={() => setSelectedProof(null)}>Tutup</Button>
        </DialogContent>
      </Dialog>

      {/* Dialog Refund (Admin) */}
      <Dialog open={isRefundOpen} onOpenChange={setIsRefundOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <RotateCcw className="h-5 w-5" /> Proses Refund Pesanan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Info pesanan */}
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
              <p className="font-bold text-red-700">{refundOrder?.student?.name}</p>
              <p className="text-xs text-red-500">Invoice #{refundOrder?.id?.slice(-8).toUpperCase()} · Rp {refundOrder?.totalAmount?.toLocaleString("id-ID")}</p>
            </div>

            {/* Pilih item */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Pilih Item yang Direfund:</Label>
              <div className="space-y-1.5 max-h-44 overflow-auto border rounded-lg p-2 bg-muted/20">
                {refundOrder?.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                    <input
                      type="checkbox"
                      id={`ri-${item.id}`}
                      className="h-4 w-4"
                      checked={refundItems.includes(item.id)}
                      onChange={(e) => setRefundItems(e.target.checked
                        ? [...refundItems, item.id]
                        : refundItems.filter(id => id !== item.id)
                      )}
                    />
                    <label htmlFor={`ri-${item.id}`} className="flex-1 text-sm cursor-pointer">
                      {item.menuName || "Menu"}
                      <span className="block text-[10px] text-muted-foreground">
                        {item.vendorName} · {format(new Date(item.date), "dd MMM yyyy")}
                      </span>
                    </label>
                    <span className="text-xs font-bold">Rp {(item.price + item.adminFee).toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alasan */}
            <div className="space-y-2">
              <Label>Alasan Refund</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VENDOR_LATE">Vendor Terlambat / Tidak Datang</SelectItem>
                  <SelectItem value="DEFECTIVE_FOOD">Makanan Cacat Produksi</SelectItem>
                  <SelectItem value="OTHER">Alasan Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {refundReason === 'OTHER' && (
              <div className="space-y-2">
                <Label>Detail Alasan</Label>
                <Input placeholder="Tulis alasan..." value={refundOther} onChange={(e) => setRefundOther(e.target.value)} />
              </div>
            )}

            {refundReason === 'DEFECTIVE_FOOD' && (
              <div className="space-y-2">
                <Label>Foto Bukti (opsional)</Label>
                <Input type="file" accept="image/*" onChange={handleRefundImageChange} />
                {refundImage && <img src={refundImage} className="mt-2 h-32 w-full object-cover rounded-md border" alt="Preview" />}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsRefundOpen(false)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={submittingRefund || refundItems.length === 0}
              onClick={handleAdminRefund}
              className="gap-2"
            >
              {submittingRefund ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Proses Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
