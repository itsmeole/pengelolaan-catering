import { createAdminClient } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'
import { addDays, startOfWeek, addWeeks, format, isBefore, parseISO } from 'date-fns'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { studentId, phone, items, paymentMethod, proofImage } = body

        if (!studentId || !items || items.length === 0) {
            return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 })
        }

        const supabase = createAdminClient()

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

        // Tentukan tanggal-tanggal makan untuk minggu depan (Senin - Jumat/Sabtu sesuai config)
        // Minggu depan dihitung dari awal minggu berikutnya (Senin depan)
        const nextMonday = addDays(startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }), 0)
        
        const orderDates: string[] = []
        const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        
        for (let i = 0; i < 7; i++) {
            const currentDay = addDays(nextMonday, i)
            const dayName = daysMap[currentDay.getDay()]
            const dateStr = format(currentDay, 'yyyy-MM-dd')
            
            // Cek apakah hari tersebut aktif di config dan bukan hari libur
            const isWorkingDay = config[dayName]
            const isHoliday = (config.holidays || []).some((h: any) => h.date === dateStr)
            
            if (isWorkingDay && !isHoliday) {
                orderDates.push(dateStr)
            }
        }

        if (orderDates.length === 0) {
            return NextResponse.json({ error: "Tidak ada hari kerja tersedia di minggu depan" }, { status: 400 })
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
        const ADMIN_FEE = 1000

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
