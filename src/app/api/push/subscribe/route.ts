import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/serverSession'
import { createAdminClient } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
    try {
        const user = await getSessionUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const subscription = await req.json()
        const { endpoint, keys } = subscription

        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Upsert the subscription
        const { error } = await supabase
            .from('PushSubscription')
            .upsert({
                userId: user.id,
                endpoint: endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth
            }, {
                onConflict: 'endpoint'
            })

        if (error) {
            console.error('Subscription save error:', error)
            return NextResponse.json({ error: 'Database save error' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (e: any) {
        console.error('PUSH SUBSCRIBE ROUTE ERROR:', e)
        return NextResponse.json({ error: 'System Error' }, { status: 500 })
    }
}
