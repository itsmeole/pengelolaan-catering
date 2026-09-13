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

        // Gunakan waktu Jakarta (WIB = UTC+7) untuk menghindari selisih hari
        const nowWIB = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
        const now = nowWIB

        // This week (Monday to Sunday) — based on WIB date
        const thisWeekStartDate = startOfWeek(nowWIB, { weekStartsOn: 1 })
        thisWeekStartDate.setHours(0, 0, 0, 0)
        const thisWeekEndDate = endOfWeek(nowWIB, { weekStartsOn: 1 })
        thisWeekEndDate.setHours(23, 59, 59, 999)
        const thisWeekStart = thisWeekStartDate.toISOString()
        const thisWeekEnd = thisWeekEndDate.toISOString()

        // Next week (Monday to Sunday)
        const nextWeekDate = addWeeks(nowWIB, 1)
        const nextWeekStartDate = startOfWeek(nextWeekDate, { weekStartsOn: 1 })
        nextWeekStartDate.setHours(0, 0, 0, 0)
        const nextWeekEndDate = endOfWeek(nextWeekDate, { weekStartsOn: 1 })
        nextWeekEndDate.setHours(23, 59, 59, 999)
        const nextWeekStart = nextWeekStartDate.toISOString()
        const nextWeekEnd = nextWeekEndDate.toISOString()

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

        // Normalisasi Order (Supabase bisa mengembalikan object atau array tergantung versi/relasi)
        const normalizeOrder = (item: any) => {
            const raw = item?.Order || item?.order
            return Array.isArray(raw) ? raw[0] : raw
        }

        // ── All-time items with pagination to bypass 1000-row limit ──────────
        let allTimeItems: any[] = []
        let page = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
            let query = supabase
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
                .neq('cancelStatus', 'APPROVED')
                .range(page * pageSize, (page + 1) * pageSize - 1)

            if (academicYearStart) {
                query = query.gte('Order.createdAt', academicYearStart)
            }

            const { data, error: pageErr } = await query
            if (pageErr) throw pageErr

            if (data && data.length > 0) {
                allTimeItems = allTimeItems.concat(data)
                if (data.length < pageSize) {
                    hasMore = false
                } else {
                    page++
                }
            } else {
                hasMore = false
            }
        }

        // Filter status di JavaScript karena .in() pada joined table tidak didukung
        const paidItems = allTimeItems.filter((i: any) => {
            const order = normalizeOrder(i)
            return order?.status === 'PAID' || order?.status === 'COMPLETED'
        })

        // Pendapatan bersih = price × qty (harga vendor, setelah admin fee sudah dipotong dari harga jual)
        const filteredAllTimeItems = paidItems.filter((i: any) => {
            const order = normalizeOrder(i)
            if (academicYearStart && order?.createdAt && new Date(order.createdAt) < new Date(academicYearStart)) {
                return false
            }
            return true
        })

        const allTimeNetRevenue = filteredAllTimeItems.reduce((sum: number, i: any) => {
            return sum + (i.price * (i.quantity || 1))
        }, 0)

        const validItems = (orderItems || []).filter((item: any) => {
            const order = normalizeOrder(item)
            const status = order?.status
            const method = order?.paymentMethod
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

        // ── Setup Chart Data (Porsi Harian Minggu Ini: Senin s/d Minggu) ──
        const DAY_LABELS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
        const chartDataMap: Record<string, { label: string, total: number, revenue: number }> = {}

        // Buat slot hari Senin s/d Minggu untuk minggu ini
        for (let i = 0; i < 7; i++) {
            const d = new Date(thisWeekStartDate)
            d.setDate(d.getDate() + i)
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            const dateKey = `${year}-${month}-${day}`
            const dayLabel = DAY_LABELS_ID[d.getDay()]
            chartDataMap[dateKey] = { label: dayLabel, total: 0, revenue: 0 }
        }

        // Isi porsi berdasarkan tanggal jadwal makan (item.date) dari validItems minggu ini
        validItems.forEach((item: any) => {
            if (item.date >= thisWeekStart && item.date <= thisWeekEnd) {
                const d = new Date(item.date)
                const dWIB = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
                const year = dWIB.getFullYear()
                const month = String(dWIB.getMonth() + 1).padStart(2, '0')
                const day = String(dWIB.getDate()).padStart(2, '0')
                const dateKey = `${year}-${month}-${day}`

                if (chartDataMap[dateKey]) {
                    const qty = item.quantity || 1
                    chartDataMap[dateKey].total += qty
                    chartDataMap[dateKey].revenue += (item.price * qty)
                }
            }
        })

        // ── Perbandingan Penjualan Tahunan (Line Chart) ──
        const yearsSet = new Set<string>()
        allTimeItems?.forEach((item: any) => {
            const order = normalizeOrder(item)
            if (order?.createdAt) {
                const year = new Date(order.createdAt).getFullYear()
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
            const order = normalizeOrder(item)
            if (order?.createdAt && (order.status === 'PAID' || order.status === 'COMPLETED')) {
                const orderDate = new Date(order.createdAt)
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

                const student = normalizeOrder(item)?.student
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
            name: chartDataMap[key].label,   // nama hari singkat (Sen, Sel, ...) untuk sumbu X
            total: chartDataMap[key].total,  // total porsi
            revenue: chartDataMap[key].revenue // total omzet rupiah
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
