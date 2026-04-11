import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
    console.log("--- AUDIT PROFIL SISWA ---")
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('name, email, nis, role')
        .eq('role', 'STUDENT')
    
    if (error) {
        console.error("Error fetching profiles:", error)
        return
    }

    console.log(`Total Siswa: ${profiles.length}`)
    
    const nisCounts: Record<string, number> = {}
    profiles.forEach(p => {
        const nis = String(p.nis)
        nisCounts[nis] = (nisCounts[nis] || 0) + 1
    })

    console.log("NIS Duplikat (atau undefined):")
    Object.entries(nisCounts).forEach(([nis, count]) => {
        if (count > 1) {
            console.log(`- NIS [${nis}]: ${count} baris`)
        }
    })

    console.log("\nSample 5 data terakhir:")
    console.log(profiles.slice(-5))
}

debug()
