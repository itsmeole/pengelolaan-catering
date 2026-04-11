import { createClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const supabase = await createClient()
        // 1. Ambil data dari SystemSetting menggunakan Supabase
        const { data, error } = await supabase
            .from('SystemSetting')
            .select('*')
            .eq('key', 'working_days_config')
            .single()

        // Default kembalian jika belum ada data di Database
        if (error || !data) {
            return NextResponse.json({
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: false,
                sunday: false,
                holidays: [],
                deadlineTime: "20:00"
            })
        }

        return NextResponse.json(JSON.parse(data.value))
    } catch (e) {
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const payload = await req.json()
        const supabase = await createClient()

        // Upsert setting ke Supabase
        const { error } = await supabase
            .from('SystemSetting')
            .upsert({
                key: 'working_days_config',
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