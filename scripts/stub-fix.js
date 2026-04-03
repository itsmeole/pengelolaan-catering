const fs = require('fs')

// Fix reports stub shape
fs.writeFileSync('src/app/api/admin/reports/route.ts', `import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({
        summary: { totalOrders: 0, grossRevenue: 0, netRevenue: 0 },
        details: [],
        chart: []
    })
}
`)

// Fix vendor stats shape
fs.writeFileSync('src/app/api/vendor/stats/route.ts', `import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({
        weeklyOrders: { count: 0, trend: 0 },
        revenue: { total: 0, trend: 0 },
        recentOrders: [],
        topMenu: null
    })
}
`)

// Fix student/vendor users shape
fs.writeFileSync('src/app/api/admin/users/students/route.ts', `import { NextResponse } from "next/server"; export async function GET() { return NextResponse.json([]) }`)
fs.writeFileSync('src/app/api/admin/users/vendors/route.ts', `import { NextResponse } from "next/server"; export async function GET() { return NextResponse.json([]) }`)
fs.writeFileSync('src/app/api/admin/orders/route.ts', `import { NextResponse } from "next/server"; export async function GET() { return NextResponse.json([]) }`)

// Update admin stats again just to trigger Next.js Turbopack recompile
fs.writeFileSync('src/app/api/admin/stats/route.ts', `import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({
        data: [],
        weeklyOrders: { count: 0, trend: 0 },
        revenue: { gross: 0, net: 0, trend: 0 },
        recentActivity: [],
        topMenu: null,
        message: "Endpoint is undergoing Supabase migration (cache busted)"
    })
}
`)
