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
            return NextResponse.json({ fee: 1000, serviceFee: 0 })
        }
        const parsed = JSON.parse(data.value)
        return NextResponse.json({
            fee: parsed.fee !== undefined ? Number(parsed.fee) : 1000,
            serviceFee: parsed.serviceFee !== undefined ? Number(parsed.serviceFee) : 0
        })
    } catch (e) {
        return NextResponse.json({ fee: 1000, serviceFee: 0 })
    }
}

export async function PUT(req: Request) {
    try {
        const payload = await req.json()
        const supabase = await createClient()

        const configToSave = {
            fee: payload.fee !== undefined ? Number(payload.fee) : 1000,
            serviceFee: payload.serviceFee !== undefined ? Number(payload.serviceFee) : 0
        }

        const { error } = await supabase
            .from('SystemSetting')
            .upsert({
                key: 'admin_fee_config',
                value: JSON.stringify(configToSave),
                updatedAt: new Date().toISOString()
            }, { onConflict: 'key' })

        if (error) {
            console.error('Supabase Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, ...configToSave })
    } catch (e) {
        console.error('System Error:', e)
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
