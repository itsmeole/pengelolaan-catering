import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabaseAdmin'

// Set VAPID Details
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:admin@catering.app',
    publicKey,
    privateKey
  )
} else {
  console.warn('VAPID keys not configured. Web Push notifications will be disabled.')
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/**
 * Send a web push notification to all active devices of a given user (vendor/admin/student).
 */
export async function sendPushNotification(userId: string, payload: PushPayload) {
  if (!publicKey || !privateKey) {
    console.warn('Skipping push notification: VAPID keys not configured.')
    return
  }

  const supabase = createAdminClient()

  // 1. Fetch all push subscriptions for this user
  const { data: subscriptions, error } = await supabase
    .from('PushSubscription')
    .select('id, endpoint, p256dh, auth')
    .eq('userId', userId)

  if (error) {
    console.error(`Failed to fetch push subscriptions for user ${userId}:`, error)
    return
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log(`No active push subscriptions found for user ${userId}.`)
    return
  }

  console.log(`Sending push notification to ${subscriptions.length} devices of user ${userId}...`)

  const payloadString = JSON.stringify(payload)

  // 2. Dispatch notifications concurrently
  await Promise.all(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }

      try {
        await webpush.sendNotification(pushSubscription, payloadString)
        console.log(`Push notification sent successfully to subscription ID: ${sub.id}`)
      } catch (err: any) {
        console.error(`Error sending push notification to subscription ID ${sub.id}:`, err.message)
        
        // 3. Clean up expired subscriptions (410 Gone / 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Removing expired subscription ID: ${sub.id}`)
          await supabase.from('PushSubscription').delete().eq('id', sub.id)
        }
      }
    })
  )
}
