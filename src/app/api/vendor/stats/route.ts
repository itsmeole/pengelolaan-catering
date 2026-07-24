import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const customStart = searchParams.get('start')
        const customEnd = searchParams.get('end')

        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() {}
                }
            }
        )

        // 1. Authenticate Vendor
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.user_metadata?.role !== 'VENDOR') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const vendorId = user.id

        // 2. Time frames
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStart = new Date(tomorrow.setHours(0,0,0,0)).toISOString()
        const tomorrowEnd = new Date(tomorrow.setHours(23,59,59,999)).toISOString()
        
        // Final filter range for cooking list
        const filterStart = customStart ? new Date(new Date(customStart).setHours(0,0,0,0)).toISOString() : tomorrowStart
        const filterEnd = customEnd ? new Date(new Date(customEnd).setHours(23,59,59,999)).toISOString() : tomorrowEnd

        const now = new Date()
        // This week (Monday to Sunday)
        const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
        const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()

        // Next week (Monday to Sunday)
        const nextWeek = addWeeks(now, 1)
        const nextWeekStart = startOfWeek(nextWeek, { weekStartsOn: 1 }).toISOString()
        const nextWeekEnd = endOfWeek(nextWeek, { weekStartsOn: 1 }).toISOString()

        // 3. Query OrderItems for this vendor (Snapshot)
        const fetchStart = new Date(Math.min(new Date(thisWeekStart).getTime(), new Date(filterStart).getTime())).toISOString()

        const { data: orderItems, error: itemsErr } = await supabase
            .from('OrderItem')
            .select(`
                id, date, quantity, note, menuId, menuName, price, cancelStatus, vendorId,
                Order!inner(
                    status, 
                    paymentMethod,
                    student:profiles!studentId(class)
                )
            `)
            .eq('vendorId', vendorId)
            .gte('date', fetchStart)

        if (itemsErr) throw itemsErr

        // 0. Ambil tahun ajaran baru start date jika ada
        const { data: settingData } = await supabase
            .from('SystemSetting')
            .select('value')
            .eq('key', 'new_academic_year_start')
            .maybeSingle()

        const academicYearStart = settingData ? JSON.parse(settingData.value).academicYearStart : null

        // ── All-time items with student profiles ──────────
        const { data: allTimeItems, error: allTimeErr } = await supabase
            .from('OrderItem')
            .select(`
                price, adminFee, quantity, cancelStatus,
                Order!inner(
                    status, 
                    createdAt,
                    student:profiles!studentId(class)
                )
            `)
            .eq('vendorId', vendorId)
            .in('Order.status', ['PAID', 'COMPLETED'])
            .neq('cancelStatus', 'APPROVED')

        if (allTimeErr) throw allTimeErr

        // Pendapatan bersih = price × qty (harga vendor, setelah admin fee sudah dipotong dari harga jual)
        const filteredAllTimeItems = (allTimeItems || []).filter((i: any) => {
            const o = i.Order
            if (academicYearStart && o?.createdAt && new Date(o.createdAt) < new Date(academicYearStart)) {
                return false;
            }
            return true;
        })

        const allTimeNetRevenue = filteredAllTimeItems.reduce((sum: number, i: any) => {
            return sum + (i.price * (i.quantity || 1))
        }, 0)

        const validItems = (orderItems || []).filter((item: any) => {
            const status = item.Order?.status
            const method = item.Order?.paymentMethod
            const cStatus = item.cancelStatus || 'NONE'

            // Kecualikan yang sudah DISETUJUI batal
            if (cStatus === 'APPROVED') return false

            // Masuk daftar masak jika: Sudah Lunas/Selesai OR (Pending tapi Pay Later)
            return status === 'PAID' || status === 'COMPLETED' ||
                (status === 'PENDING' && method === 'CASH_PAY_LATER')
        })

        let tomorrowCount = 0
        let nextWeekCount = 0
        let weeklyCount = 0
        let totalRevenue = 0
        const cookingMap: Record<string, { name: string, qty: number, notes: string[] }> = {}

        // Setup Chart Data (Last 7 Days)
        const chartDataMap: Record<string, number> = {}
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' })
            chartDataMap[dayName] = 0
        }

        // Populate last 7 days chart data based on transaction date
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(now.getDate() - 7)
        sevenDaysAgo.setHours(0, 0, 0, 0)

        filteredAllTimeItems.forEach((item: any) => {
            const orderDate = new Date(item.Order.createdAt)
            if (orderDate >= sevenDaysAgo && orderDate <= now) {
                const dayName = orderDate.toLocaleDateString('id-ID', { weekday: 'short' })
                if (chartDataMap[dayName] !== undefined) {
                    chartDataMap[dayName] += (item.price * (item.quantity || 1))
                }
            }
        })

        // ── Perbandingan Penjualan Tahunan (Line Chart) ──
        const yearsSet = new Set<string>()
        allTimeItems?.forEach((item: any) => {
            if (item.Order?.createdAt) {
                const year = new Date(item.Order.createdAt).getFullYear()
                yearsSet.add(String(year))
            }
        })
        yearsSet.add(String(now.getFullYear()))
        const years = Array.from(yearsSet).sort()

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthlyChartData = monthNames.map((month) => {
            const entry: Record<string, any> = { name: month }
            years.forEach(yr => {
                entry[yr] = 0
            })
            return entry
        })

        allTimeItems?.forEach((item: any) => {
            if (item.Order?.createdAt) {
                const orderDate = new Date(item.Order.createdAt)
                const yearStr = String(orderDate.getFullYear())
                const monthIdx = orderDate.getMonth()
                
                if (monthlyChartData[monthIdx]) {
                    monthlyChartData[monthIdx][yearStr] += (item.price * (item.quantity || 1))
                }
            }
        })

        // ── Sebaran Kelas Mingguan (Pie Chart) ──
        const classDataMap: Record<string, number> = {}

        validItems.forEach((item: any) => {
            // Stats for this week (delivery date based)
            if (item.date >= thisWeekStart && item.date <= thisWeekEnd) {
                weeklyCount += item.quantity || 1

                const student = item.Order?.student
                const studentClass = (Array.isArray(student) ? student[0]?.class : student?.class) || 'Lainnya'
                classDataMap[studentClass] = (classDataMap[studentClass] || 0) + (item.quantity || 1)
            }

            // Stats for next week
            if (item.date >= nextWeekStart && item.date <= nextWeekEnd) {
                nextWeekCount += item.quantity || 1
            }

            // FILTER: Masuk Cooking List jika dalam rentang filter (besok atau custom)
            if (item.date >= filterStart && item.date <= filterEnd) {
                tomorrowCount += item.quantity || 1

                const mId = item.menuId || 'deleted'
                if (!cookingMap[mId]) {
                    cookingMap[mId] = { name: item.menuName || 'Menu Terhapus', qty: 0, notes: [] }
                }
                cookingMap[mId].qty += item.quantity || 1

                if (item.note && item.note.trim() !== "") {
                    cookingMap[mId].notes.push(item.note)
                }
            }
        })

        const classPieData = Object.keys(classDataMap).map(className => ({
            name: className,
            value: classDataMap[className]
        })).sort((a, b) => b.value - a.value)

        const cookingList = Object.values(cookingMap)

        const chartData = Object.keys(chartDataMap).map(key => ({
            name: key,
            total: chartDataMap[key]
        }))

        return NextResponse.json({
            tomorrowOrderCount: tomorrowCount,
            nextWeekOrderCount: nextWeekCount,
            weeklyOrderCount: weeklyCount,
            totalRevenue,
            allTimeNetRevenue,
            cookingList,
            chartData,
            monthlyChartData,
            years,
            classPieData,
            academicYearStart
        })

    } catch (e) {
        console.error("VENDOR STATS ERROR:", e)
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
