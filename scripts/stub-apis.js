const fs = require('fs')
const path = require('path')

const filesToStub = [
    "src/app/api/order/route.ts",
    "src/app/api/vendor/stats/route.ts",
    "src/app/api/user/profile/route.ts",
    "src/app/api/menu/[id]/route.ts",
    "src/app/api/menu/route.ts",
    "src/app/api/admin/stats/route.ts",
    "src/app/api/admin/settings/working-days/route.ts",
    "src/app/api/admin/users/vendors/route.ts",
    "src/app/api/admin/reports/route.ts",
    "src/app/api/admin/users/students/route.ts",
    "src/app/api/admin/orders/route.ts",
    "src/app/api/admin/menus/route.ts"
]

const stubContent = `import { NextResponse } from "next/server"

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
`

filesToStub.forEach(file => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, stubContent)
        console.log("Stubbed", file)
    }
})
