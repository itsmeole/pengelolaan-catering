"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

function showDesktopNotification(title: string, body: string, url: string = "/dashboard") {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return

  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: "/logo-kujang.png",
          badge: "/logo-kujang.png",
          data: { url },
        })
      })
    } else {
      new Notification(title, {
        body,
        icon: "/logo-kujang.png",
      })
    }
  } catch (e) {
    console.error("Failed to show desktop notification:", e)
  }
}

interface UseRealtimeOrdersProps {
  role: "ADMIN" | "VENDOR" | "STUDENT"
  userId?: string
  onNewOrder?: (order: any) => void
  onOrderUpdated?: (order: any) => void
  onOrderItemChanged?: (item: any) => void
  showToast?: boolean
}

export function useRealtimeOrders({
  role,
  userId,
  onNewOrder,
  onOrderUpdated,
  onOrderItemChanged,
  showToast = true
}: UseRealtimeOrdersProps) {
  const onNewOrderRef = useRef(onNewOrder)
  const onOrderUpdatedRef = useRef(onOrderUpdated)
  const onOrderItemChangedRef = useRef(onOrderItemChanged)

  useEffect(() => {
    onNewOrderRef.current = onNewOrder
    onOrderUpdatedRef.current = onOrderUpdated
    onOrderItemChangedRef.current = onOrderItemChanged
  })

  useEffect(() => {
    const supabase = createClient()
    const channelName = `realtime-orders-${role}-${userId || 'global'}`

    const channel = supabase
      .channel(channelName)
      // 1. Dengarkan Pesanan Baru di tabel Order
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Order"
        },
        (payload: any) => {
          const newOrder = payload.new
          if (role === "ADMIN" && showToast) {
            const title = "🛒 Pesanan Baru Masuk!"
            const desc = `Pesanan #${newOrder.id ? newOrder.id.slice(-6).toUpperCase() : ""} (${newOrder.paymentMethod === 'TRANSFER' ? 'Transfer' : 'Bayar di Sekolah'}) berhasil dibuat.`
            toast.success(title, {
              id: `admin-new-${newOrder.id}`,
              description: desc
            })
            showDesktopNotification(title, desc, "/dashboard/admin/orders")
          }
          onNewOrderRef.current?.(newOrder)
        }
      )
      // 2. Dengarkan Perubahan pada tabel Order (Update Status / Bukti Bayar)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Order"
        },
        async (payload: any) => {
          const updatedOrder = payload.new
          const oldOrder = payload.old

          // A. SISWA: Notifikasi status berubah
          if (role === "STUDENT" && userId && updatedOrder.studentId === userId && showToast) {
            if (oldOrder?.status !== updatedOrder.status) {
              const statusLabel = 
                updatedOrder.status === 'PAID' ? 'Lunas / Diterima' :
                updatedOrder.status === 'COMPLETED' ? 'Selesai' :
                updatedOrder.status === 'CANCELLED' ? 'Dibatalkan' : updatedOrder.status

              const title = "Status Pesanan Diperbarui"
              const desc = `Pesanan #${updatedOrder.id ? updatedOrder.id.slice(-6).toUpperCase() : ""} sekarang berstatus: ${statusLabel}`
              toast.info(title, {
                id: `student-status-${updatedOrder.id}`,
                description: desc
              })
              showDesktopNotification(title, desc, "/dashboard/student/history")
            }
          }
          // B. ADMIN: Notifikasi status berubah
          else if (role === "ADMIN" && showToast) {
            if (oldOrder?.status !== updatedOrder.status) {
              const title = "Status Pesanan Berubah"
              const desc = `Pesanan #${updatedOrder.id ? updatedOrder.id.slice(-6).toUpperCase() : ""} menjadi ${updatedOrder.status}.`
              toast.info(title, {
                id: `admin-status-${updatedOrder.id}`,
                description: desc
              })
              showDesktopNotification(title, desc, "/dashboard/admin/orders")
            }
          }
          // C. VENDOR: Notifikasi HANYA jika status menjadi LUNAS (PAID) DAN ada item milik vendor ini
          else if (role === "VENDOR" && userId && showToast) {
            if (updatedOrder.status === 'PAID' && oldOrder?.status !== 'PAID') {
              // Cek apakah di dalam pesanan ini terdapat menu milik vendor ini
              const { data: vendorItems } = await supabase
                .from('OrderItem')
                .select('id, menuName, quantity')
                .eq('orderId', updatedOrder.id)
                .eq('vendorId', userId)

              if (vendorItems && vendorItems.length > 0) {
                const title = "📦 Pesanan Baru Dikonfirmasi Lunas!"
                const desc = `Pesanan #${updatedOrder.id ? updatedOrder.id.slice(-6).toUpperCase() : ""} telah lunas dan siap disiapkan.`
                toast.success(title, {
                  id: `vendor-paid-${updatedOrder.id}`,
                  description: desc
                })
                showDesktopNotification(title, desc, "/dashboard/vendor/orders")
              }
            }
          }

          onOrderUpdatedRef.current?.(updatedOrder)
        }
      )
      // 3. Dengarkan Perubahan pada tabel OrderItem
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "OrderItem"
        },
        async (payload: any) => {
          const item = payload.new || payload.old
          if (!item) return

          // Notifikasi untuk Vendor
          if (role === "VENDOR" && userId && showToast) {
            // Pastikan item ini memang milik vendor yang sedang login
            if (item.vendorId === userId) {
              if (payload.eventType === 'INSERT') {
                // Untuk item baru, hanya munculkan notifikasi jika metode bayarnya Bayar di Sekolah (CASH_PAY_LATER)
                // Jika TRANSFER, jangan tampilkan sekarang (tunggu sampai diset LUNAS oleh admin)
                const { data: parentOrder } = await supabase
                  .from('Order')
                  .select('paymentMethod, status')
                  .eq('id', item.orderId)
                  .single()

                if (parentOrder?.paymentMethod === 'CASH_PAY_LATER') {
                  const title = "📦 Pesanan Baru (Bayar di Sekolah)!"
                  const desc = `Ada pesanan menu katering baru (Bayar di Sekolah).`
                  toast.success(title, {
                    id: `vendor-cash-${item.orderId}`,
                    description: desc
                  })
                  showDesktopNotification(title, desc, "/dashboard/vendor/orders")
                }
              } else if (payload.eventType === 'UPDATE') {
                const title = "📦 Perubahan Porsi / Menu"
                const desc = `Pesanan menu "${item.menuName || 'Katering'}" diperbarui.`
                toast.info(title, {
                  id: `vendor-item-update-${item.id}`,
                  description: desc
                })
                showDesktopNotification(title, desc, "/dashboard/vendor/orders")
              }
            }
          }

          onOrderItemChangedRef.current?.(item)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [role, userId, showToast])
}
