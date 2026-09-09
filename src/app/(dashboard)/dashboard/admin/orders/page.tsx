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
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Loader2, Plus, Search, User, Calendar,
  ChevronRight, Filter, Eye, XCircle, CheckCircle2,
  Trash2, AlertCircle, FileText, CheckCircle,
  LayoutGrid, Utensils, CalendarClock, UserPlus, RotateCcw,
  ExternalLink
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
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders"

// Helper: format timestamp ke WIB menggunakan Intl.DateTimeFormat.formatToParts
// Paling reliable — timezone eksplisit, tidak bergantung pada browser/OS
const WIB_MONTHS: Record<string, string> = {
  January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr', May: 'Mei',
  June: 'Jun', July: 'Jul', August: 'Ags', September: 'Sep',
  October: 'Okt', November: 'Nov', December: 'Des'
}
function formatWIB(isoString: string) {
  const d = new Date(isoString)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const month = WIB_MONTHS[get('month')] ?? get('month')
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('day')} ${month} ${get('year')}, ${hour}:${get('minute')} WIB`
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [filterPayment, setFilterPayment] = useState("ALL")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [selectedProof, setSelectedProof] = useState<string | null>(null)
  const [adminFee, setAdminFee] = useState<number>(1000)
  const [serviceFee, setServiceFee] = useState<number>(0)
  const [searchName, setSearchName] = useState("")

  // States for Refund (Admin)
  const [isRefundOpen, setIsRefundOpen] = useState(false)
  const [refundOrder, setRefundOrder] = useState<any>(null)
  const [refundItems, setRefundItems] = useState<string[]>([])
  const [refundReason, setRefundReason] = useState("VENDOR_LATE")
  const [refundOther, setRefundOther] = useState("")
  const [refundImage, setRefundImage] = useState<string | null>(null)
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

  // States for Edit Order
  const [isEditMode, setIsEditMode] = useState(false)
  const [editPaymentMethod, setEditPaymentMethod] = useState("CASH_PAY_LATER")
  const [editOrderItems, setEditOrderItems] = useState<any[]>([])
  const [editItemForm, setEditItemForm] = useState({
    menuId: "",
    date: "",
    quantity: 1,
    note: ""
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (selectedOrderForDetail) {
      setEditPaymentMethod(selectedOrderForDetail.paymentMethod)
      setEditOrderItems(selectedOrderForDetail.items || [])
      setIsEditMode(false)
      setEditItemForm({ menuId: "", date: "", quantity: 1, note: "" })
    }
  }, [selectedOrderForDetail])

  // Realtime listener for orders & order items
  useRealtimeOrders({
    role: "ADMIN",
    showToast: false, // Toast handled globally by RealtimeNotificationProvider in layout
    onNewOrder: () => fetchOrders(true),
    onOrderUpdated: () => fetchOrders(true),
    onOrderItemChanged: () => fetchOrders(true),
  })

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
      if (data.serviceFee !== undefined) setServiceFee(data.serviceFee)
    } catch { }
  }

  async function fetchStudents() {
    try {
      const res = await fetch("/api/admin/users/students")
      if (res.ok) setStudents(await res.json())
    } catch { }
  }

  async function fetchMenus() {
    try {
      const res = await fetch("/api/admin/menus")
      if (res.ok) setAvailableMenus(await res.json())
    } catch { }
  }

  const filteredStudents = studentSearch.length > 1
    ? students.filter(s =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.nis?.includes(studentSearch)
    ).slice(0, 5)
    : []

  const DAY_ORDER: Record<string, number> = {
    "Senin": 1,
    "Selasa": 2,
    "Rabu": 3,
    "Kamis": 4,
    "Jumat": 5,
    "Sabtu": 6,
    "Minggu": 7
  }

  const sortedMenus = [...availableMenus].sort((a, b) => {
    const getMinDayOrder = (menu: any) => {
      if (!menu.availableDays || menu.availableDays.length === 0) {
        return 0; // "Semua Hari" at the top
      }
      const indexes = menu.availableDays.map((day: string) => DAY_ORDER[day] ?? 99)
      return Math.min(...indexes)
    }

    const orderA = getMinDayOrder(a)
    const orderB = getMinDayOrder(b)

    if (orderA !== orderB) {
      return orderA - orderB
    }
    return (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" })
  })

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

  function addEditItem() {
    if (!editItemForm.menuId || !editItemForm.date) {
      return toast.error("Pilih menu dan tanggal terlebih dahulu")
    }
    const menu = availableMenus.find(m => m.id === editItemForm.menuId)
    if (!menu) return

    const newItem = {
      menuId: editItemForm.menuId,
      date: editItemForm.date,
      quantity: editItemForm.quantity,
      note: editItemForm.note || null,
      menuName: menu.name,
      price: menu.price, // Harga vendor
      vendorName: menu.vendor?.vendorName || menu.vendor?.name || "Anonim",
      vendorId: menu.vendorId,
      id: Math.random().toString(36).substr(2, 9)
    }

    setEditOrderItems([...editOrderItems, newItem])
    setEditItemForm({ ...editItemForm, menuId: "", note: "" })
    toast.success("Ditambahkan ke daftar edit")
  }

  function removeEditItem(id: string) {
    setEditOrderItems(editOrderItems.filter(item => item.id !== id))
  }

  async function handleSaveEdit() {
    if (editOrderItems.length === 0) {
      return toast.error("Daftar pesanan tidak boleh kosong")
    }

    setSavingEdit(true)
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        body: JSON.stringify({
          orderId: selectedOrderForDetail.id,
          type: "EDIT_ORDER",
          paymentMethod: editPaymentMethod,
          items: editOrderItems.map(item => ({
            menuId: item.menuId,
            date: item.date,
            quantity: item.quantity,
            note: item.note,
            price: item.price,
            menuName: item.menuName,
            vendorName: item.vendorName,
            vendorId: item.vendorId
          }))
        })
      })

      if (res.ok) {
        toast.success("Pesanan berhasil diperbarui")
        setIsEditMode(false)
        setSelectedOrderForDetail(null)
        fetchOrders()
      } else {
        const data = await res.json()
        toast.error(data.error || "Gagal memperbarui pesanan")
      }
    } catch {
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteOrder(orderId: string) {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/orders?orderId=${orderId}`, {
        method: "DELETE"
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Pesanan berhasil dihapus permanen dari database")
        setSelectedOrderForDetail(null)
        setIsEditMode(false)
        fetchOrders()
      } else {
        toast.error(data.error || "Gagal menghapus pesanan")
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat menghapus pesanan")
    } finally {
      setIsDeleting(false)
    }
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

  const orderItemsSubtotal = orderItems.reduce((acc, item) => acc + ((item.price + adminFee) * item.quantity), 0)
  const orderSubtotal = orderItemsSubtotal + (orderItems.length > 0 ? serviceFee : 0)

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
    const activeItems = order.items?.filter((i: any) => i.cancelStatus !== 'APPROVED') || []
    if (activeItems.length === 0) {
      return toast.error("Semua item dalam pesanan ini sudah direfund")
    }
    setRefundOrder(order)
    setRefundItems(activeItems.map((i: any) => i.id))
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
    if (filterDateFrom) {
      const orderDate = new Date(order.createdAt)
      const from = new Date(filterDateFrom)
      from.setHours(0, 0, 0, 0)
      if (orderDate < from) return false;
    }
    if (filterDateTo) {
      const orderDate = new Date(order.createdAt)
      const to = new Date(filterDateTo)
      to.setHours(23, 59, 59, 999)
      if (orderDate > to) return false;
    }
    return true;
  })

  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, filterPayment, searchName, filterDateFrom, filterDateTo])

  const todayStr = format(new Date(), "yyyy-MM-dd")
  const sevenDaysAgoStr = format(subDays(new Date(), 6), "yyyy-MM-dd")
  const startMonthStr = format(startOfMonth(new Date()), "yyyy-MM-dd")
  const endMonthStr = format(endOfMonth(new Date()), "yyyy-MM-dd")

  const isPresetToday = filterDateFrom === todayStr && filterDateTo === todayStr
  const isPreset7Days = filterDateFrom === sevenDaysAgoStr && filterDateTo === todayStr
  const isPresetMonth = filterDateFrom === startMonthStr && filterDateTo === endMonthStr

  const handleSetPresetToday = () => {
    if (isPresetToday) {
      setFilterDateFrom("")
      setFilterDateTo("")
    } else {
      setFilterDateFrom(todayStr)
      setFilterDateTo(todayStr)
    }
  }

  const handleSetPreset7Days = () => {
    if (isPreset7Days) {
      setFilterDateFrom("")
      setFilterDateTo("")
    } else {
      setFilterDateFrom(sevenDaysAgoStr)
      setFilterDateTo(todayStr)
    }
  }

  const handleSetPresetMonth = () => {
    if (isPresetMonth) {
      setFilterDateFrom("")
      setFilterDateTo("")
    } else {
      setFilterDateFrom(startMonthStr)
      setFilterDateTo(endMonthStr)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 bg-white p-4 sm:p-6 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Data Pemesanan</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">Kelola status pembayaran dan pesanan siswa.</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 h-10 px-3 sm:px-4 gap-1.5 shrink-0" title="Tambah Pesanan">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Tambah Pesanan</span>
              </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="max-w-4xl lg:max-w-5xl p-0 max-h-[92vh] flex flex-col gap-0 border-none sm:border overflow-hidden rounded-2xl shadow-2xl">
              <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b bg-white">
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                  <span>Buat Pesanan Manual (Admin)</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5 ml-11">
                  Pilih siswa, tentukan menu harian, dan konfirmasi pesanan katering secara manual.
                </p>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
                  
                  {/* KOLOM KIRI: Step 1 (Pilih Siswa) & Step 2 (Form Tambah Menu) */}
                  <div className="md:col-span-7 space-y-4 sm:space-y-5">
                    
                    {/* Step 1: Pilih Siswa */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
                          <span className="bg-blue-600 text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                          Pilih Siswa
                        </Label>
                        {selectedStudent && (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 font-medium">
                            Siswa Terpilih
                          </Badge>
                        )}
                      </div>

                      {!selectedStudent ? (
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Ketik Nama atau NIS siswa..."
                              value={studentSearch}
                              onChange={(e) => setStudentSearch(e.target.value)}
                              className="pl-9 h-10 bg-slate-50/70 border-slate-200 text-sm focus:bg-white"
                            />
                          </div>

                          {filteredStudents.length > 0 && (
                            <div className="absolute z-20 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 divide-y divide-slate-100">
                              {filteredStudents.map(s => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedStudent(s)
                                    setStudentSearch("")
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 transition-colors flex items-center justify-between group"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-xs sm:text-sm text-slate-800 group-hover:text-blue-600 transition-colors">{s.name}</span>
                                    <span className="text-[10px] text-slate-400">NIS: {s.nis || '-'}</span>
                                  </div>
                                  <Badge variant="secondary" className="text-[10px] font-medium bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-700">
                                    {s.class}
                                  </Badge>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-blue-50/60 border border-blue-200/80 p-3 rounded-xl flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {selectedStudent.name?.charAt(0)?.toUpperCase() || "S"}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-blue-950 leading-tight">{selectedStudent.name}</span>
                              <span className="text-[11px] text-blue-700/80 font-medium">Kelas {selectedStudent.class}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStudent(null)}
                            className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100/70 px-2.5 text-xs font-semibold rounded-lg"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Ganti
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Tambah Menu */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
                        <span className="bg-blue-600 text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                        Tambah Menu ke Daftar
                      </Label>

                      {!selectedStudent ? (
                        <div className="py-6 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                          <User className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
                          <p className="text-xs text-slate-500 font-medium">Pilih siswa terlebih dahulu pada Langkah 1 untuk memilih menu.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Pilih Menu */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold text-slate-600">Pilih Menu Katering</Label>
                            <Select value={itemForm.menuId} onValueChange={(val) => setItemForm({ ...itemForm, menuId: val })}>
                              <SelectTrigger className="bg-white min-h-[48px] h-auto text-xs sm:text-sm border-slate-200 w-full py-2 px-3 text-left [&>span]:w-full [&>span]:line-clamp-none whitespace-normal">
                                <SelectValue placeholder="Pilih menu katering..." />
                              </SelectTrigger>
                              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] min-w-[280px] max-h-60">
                                {sortedMenus.map(m => (
                                  <SelectItem key={m.id} value={m.id} className="cursor-pointer py-2 w-full">
                                    <div className="w-full min-w-0 flex flex-col gap-1 pr-1 text-left">
                                      <div className="flex items-center justify-between gap-3 w-full min-w-0">
                                        <span className="font-semibold text-xs sm:text-sm text-slate-800 truncate flex-1 min-w-0" title={m.name}>
                                          {m.name}
                                        </span>
                                        <span className="font-bold text-xs text-blue-600 shrink-0 tabular-nums">
                                          Rp {(m.price + adminFee).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 w-full min-w-0">
                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                          {m.vendor?.vendorName || m.vendor?.name || "Anonim"}
                                        </span>
                                        <span className="text-slate-400 font-bold">•</span>
                                        <span className="text-slate-500 font-medium truncate">
                                          Hari: {m.availableDays && m.availableDays.length > 0 ? m.availableDays.join(", ") : "Semua Hari"}
                                        </span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Grid Tanggal Makan & Jumlah Porsi */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-semibold text-slate-600">Tanggal Makan</Label>
                              <Input
                                type="date"
                                value={itemForm.date}
                                onChange={(e) => setItemForm({ ...itemForm, date: e.target.value })}
                                className="bg-white h-10 text-xs sm:text-sm border-slate-200"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-semibold text-slate-600">Jumlah (Porsi)</Label>
                              <Input
                                type="number"
                                min="1"
                                value={itemForm.quantity}
                                onChange={(e) => setItemForm({ ...itemForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="bg-white h-10 text-xs sm:text-sm border-slate-200"
                              />
                            </div>
                          </div>

                          {/* Catatan Khusus */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold text-slate-600">Catatan Khusus (Opsional)</Label>
                            <Input
                              placeholder="Contoh: Tidak pedas, kuah dipisah, dll..."
                              value={itemForm.note}
                              onChange={(e) => setItemForm({ ...itemForm, note: e.target.value })}
                              className="bg-white h-10 text-xs sm:text-sm border-slate-200"
                            />
                          </div>

                          <Button
                            type="button"
                            onClick={addItemToOrder}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold h-10 text-xs sm:text-sm shadow-sm gap-1.5 mt-1"
                          >
                            <Plus className="h-4 w-4" />
                            Tambah ke Daftar Pesanan
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KOLOM KANAN: Daftar Pesanan, Pembayaran & Total */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                      
                      {/* Header Ringkasan Pesanan */}
                      <div className="flex justify-between items-center pb-2.5 border-b">
                        <div className="flex items-center gap-1.5">
                          <Utensils className="h-4 w-4 text-slate-600" />
                          <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Daftar Pesanan ({orderItems.length})
                          </Label>
                        </div>
                        {orderItems.length > 0 && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            {orderItems.reduce((acc, item) => acc + item.quantity, 0)} Total Porsi
                          </span>
                        )}
                      </div>

                      {/* List Item Pesanan */}
                      <div className="min-h-[140px] max-h-[220px] md:max-h-[250px] overflow-y-auto space-y-2 pr-0.5">
                        {orderItems.length === 0 ? (
                          <div className="h-[140px] flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl bg-slate-50/60">
                            <Utensils className="h-7 w-7 text-slate-300 mb-1.5" />
                            <p className="text-xs font-medium text-slate-500">Keranjang masih kosong</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Tambahkan menu di formulir sebelah kiri</p>
                          </div>
                        ) : (
                          orderItems.map((item) => (
                            <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg flex items-start justify-between gap-2 hover:border-slate-300 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50/80 text-blue-700 border-blue-200 font-semibold shrink-0">
                                    {format(new Date(item.date), "EEE, dd MMM")}
                                  </Badge>
                                  <span className="font-bold text-xs text-slate-800 truncate">{item.menuName}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                  <span className="font-semibold text-blue-600">{item.quantity} porsi</span>
                                  <span>•</span>
                                  <span>Rp {((item.price + adminFee) * item.quantity).toLocaleString()}</span>
                                </div>
                                {item.note && (
                                  <p className="text-[10px] text-amber-600 italic bg-amber-50/60 px-1.5 py-0.5 rounded mt-1 line-clamp-1">
                                    "{item.note}"
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItemFromOrder(item.id)}
                                className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                title="Hapus menu"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Metode Pembayaran */}
                      <div className="pt-3 border-t space-y-2.5">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-slate-600">Metode Pembayaran</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="h-9 w-full text-xs bg-slate-50/70 border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CASH_PAY_LATER">Bayar di Sekolah (Tunai)</SelectItem>
                              <SelectItem value="TRANSFER">Transfer Manual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {paymentMethod === 'TRANSFER' && (
                          <div className="space-y-1.5 animate-in fade-in">
                            <Label className="text-[11px] font-semibold text-blue-600">Unggah Bukti Transfer</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={handleProofChange}
                                className="h-9 text-[10px] flex-1 bg-blue-50/50 border-blue-200 file:mr-2 file:text-xs"
                              />
                              {proofImage && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Total Harga Box */}
                      <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-2 shadow-sm">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Subtotal Menu ({orderItems.reduce((acc, i) => acc + i.quantity, 0)} porsi)</span>
                          <span>Rp {orderItemsSubtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Biaya Layanan</span>
                          <span>Rp {serviceFee.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-slate-700 pt-2 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total Tagihan</span>
                            <span className="text-xs text-slate-300">{orderItems.length} menu katering</span>
                          </div>
                          <span className="text-lg sm:text-xl font-black text-white">
                            Rp {orderSubtotal.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <Button
                          variant="outline"
                          className="w-full sm:w-1/3 h-10 text-xs font-semibold border-slate-200 hover:bg-slate-100"
                          onClick={() => setIsAddModalOpen(false)}
                        >
                          Batal
                        </Button>
                        <Button
                          className="w-full sm:w-2/3 bg-blue-600 hover:bg-blue-700 text-white h-10 text-xs sm:text-sm font-bold shadow-md shadow-blue-200 gap-1.5"
                          onClick={handleAddOrder}
                          disabled={isSubmitting || orderItems.length === 0 || !selectedStudent}
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Simpan & Buat Pesanan
                        </Button>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden md:block" />

          {/* Filter Status & Payment */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="flex-1 md:w-[140px] md:flex-initial h-10 border-slate-200 bg-white shadow-sm text-xs sm:text-sm">
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
            <SelectTrigger className="flex-1 md:w-[140px] md:flex-initial h-10 border-slate-200 bg-white shadow-sm text-xs sm:text-sm">
              <SelectValue placeholder="Metode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Metode Bayar</SelectItem>
              <SelectItem value="TRANSFER">Transfer</SelectItem>
              <SelectItem value="PAY_LATER">Pay Later</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* 1. Search Bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama siswa atau kelas..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-9 pr-9 h-10 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border-slate-200 text-xs sm:text-sm rounded-lg transition-colors"
            />
            {searchName && (
              <button
                type="button"
                onClick={() => setSearchName("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                title="Hapus pencarian"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* 2. Date Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Date Inputs */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50/90 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:bg-white focus-within:border-blue-400 transition-colors">
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Dari</span>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="text-xs bg-transparent border-none outline-none focus:ring-0 p-0 text-slate-700 w-full min-w-0 font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50/90 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:bg-white focus-within:border-blue-400 transition-colors">
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Sampai</span>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="text-xs bg-transparent border-none outline-none focus:ring-0 p-0 text-slate-700 w-full min-w-0 font-medium"
                />
              </div>
            </div>

            {/* Quick Date Presets & Reset */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant={isPresetToday ? "default" : "outline"}
                size="sm"
                onClick={handleSetPresetToday}
                className={cn(
                  "flex-1 sm:flex-initial h-8 text-[11px] px-2.5 rounded-lg shrink-0 font-medium transition-all",
                  isPresetToday ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                Hari Ini
              </Button>
              <Button
                type="button"
                variant={isPreset7Days ? "default" : "outline"}
                size="sm"
                onClick={handleSetPreset7Days}
                className={cn(
                  "flex-1 sm:flex-initial h-8 text-[11px] px-2.5 rounded-lg shrink-0 font-medium transition-all",
                  isPreset7Days ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                7 Hari
              </Button>
              <Button
                type="button"
                variant={isPresetMonth ? "default" : "outline"}
                size="sm"
                onClick={handleSetPresetMonth}
                className={cn(
                  "flex-1 sm:flex-initial h-8 text-[11px] px-2.5 rounded-lg shrink-0 font-medium transition-all",
                  isPresetMonth ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                Bulan Ini
              </Button>

              {(filterDateFrom || filterDateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFilterDateFrom(""); setFilterDateTo("") }}
                  className="h-8 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold shrink-0 rounded-lg gap-1"
                  title="Reset filter tanggal"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              )}
            </div>
          </div>

        </div>

        {/* 3. Active Filters Chips / Summary */}
        {(filterStatus !== 'ALL' || filterPayment !== 'ALL' || searchName || filterDateFrom || filterDateTo) && (
          <div className="flex items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs">
            <span className="text-[11px] font-semibold text-slate-400">Filter Aktif:</span>
            {searchName && (
              <Badge variant="secondary" className="text-[10px] gap-1 font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Pencarian: "{searchName}"
                <button type="button" onClick={() => setSearchName("")} className="hover:text-red-500">
                  <XCircle className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterDateFrom && filterDateTo && (
              <Badge variant="secondary" className="text-[10px] gap-1 font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Tgl: {format(new Date(filterDateFrom), "dd/MM/yy")} - {format(new Date(filterDateTo), "dd/MM/yy")}
                <button type="button" onClick={() => { setFilterDateFrom(""); setFilterDateTo("") }} className="hover:text-red-500">
                  <XCircle className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterStatus !== 'ALL' && (
              <Badge variant="secondary" className="text-[10px] gap-1 font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Status: {filterStatus}
                <button type="button" onClick={() => setFilterStatus("ALL")} className="hover:text-red-500">
                  <XCircle className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterPayment !== 'ALL' && (
              <Badge variant="secondary" className="text-[10px] gap-1 font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Metode: {filterPayment === 'TRANSFER' ? 'Transfer' : 'Pay Later'}
                <button type="button" onClick={() => setFilterPayment("ALL")} className="hover:text-red-500">
                  <XCircle className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchName("")
                setFilterDateFrom("")
                setFilterDateTo("")
                setFilterStatus("ALL")
                setFilterPayment("ALL")
              }}
              className="text-[11px] text-red-500 hover:text-red-700 hover:underline font-semibold ml-auto"
            >
              Reset Semua
            </button>
          </div>
        )}
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

                        {/* Tombol Refund (Admin) - HANYA untuk status PAID dan ada item aktif */}
                        {order.status === 'PAID' && order.cancelStatus !== 'PENDING' && order.items?.some((i: any) => i.cancelStatus !== 'APPROVED') && (
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
            {(() => {
              // Compute unique page range: clamp start/end so no duplicates
              const maxShow = 5
              let start = Math.max(1, currentPage - Math.floor(maxShow / 2))
              let end = start + maxShow - 1
              if (end > totalPages) { end = totalPages; start = Math.max(1, end - maxShow + 1) }
              return Array.from({ length: end - start + 1 }, (_, i) => start + i)
            })().map(pageNum => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(pageNum)}
                className={cn("h-9 w-9 p-0", currentPage === pageNum ? "bg-blue-600" : "")}
              >
                {pageNum}
              </Button>
            ))}
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
        <DialogContent className="max-w-3xl w-[95vw] overflow-y-auto max-h-[90vh] min-w-0 [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span className="text-base font-bold">Detail Transaksi #{selectedOrderForDetail?.id.slice(-8).toUpperCase()}</span>
              {selectedOrderForDetail && (
                <Badge variant={selectedOrderForDetail.status === 'PAID' ? 'default' : 'secondary'}>
                  {selectedOrderForDetail.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedOrderForDetail && (
            isEditMode ? (
              <div className="space-y-6 w-full min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 min-w-0">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Pemesan</Label>
                    <p className="font-bold text-slate-900">{selectedOrderForDetail.student?.name}</p>
                    <p className="text-xs text-slate-600 uppercase">{selectedOrderForDetail.student?.class}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-blue-600">Metode Pembayaran</Label>
                    <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                      <SelectTrigger className="h-9 w-full bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH_PAY_LATER">Bayar di Sekolah</SelectItem>
                        <SelectItem value="TRANSFER">Transfer Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 min-w-0">
                  <Label className="text-xs font-bold uppercase text-blue-600">Tambah Menu ke Pesanan Ini</Label>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
                      <div className="space-y-1.5 sm:col-span-2 min-w-0">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Pilih Menu</Label>
                        <Select value={editItemForm.menuId} onValueChange={(val) => setEditItemForm({ ...editItemForm, menuId: val })}>
                          <SelectTrigger className="bg-white min-h-[48px] h-auto text-xs sm:text-sm border-slate-200 w-full py-2 px-3 text-left [&>span]:w-full [&>span]:line-clamp-none whitespace-normal">
                            <SelectValue placeholder="Pilih menu..." />
                          </SelectTrigger>
                          <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] min-w-[280px] max-h-60">
                            {sortedMenus.map(m => (
                              <SelectItem key={m.id} value={m.id} className="cursor-pointer py-2 w-full">
                                <div className="w-full min-w-0 flex flex-col gap-1 pr-1 text-left">
                                  <div className="flex items-center justify-between gap-3 w-full min-w-0">
                                    <span className="font-semibold text-xs sm:text-sm text-slate-800 truncate flex-1 min-w-0" title={m.name}>
                                      {m.name}
                                    </span>
                                    <span className="font-bold text-xs text-blue-600 shrink-0 tabular-nums">
                                      Rp {(m.price + adminFee).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 w-full min-w-0">
                                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                      {m.vendor?.vendorName || m.vendor?.name || "Anonim"}
                                    </span>
                                    <span className="text-slate-400 font-bold">•</span>
                                    <span className="text-slate-500 font-medium truncate">
                                      Hari: {m.availableDays && m.availableDays.length > 0 ? m.availableDays.join(", ") : "Semua Hari"}
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Tanggal Makan</Label>
                        <Input
                          type="date"
                          value={editItemForm.date}
                          onChange={(e) => setEditItemForm({ ...editItemForm, date: e.target.value })}
                          className="bg-white w-full"
                        />
                      </div>
                      <div className="space-y-1.5 min-w-0">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Jumlah (Porsi)</Label>
                        <Input
                          type="number" min="1"
                          value={editItemForm.quantity}
                          onChange={(e) => setEditItemForm({ ...editItemForm, quantity: parseInt(e.target.value) || 1 })}
                          className="bg-white w-full"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 items-end min-w-0">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Catatan Khusus</Label>
                        <Input
                          placeholder="Tidak pedas, dll..."
                          value={editItemForm.note}
                          onChange={(e) => setEditItemForm({ ...editItemForm, note: e.target.value })}
                          className="bg-white h-10 w-full"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={addEditItem}
                        className="bg-slate-800 hover:bg-slate-900 h-10 px-4 sm:px-6 text-xs whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-4 w-4 sm:mr-2" />
                        Tambah
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 min-w-0 w-full">
                  <Label className="text-xs font-bold uppercase text-blue-600">Rincian Menu ({editOrderItems.length})</Label>
                  <div className="border rounded-xl shadow-sm bg-white overflow-x-auto w-full max-w-full min-w-0">
                    <Table className="min-w-[520px] w-full">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[10px] whitespace-nowrap">Tgl Antar</TableHead>
                          <TableHead className="text-[10px]">Item</TableHead>
                          <TableHead className="text-[10px] text-center whitespace-nowrap">Qty</TableHead>
                          <TableHead className="text-[10px] text-right whitespace-nowrap">Harga</TableHead>
                          <TableHead className="text-[10px] text-right hidden sm:table-cell whitespace-nowrap">Total</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editOrderItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                              Belum ada menu. Tambahkan menu katering di atas.
                            </TableCell>
                          </TableRow>
                        ) : (
                          editOrderItems.map((item: any, idx: number) => (
                            <TableRow key={item.id || idx}>
                              <TableCell className="text-xs whitespace-nowrap">
                                <Input
                                  type="date"
                                  value={item.date ? new Date(item.date).toISOString().slice(0, 10) : ""}
                                  onChange={(e) => {
                                    const newItems = [...editOrderItems]
                                    newItems[idx].date = e.target.value
                                    setEditOrderItems(newItems)
                                  }}
                                  className="h-8 py-0.5 px-2 text-xs w-[130px] inline-block bg-white"
                                />
                              </TableCell>
                              <TableCell className="min-w-[120px] max-w-[160px] sm:max-w-[220px]">
                                <div className="flex flex-col min-w-0">
                                  <span
                                    className="text-xs font-bold truncate block"
                                    title={item.menuName || item.menu?.name}
                                  >
                                    {item.menuName || item.menu?.name}
                                  </span>
                                  <span
                                    className="text-[10px] text-muted-foreground italic truncate block"
                                    title={item.vendorName || item.menu?.vendor?.vendorName}
                                  >
                                    {item.vendorName || item.menu?.vendor?.vendorName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-xs whitespace-nowrap">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newItems = [...editOrderItems]
                                    newItems[idx].quantity = parseInt(e.target.value) || 1
                                    setEditOrderItems(newItems)
                                  }}
                                  className="h-8 py-0.5 px-2 text-xs w-16 text-center inline-block bg-white"
                                />
                              </TableCell>
                              <TableCell className="text-right text-xs whitespace-nowrap">Rp {(item.price + (item.adminFee || adminFee)).toLocaleString()}</TableCell>
                              <TableCell className="text-right text-xs font-bold hidden sm:table-cell whitespace-nowrap">Rp {((item.price + (item.adminFee || adminFee)) * item.quantity).toLocaleString()}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <Button
                                  variant="ghost" size="icon"
                                  onClick={() => removeEditItem(item.id)}
                                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t gap-4 flex-wrap min-w-0">
                  <div className="flex flex-col gap-1 w-full sm:w-auto min-w-0">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Catatan Khusus (Notes)</Label>
                    <Input
                      placeholder="Catatan keseluruhan..."
                      value={selectedOrderForDetail.adminNote || ""}
                      onChange={(e) => {
                        setSelectedOrderForDetail({ ...selectedOrderForDetail, adminNote: e.target.value })
                      }}
                      className="h-9 w-full sm:w-[280px]"
                    />
                  </div>
                  <div className="flex flex-col items-end shrink-0 ml-auto">
                    <p className="text-xs text-muted-foreground font-semibold">Total Keseluruhan</p>
                    <p className="text-2xl font-black text-blue-600">
                      Rp {(editOrderItems.reduce((acc, item) => acc + ((item.price + (item.adminFee || adminFee)) * item.quantity), 0) + (selectedOrderForDetail?.serviceFee || 0)).toLocaleString()}
                    </p>
                    {(selectedOrderForDetail?.serviceFee || 0) > 0 && (
                      <span className="text-[10px] text-slate-500">Termasuk Biaya Layanan Rp {selectedOrderForDetail.serviceFee.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Pemesan</Label>
                    <p className="font-bold text-slate-900">{selectedOrderForDetail.student?.name}</p>
                    <p className="text-xs text-slate-600 uppercase">{selectedOrderForDetail.student?.class}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Metode Pembayaran</Label>
                    <p className="font-bold text-slate-900">{selectedOrderForDetail.paymentMethod === 'TRANSFER' ? 'Transfer Bank' : 'Bayar di Sekolah'}</p>
                    <p className="text-xs text-slate-600">Waktu Order: {formatWIB(selectedOrderForDetail.createdAt)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase text-blue-600">Rincian Menu</Label>
                  <div className="border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[10px] whitespace-nowrap">Tgl Antar</TableHead>
                          <TableHead className="text-[10px]">Item</TableHead>
                          <TableHead className="text-[10px] text-center whitespace-nowrap">Qty</TableHead>
                          <TableHead className="text-[10px] text-right whitespace-nowrap">Harga</TableHead>
                          <TableHead className="text-[10px] text-right hidden sm:table-cell whitespace-nowrap">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrderForDetail.items?.map((item: any) => {
                          const isItemCancelled = item.cancelStatus === 'APPROVED' || selectedOrderForDetail.status === 'CANCELLED'
                          return (
                            <TableRow key={item.id} className={isItemCancelled ? "bg-slate-50/70" : ""}>
                              <TableCell className={cn("text-xs whitespace-nowrap", isItemCancelled && "line-through text-slate-400")}>
                                {format(new Date(item.date), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell className="min-w-0 max-w-[120px] xs:max-w-[150px] sm:max-w-[220px]">
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={cn("text-xs font-bold truncate block", isItemCancelled && "line-through text-slate-400")}
                                      title={item.menuName || item.menu?.name}
                                    >
                                      {item.menuName || item.menu?.name}
                                    </span>
                                    {isItemCancelled && (
                                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">Direfund</Badge>
                                    )}
                                  </div>
                                  <span
                                    className={cn("text-[10px] text-muted-foreground italic truncate block", isItemCancelled && "text-slate-400")}
                                    title={item.vendorName || item.menu?.vendor?.vendorName}
                                  >
                                    {item.vendorName || item.menu?.vendor?.vendorName}
                                  </span>
                                  {isItemCancelled && item.cancelReason && (
                                    <span className="text-[9px] text-red-500 italic mt-0.5">Alasan: {item.cancelReason}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className={cn("text-center text-xs font-bold whitespace-nowrap", isItemCancelled && "line-through text-slate-400")}>
                                {item.quantity}
                              </TableCell>
                              <TableCell className={cn("text-right text-xs whitespace-nowrap", isItemCancelled && "line-through text-slate-400")}>
                                Rp {(item.price + item.adminFee).toLocaleString()}
                              </TableCell>
                              <TableCell className={cn("text-right text-xs font-bold hidden sm:table-cell whitespace-nowrap", isItemCancelled ? "text-slate-400 line-through" : "text-slate-900")}>
                                {isItemCancelled ? "Rp 0 (Batal)" : `Rp ${((item.price + item.adminFee) * item.quantity).toLocaleString()}`}
                              </TableCell>
                            </TableRow>
                          )
                        })}
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

                {selectedOrderForDetail.adminNote && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">Catatan untuk Admin</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedOrderForDetail.adminNote}</p>
                  </div>
                )}
              </div>
            )
          )}
          <DialogFooter className="pt-4 sm:pt-5 border-t mt-4 flex items-center justify-between w-full gap-3">
            {isEditMode ? (
              <div className="flex items-center justify-between w-full gap-3">
                <ConfirmButton
                  title="Hapus Pesanan Permanen?"
                  description={`Pesanan #${selectedOrderForDetail?.id.slice(-8).toUpperCase()} beserta seluruh item di dalamnya akan dihapus permanen dari database.`}
                  confirmText="Ya, Hapus Pesanan"
                  cancelText="Batal"
                  variant="destructive"
                  onConfirm={() => handleDeleteOrder(selectedOrderForDetail.id)}
                >
                  <Button
                    type="button"
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold h-10 w-10 p-0 sm:w-auto sm:px-4 gap-2 shrink-0 shadow-xs"
                    disabled={isDeleting || savingEdit}
                    title="Hapus Pesanan Permanen"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span className="hidden sm:inline">Hapus Pesanan</span>
                  </Button>
                </ConfirmButton>

                <div className="flex items-center gap-2.5 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-slate-200 hover:bg-slate-50"
                    onClick={() => setIsEditMode(false)}
                    disabled={savingEdit || isDeleting}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-4 sm:px-5 text-xs sm:text-sm shadow-md shadow-blue-200"
                    onClick={handleSaveEdit}
                    disabled={savingEdit || isDeleting}
                  >
                    {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Simpan Perubahan
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end w-full gap-2.5">
                <Button
                  variant="outline"
                  className="h-10 px-4 text-xs sm:text-sm font-semibold border-slate-200 hover:bg-slate-50"
                  onClick={() => setSelectedOrderForDetail(null)}
                >
                  Tutup
                </Button>
                {selectedOrderForDetail && selectedOrderForDetail.status !== 'CANCELLED' && selectedOrderForDetail.status !== 'COMPLETED' && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 text-xs sm:text-sm shadow-md shadow-blue-200"
                    onClick={() => setIsEditMode(true)}
                  >
                    Edit Pesanan
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedProof} onOpenChange={(open) => !open && setSelectedProof(null)}>
        <DialogContent showCloseButton={false} className="max-w-md sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="pb-2 border-b flex-shrink-0">
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Bukti Transfer</span>
              {selectedProof && (
                <a
                  href={selectedProof}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-normal text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Buka Penuh
                </a>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 py-2 flex items-center justify-center bg-slate-100/60 rounded-xl my-2 p-2">
            {selectedProof && (
              <img
                src={selectedProof}
                className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-sm"
                alt="Bukti Transfer"
              />
            )}
          </div>

          <DialogFooter className="pt-2 border-t flex-shrink-0">
            <Button variant="secondary" className="w-full" onClick={() => setSelectedProof(null)}>Tutup</Button>
          </DialogFooter>
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
                {refundOrder?.items?.filter((item: any) => item.cancelStatus !== 'APPROVED').map((item: any) => (
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
