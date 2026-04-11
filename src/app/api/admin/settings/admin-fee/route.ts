import { createClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('SystemSetting')
            .select('*')
            .eq('key', 'admin_fee_config')
            .single()

        if (error || !data) {
            return NextResponse.json({ fee: 1000 })
        }
        return NextResponse.json(JSON.parse(data.value))
    } catch (e) {
        return NextResponse.json({ fee: 1000 })
    }
}

export async function PUT(req: Request) {
    try {
        const payload = await req.json()
        const supabase = await createClient()

        const { error } = await supabase
            .from('SystemSetting')
            .upsert({
                key: 'admin_fee_config',
                value: JSON.stringify(payload),
                updatedAt: new Date().toISOString()
            }, { onConflict: 'key' })

        if (error) {
            console.error('Supabase Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('System Error:', e)
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
