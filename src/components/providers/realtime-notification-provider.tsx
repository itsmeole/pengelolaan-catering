"use client"

import { useRealtimeOrders } from "@/hooks/useRealtimeOrders"
import { usePushNotifications } from "@/hooks/usePushNotifications"

interface RealtimeNotificationProviderProps {
  role: "ADMIN" | "VENDOR" | "STUDENT"
  userId?: string
}

export function RealtimeNotificationProvider({
  role,
  userId
}: RealtimeNotificationProviderProps) {
  // 1. WebSocket Realtime for live in-app updates & toasts
  useRealtimeOrders({
    role,
    userId,
    showToast: true
  })

  // 2. Web Push Notification for background / closed browser notifications
  usePushNotifications()

  return null
}
