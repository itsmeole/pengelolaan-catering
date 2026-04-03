import { NextResponse } from "next/server"

// TEMPORARY STUB DURING SUPABASE MIGRATION
export async function GET() {
    return NextResponse.json({
        data: [],
        weeklyOrders: { count: 0, trend: 0 },
        revenue: { gross: 0, net: 0, trend: 0 },
        recentActivity: [],
        topMenu: null,
        message: "Endpoint is undergoing Supabase migration"
    })
}

export async function POST() {
    return NextResponse.json({ success: true, message: "Stubbed POST" })
}

export async function PUT() {
    return NextResponse.json({ success: true, message: "Stubbed PUT" })
}

export async function DELETE() {
    return NextResponse.json({ success: true })
}
