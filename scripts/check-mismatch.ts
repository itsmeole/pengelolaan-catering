import { createClient } from '@supabase/supabase-js'

const oldUrl = 'https://ddcmaczslnbrbzmihjpg.supabase.co'
const oldKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY21hY3pzbG5icmJ6bWloanBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE1OTM4MywiZXhwIjoyMDkwNzM1MzgzfQ.BxRdYVq-ExRtq7OGz30miTItOXoSzTxsnmCku7oANWQ'

const newUrl = 'https://dgdwxzozcwxxixkyvpxu.supabase.co'
const newKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZHd4em96Y3d4eGl4a3l2cHh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIwODE0MSwiZXhwIjoyMDkyNzg0MTQxfQ.HmoomF22HooNrLEfY9NciB_WIx7iDHYI5msJ3ku10Os'

const oldSupabase = createClient(oldUrl, oldKey)
const newSupabase = createClient(newUrl, newKey)

async function compare() {
    console.log("Fetching Old System Orders...")
    const { data: oldItems } = await oldSupabase
        .from('OrderItem')
        .select('*, order:Order(id, status, paymentMethod)')
        .ilike('menuName', '%Paket D%')
    
    console.log("Fetching New System Orders...")
    const { data: newItems } = await newSupabase
        .from('OrderItem')
        .select('*, order:Order(id, status, paymentMethod)')
        .ilike('menuName', '%Paket D%')

    console.log(`Old Items count: ${oldItems?.length}`)
    console.log(`New Items count: ${newItems?.length}`)

    // Filter logic for Daftar Masak
    const filterDaftarMasak = (items: any[]) => items?.filter(item => {
        const order = item.order
        if (!order) return false
        return order.status === 'PAID' || order.status === 'COMPLETED' || (order.status === 'PENDING' && order.paymentMethod === 'CASH_PAY_LATER')
    })

    const oldValid = filterDaftarMasak(oldItems || [])
    const newValid = filterDaftarMasak(newItems || [])

    console.log(`Old Valid for Daftar Masak: ${oldValid.length}`)
    console.log(`New Valid for Daftar Masak: ${newValid.length}`)

    // Find the missing items
    if (oldValid.length > newValid.length) {
        const newIds = new Set(newValid.map(i => i.id))
        const missing = oldValid.filter(i => !newIds.has(i.id))
        console.log("MISSING ITEMS in new system:")
        missing.forEach(m => {
            console.log(`- ID: ${m.id}, Date: ${m.date}, Status: ${m.order.status}, PayMethod: ${m.order.paymentMethod}`)
            
            // Is it even in the new database at all?
            const inNewDb = newItems?.find(n => n.id === m.id)
            if (inNewDb) {
                console.log(`  -> It IS in the new DB, but with order status: ${inNewDb.order?.status}, pay: ${inNewDb.order?.paymentMethod}`)
            } else {
                console.log(`  -> NOT in the new DB at all.`)
            }
        })
    }
}

compare()
