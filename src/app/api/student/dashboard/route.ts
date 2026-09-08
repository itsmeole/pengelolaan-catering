import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/serverSession"
import { createAdminClient } from "@/lib/supabaseAdmin"
import { startOfWeek, endOfWeek, subWeeks, addDays, isSameDay } from "date-fns"

export async function GET() {
    try {
        const user = await getSessionUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = createAdminClient()

        const now = new Date()
        const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
        const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
        const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
        const tomorrow = addDays(now, 1)

        // 1. Ambil seluruh pesanan siswa ini
        const { data: studentOrders, error: orderErr } = await supabase
            .from('Order')
            .select(`
                id, status, paymentMethod, createdAt,
                items:OrderItem(
                    id, date, quantity, price, adminFee, menuName, vendorName, vendorId, cancelStatus,
                    menu:MenuItem(id, name, imageUrl, description)
                )
            `)
            .eq('studentId', user.id)
            .order('createdAt', { ascending: false })

        if (orderErr) throw orderErr

        let allValidItems: any[] = []
        let thisWeekPortions = 0
        const thisWeekDaysSet = new Set<string>()
        let tomorrowItems: any[] = []
        const vendorCount: Record<string, { name: string; vendorName: string; count: number }> = {}

        const isValidOrderStatus = (status: string, method: string) => {
            return ['PAID', 'COMPLETED'].includes(status) || (status === 'PENDING' && method === 'CASH_PAY_LATER')
        }

        (studentOrders || []).forEach(order => {
            const isOrderOk = isValidOrderStatus(order.status, order.paymentMethod)
            if (!isOrderOk) return

            (order.items || []).forEach((item: any) => {
                if (item.cancelStatus === 'APPROVED') return

                allValidItems.push(item)

                const itemDate = new Date(item.date)
                
                // Cek apakah masuk minggu ini
                if (itemDate >= thisWeekStart && itemDate <= thisWeekEnd) {
                    thisWeekPortions += item.quantity || 1
                    thisWeekDaysSet.add(itemDate.toISOString().slice(0, 10))
                }

                // Cek apakah menu besok
                if (isSameDay(itemDate, tomorrow)) {
                    tomorrowItems.push(item)
                }

                // Hitung vendor favorit
                const vid = item.vendorId
                if (vid) {
                    if (!vendorCount[vid]) {
                        vendorCount[vid] = {
                            name: item.vendorName || "Vendor",
                            vendorName: item.vendorName || "Vendor",
                            count: 0
                        }
                    }
                    vendorCount[vid].count += item.quantity || 1
                }
            })
        })

        const topVendors = Object.values(vendorCount)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)

        // 2. Kalkulasi Rekomendasi Menu dari Vendor yang minggu lalu paling sedikit penjualannya
        const { data: allVendors } = await supabase
            .from('profiles')
            .select('id, name, vendorName')
            .eq('role', 'VENDOR')

        let recommendedMenu: any = null

        if (allVendors && allVendors.length > 0) {
            // Hitung penjualan seluruh vendor di minggu lalu
            const { data: lastWeekSales } = await supabase
                .from('OrderItem')
                .select(`
                    id, quantity, vendorId,
                    order:"Order"!inner(status, paymentMethod)
                `)
                .gte('date', lastWeekStart.toISOString())
                .lte('date', lastWeekEnd.toISOString())
                .or('status.in.("PAID","COMPLETED"),and(status.eq.PENDING,paymentMethod.eq.CASH_PAY_LATER)', { foreignTable: 'order' })

            const vendorSalesMap: Record<string, number> = {}
            allVendors.forEach(v => { vendorSalesMap[v.id] = 0 })

            ;(lastWeekSales || []).forEach((item: any) => {
                if (vendorSalesMap[item.vendorId] !== undefined) {
                    vendorSalesMap[item.vendorId] += item.quantity || 1
                }
            })

            // Urutkan dari yang paling sedikit penjualannya
            const sortedVendors = allVendors.map(v => ({
                ...v,
                sales: vendorSalesMap[v.id] || 0
            })).sort((a, b) => a.sales - b.sales)

            const leastVendor = sortedVendors[0]

            if (leastVendor) {
                // Ambil menu dari vendor ini
                const { data: vendorMenus } = await supabase
                    .from('MenuItem')
                    .select('id, name, price, imageUrl, description, vendorId, expiredDate, availableDays')
                    .eq('vendorId', leastVendor.id)
                    .order('createdAt', { ascending: false })
                    .limit(5)

                if (vendorMenus && vendorMenus.length > 0) {
                    // Cari menu yang belum expired jika ada
                    const todayStr = now.toISOString().slice(0, 10)
                    const activeMenu = vendorMenus.find(m => !m.expiredDate || m.expiredDate >= todayStr) || vendorMenus[0]

                    recommendedMenu = {
                        ...activeMenu,
                        vendorName: leastVendor.vendorName || leastVendor.name || "Vendor Rekomendasi",
                        vendorRealName: leastVendor.name,
                        salesLastWeek: leastVendor.sales
                    }
                }
            }
        }

        // Ambil admin fee dari SystemSetting
        const { data: feeData } = await supabase
            .from('SystemSetting')
            .select('value')
            .eq('key', 'admin_fee_config')
            .maybeSingle()
        
        let adminFee = 1000
        if (feeData?.value) {
            try {
                const parsed = JSON.parse(feeData.value)
                if (typeof parsed.fee === 'number') {
                    adminFee = parsed.fee
                }
            } catch (err) {
                console.error("Error parsing admin fee:", err)
            }
        }

        const menuBasePrice = recommendedMenu ? Number(recommendedMenu.price || 0) : 0
        const priceWithFee = menuBasePrice + adminFee

        return NextResponse.json({
            stats: {
                totalOrders: allValidItems.length,
                thisWeekPortions,
                thisWeekDaysCount: thisWeekDaysSet.size
            },
            adminFee,
            recommendedMenu: recommendedMenu ? {
                ...recommendedMenu,
                vendorPrice: menuBasePrice,
                adminFee,
                priceWithFee
            } : null,
            tomorrowMenu: tomorrowItems,
            topVendors
        })

    } catch (e) {
        console.error("STUDENT DASHBOARD ERROR:", e)
        return NextResponse.json({ error: "System Error" }, { status: 500 })
    }
}
