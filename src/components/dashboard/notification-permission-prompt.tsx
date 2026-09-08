"use client"

import { useEffect, useState } from "react"
import { Bell, BellRing, CheckCircle, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function NotificationPermissionPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission)
    }
  }, [])

  if (!mounted || typeof window === "undefined" || !("Notification" in window)) {
    return null
  }

  async function registerPush() {
    try {
      const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator)) return

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        })
      }

      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        })
      }
    } catch (e) {
      console.error("Error registering push:", e)
    }
  }

  async function requestPermissionAndTest() {
    setLoading(true)
    try {
      // 1. Trigger native permission prompt via user gesture
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === "granted") {
        toast.success("Izin Notifikasi Diterima!", {
          description: "Mendaftarkan perangkat dan mengirimkan notifikasi uji coba...",
        })

        // 2. Register Service Worker & Web Push
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.register("/sw.js")
          await navigator.serviceWorker.ready
          await registerPush()

          // 3. Trigger immediate native test notification
          reg.showNotification("🎉 Notifikasi Laptop Aktif!", {
            body: "Notifikasi sistem perangkat Anda berhasil terhubung dengan Go Catering.",
            icon: "/logo-kujang.png",
            badge: "/logo-kujang.png",
          })
        } else {
          new Notification("🎉 Notifikasi Laptop Aktif!", {
            body: "Notifikasi sistem perangkat Anda berhasil terhubung dengan Go Catering.",
            icon: "/logo-kujang.png",
          })
        }
      } else if (result === "denied") {
        toast.error("Izin Notifikasi Diblokir", {
          description: "Klik ikon 🔒 di address bar browser (sebelah kiri localhost:3000), lalu ubah Notifikasi ke 'Izinkan / Allow'.",
          duration: 8000
        })
      }
    } catch (err: any) {
      toast.error("Gagal mengaktifkan notifikasi: " + (err.message || "Error"))
    } finally {
      setLoading(false)
    }
  }

  async function triggerTestNotification() {
    try {
      if (Notification.permission !== "granted") {
        await requestPermissionAndTest()
        return
      }

      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready
        reg.showNotification("🔔 Tes Notifikasi Sistem Laptop", {
          body: "Ini adalah contoh notifikasi pesanan katering baru di laptop Anda.",
          icon: "/logo-kujang.png",
          badge: "/logo-kujang.png",
          data: { url: "/dashboard" }
        })
      } else {
        new Notification("🔔 Tes Notifikasi Sistem Laptop", {
          body: "Ini adalah contoh notifikasi pesanan katering baru di laptop Anda.",
          icon: "/logo-kujang.png",
        })
      }
      toast.success("Notifikasi Uji Coba Terkirim!", {
        description: "Periksa pojok kanan bawah layar laptop / bilah notifikasi Windows Anda."
      })
    } catch (e: any) {
      toast.error("Gagal mengirim notifikasi uji coba: " + e.message)
    }
  }

  if (permission !== "granted") {
    return (
      <Button
        onClick={requestPermissionAndTest}
        disabled={loading}
        size="sm"
        className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-8 text-xs gap-1.5 shadow-sm animate-pulse"
      >
        <BellRing className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Aktifkan Notifikasi Laptop</span>
        <span className="sm:hidden">Notifikasi</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1.5 border-slate-200 text-slate-700">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <Bell className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          Notifikasi Sistem Aktif
        </DropdownMenuLabel>
        <p className="text-[11px] text-slate-500 px-2 pb-2">
          Perangkat Anda terhubung untuk menerima notifikasi pesanan & perubahan status.
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={triggerTestNotification}
          className="cursor-pointer gap-2 text-xs font-bold text-blue-600 focus:text-blue-700 focus:bg-blue-50"
        >
          <Play className="h-3.5 w-3.5" />
          Kirim Tes Notifikasi Sekarang
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
