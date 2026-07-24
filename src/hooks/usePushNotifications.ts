import { useEffect, useState } from "react"
import { toast } from "sonner"

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return
    }

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!VAPID_PUBLIC_KEY) {
      console.warn("VAPID public key not found in environment variables.")
      return
    }

    async function registerAndSubscribe() {
      try {
        // 1. Register Service Worker
        const registration = await navigator.serviceWorker.register("/sw.js")
        console.log("Service Worker registered successfully:", registration)

        // 2. Request Notification Permission
        if (Notification.permission === "default") {
          const permission = await Notification.requestPermission()
          if (permission !== "granted") {
            console.log("Notification permission denied.")
            return
          }
        }

        if (Notification.permission !== "granted") {
          return
        }

        // 3. Get existing subscription
        let subscription = await registration.pushManager.getSubscription()

        if (subscription) {
          // Verify if VAPID key matches, if not, unsubscribe to force new registration
          const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY!)
          const existingKey = subscription.options.applicationServerKey
          
          const isKeySame = existingKey && 
            new Uint8Array(existingKey).length === convertedVapidKey.length &&
            new Uint8Array(existingKey).every((val, index) => val === convertedVapidKey[index])

          if (!isKeySame) {
            console.log("VAPID key changed, unsubscribing old push subscription...")
            await subscription.unsubscribe()
            subscription = null
          }
        }

        if (!subscription) {
          const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY!)
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          })
        }

        // 4. Send subscription to server
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscription),
        })

        if (res.ok) {
          setIsSubscribed(true)
          console.log("Push notification subscription synced with server.")
        } else {
          console.error("Failed to sync push subscription with server.")
        }
      } catch (err) {
        console.error("Error setting up Web Push Notifications:", err)
      }
    }

    registerAndSubscribe()
  }, [])

  return { isSubscribed }
}
