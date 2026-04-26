import { createAdminClient } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { addDays, startOfWeek, addWeeks, format } from 'date-fns'
import { checkRateLimit, recordRequest, getClientIp } from '@/lib/rateLimiter'

export async function POST(req: Request) {
    try {
        // ── LAYER 1: IP Rate Limiting ──────────────────────────────────────────
        const clientIp = getClientIp(req)
        const rateCheck = checkRateLimit(clientIp)
        if (!rateCheck.allowed) {
            const minutes = Math.ceil(rateCheck.retryAfterSeconds / 60)
            return NextResponse.json(
                { error: `Terlalu banyak percobaan pemesanan. Silakan coba lagi dalam ${rateCheck.retryAfterSeconds} detik (±${minutes} menit).` },
                { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
            )
        }

        const body = await req.json()
        const { studentId, phone, items, paymentMethod, proofImage, orderWeek } = body

        if (!studentId || !items || items.length === 0) {
            return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 })
        }

        if (items.some((i: any) => i.quantity < 1)) {
            return NextResponse.json({ error: 'Semua menu yang dipilih minimal harus dibeli 1 porsi' }, { status: 400 })
        }

        // ── LAYER 2: Session-Identity Binding ─────────────────────────────────
        // Jika ada sesi login aktif, pastikan studentId di body = user yang login.
        // Ini mencegah user terotentikasi menggunakan data akun orang lain.
        try {
            const cookieStore = await cookies()
            const anonClient = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
            )
            const { data: { user } } = await anonClient.auth.getUser()
            if (user && user.id !== studentId) {
                return NextResponse.json(
                    { error: 'Anda tidak dapat memesan atas nama orang lain saat sedang masuk (login). Gunakan akun yang sesuai.' },
                    { status: 403 }
                )
            }
        } catch {
            // Jika tidak ada sesi (public mode), lanjutkan tanpa pemblokiran
        }

        const supabase = createAdminClient()

        // 1.5 Cek Anti Spam — satu siswa tidak boleh punya 2 order aktif
        const { data: activeOrders } = await supabase
            .from('Order')
            .select('id')
            .eq('studentId', studentId)
            .in('status', ['PENDING', 'PAID'])
            .limit(1)

        if (activeOrders && activeOrders.length > 0) {
            return NextResponse.json({ error: "Siswa masih memiliki pesanan aktif yang belum dibayar atau didistribusikan. Harap selesaikan pesanan sebelumnya." }, { status: 400 })
        }

        // ── LAYER 3: Catat IP setelah validasi dasar lolos ────────────────────
        recordRequest(clientIp)



        // 1. Update Phone di Profile Siswa
        if (phone) {
            await supabase.from('profiles').update({ phone }).eq('id', studentId)
        }

        // 2. Ambil Konfigurasi Hari Kerja untuk menentukan jadwal "Minggu Depan"
        const { data: settingData } = await supabase
            .from('SystemSetting')
            .select('*')
            .eq('key', 'working_days_config')
            .single()
        
        const config = settingData ? JSON.parse(settingData.value) : {
            monday: true, tuesday: true, wednesday: true, thursday: true, friday: true,
            saturday: false, sunday: false, holidays: []
        }

        const { data: feeData } = await supabase
            .from('SystemSetting')
            .select('value')
            .eq('key', 'admin_fee_config')
            .single()
        const ADMIN_FEE = feeData ? JSON.parse(feeData.value).fee : 1000

        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

        // Helper: get deadline datetime for a target date (supports dayOffset)
        function getDeadlineFor(date: Date): Date {
            const dayKey = dayNames[date.getDay()]
            const raw = config.dailyDeadlines?.[dayKey]
            const deadlineObj = typeof raw === 'object' && raw !== null
                ? raw
                : { dayOffset: 0, time: typeof raw === 'string' ? raw : (config.deadlineTime || "08:00") }
            const [h, m] = (deadlineObj.time || "08:00").split(":").map(Number)
            const dayOffset = deadlineObj.dayOffset ?? 0
            // Deadline is on (date + dayOffset) at the cutoff time
            const d = new Date(date)
            d.setDate(d.getDate() + dayOffset)
            d.setHours(h, m, 0, 0)
            return d
        }
        
        // Ensure we work with Jakarta time
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }))
        
        let startDate = new Date(now)
        let endDate = new Date(now)

        if (orderWeek === 'THIS_WEEK') {
            // Start from today
            startDate = new Date(now)
            // End on the coming Sunday
            endDate = new Date(now)
            endDate.setDate(startDate.getDate() + ((7 - startDate.getDay()) % 7))
            if (startDate.getDay() === 0) endDate = new Date(startDate) // Minggu
        } else {
            // Start from next Monday
            startDate = addDays(startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }), 0)
            endDate = addDays(startDate, 6)
        }

        const orderDates: string[] = []
        const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        
        let currentDayLoop = new Date(startDate)
        currentDayLoop.setHours(0,0,0,0)
        const endDayLoop = new Date(endDate)
        endDayLoop.setHours(23,59,59,999)

        while(currentDayLoop <= endDayLoop) {
            const dayName = daysMap[currentDayLoop.getDay()]
            const dateStr = format(currentDayLoop, 'yyyy-MM-dd')
            
            const isWorkingDay = config[dayName]
            const isHoliday = (config.holidays || []).some((h: any) => h.date === dateStr)
            
            const validDeadline = getDeadlineFor(currentDayLoop)
            const isWindowOpen = now <= validDeadline
            
            if (isWorkingDay && !isHoliday && isWindowOpen) {
                orderDates.push(dateStr)
            }
            
            currentDayLoop = addDays(currentDayLoop, 1)
        }

        if (orderDates.length === 0) {
            return NextResponse.json({ error: "Batas waktu pemesanan untuk pilihan periode tersebut sudah berakhir." }, { status: 400 })
        }

        // 3. Kalkulasi Total Harga & Distribusi Item per Hari
        // Ambil info menu, ketersediaan hari, dan nama vendor
        const menuIds = items.map((it: any) => it.menuId)
        const { data: menuData } = await supabase
            .from('MenuItem')
            .select(`
                id, name, price, availableDays,
                vendor:profiles!vendorId(id, "vendorName", name)
            `)
            .in('id', menuIds)
        
        const menuMap = new Map(menuData?.map(m => [m.id, m]))
        
        let totalAmount = 0
        const orderItemsToInsert: any[] = []

        // Mapping hari Inggris ke Indonesia untuk pencocokan availableDays
        const daysMapIndo: Record<string, string> = {
            sunday: "Minggu",
            monday: "Senin",
            tuesday: "Selasa",
            wednesday: "Rabu",
            thursday: "Kamis",
            friday: "Jumat",
            saturday: "Sabtu"
        }

        for (const date of orderDates) {
            const dateObj = new Date(date)
            const dayNameEng = daysMap[dateObj.getDay()]
            const dayNameIndo = daysMapIndo[dayNameEng]

            for (const item of items) {
                const menu = menuMap.get(item.menuId)
                if (!menu) continue

                // HANYA Tambahkan jika menu ini tersedia di hari tersebut
                const isAvailable = menu.availableDays?.includes(dayNameIndo)
                if (!isAvailable) continue

                const price = menu.price || 0
                totalAmount += (price + ADMIN_FEE) * item.quantity
                
                const vendor: any = Array.isArray(menu.vendor) ? menu.vendor[0] : menu.vendor

                orderItemsToInsert.push({
                    menuId: item.menuId,
                    date: date,
                    quantity: item.quantity,
                    price: price,
                    adminFee: ADMIN_FEE,
                    menuName: menu.name || 'Menu',
                    vendorName: vendor?.vendorName || vendor?.name || 'Vendor',
                    vendorId: vendor?.id
                })
            }
        }

        if (orderItemsToInsert.length === 0) {
            return NextResponse.json({ error: "Menu yang dipilih tidak tersedia pada hari aktif minggu depan" }, { status: 400 })
        }

        // 4. Simpan Order
        const { data: orderHeader, error: orderError } = await supabase
            .from('Order')
            .insert({
                studentId,
                totalAmount,
                paymentMethod,
                proofImage: proofImage || null,
                status: 'PENDING',
                transferDate: paymentMethod === 'TRANSFER' ? new Date().toISOString() : null
            })
            .select()
            .single()

        if (orderError) throw orderError

        // 5. Simpan OrderItems
        const finalItems = orderItemsToInsert.map(it => ({
            ...it,
            orderId: orderHeader.id
        }))

        const { error: itemsError } = await supabase.from('OrderItem').insert(finalItems)
        if (itemsError) throw itemsError

        return NextResponse.json({ success: true, orderId: orderHeader.id })
    } catch (e: any) {
        console.error("INSTAN ORDER ERROR:", e)
        return NextResponse.json({ error: e.message || "System Error" }, { status: 500 })
    }
}
