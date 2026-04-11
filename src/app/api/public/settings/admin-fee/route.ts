import { NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

// Cache the route heavily since admin fee rarely changes
export const revalidate = 60

export async function GET() {
    try {
        // Use anon client for public readonly access
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
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
