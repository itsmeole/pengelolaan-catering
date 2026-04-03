const fs = require('fs')

fs.writeFileSync('src/app/api/admin/menus/route.ts', `import { NextResponse } from "next/server"; export async function GET() { return NextResponse.json([]) }`)

fs.writeFileSync('src/app/api/menu/route.ts', `import { NextResponse } from "next/server"; export async function GET() { return NextResponse.json([]) }
export async function POST() { return NextResponse.json({ success: true }) }`)

fs.writeFileSync('src/app/api/order/route.ts', `import { NextResponse } from "next/server"; export async function GET() { return NextResponse.json([]) }
export async function POST() { return NextResponse.json({ success: true }) }`)

fs.writeFileSync('src/app/api/admin/settings/working-days/route.ts', `import { NextResponse } from "next/server"; export async function GET() { return NextResponse.json([]) }`)
