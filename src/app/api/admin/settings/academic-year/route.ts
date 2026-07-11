import { createClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('SystemSetting')
            .select('*')
            .eq('key', 'new_academic_year_start')
            .single()

        if (error || !data) {
            return NextResponse.json({ academicYearStart: null })
        }
        return NextResponse.json(JSON.parse(data.value))
    } catch (e) {
        return NextResponse.json({ academicYearStart: null })
    }
}

export async function POST() {
    try {
        const supabase = await createClient()
        const now = new Date().toISOString()
        const payload = { academicYearStart: now }

        const { error } = await supabase
            .from('SystemSetting')
            .upsert({
                key: 'new_academic_year_start',
                value: JSON.stringify(payload),
                updatedAt: now
            }, { onConflict: 'key' })

        if (error) {
            console.error('Supabase Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, academicYearStart: now })
    } catch (e) {
        console.error('System Error:', e)
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
