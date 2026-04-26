import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Membaca file .env untuk kredensial project BARU
const envFile = fs.readFileSync('.env', 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)/)
    if (match) {
        envVars[match[1]] = match[2].replace(/^"|"|'|'$/g, '')
    }
})

// MENGGUNAKAN SERVICE ROLE KEY AGAR BISA MEMBUAT USER TANPA LIMIT
const supaUrl = envVars['NEXT_PUBLIC_SUPABASE_URL']
const supaServiceKey = envVars['SUPABASE_SERVICE_ROLE_KEY']

if (!supaUrl || !supaServiceKey) {
    console.error("❌ ERROR: Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sudah benar di file .env")
    process.exit(1)
}

const supabase = createClient(supaUrl, supaServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function migrateAuth() {
    console.log("🚀 Memulai proses pemulihan akun Auth dari tabel profiles...")
    
    // 1. Ambil semua data dari tabel profiles
    const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
    
    if (fetchError) {
        console.error("❌ Gagal mengambil data profiles:", fetchError)
        return
    }

    console.log(`Menemukan ${profiles.length} profil. Sedang membuat ulang akun login...`)

    let successCount = 0
    let failedCount = 0

    // 2. Buat ulang Auth User untuk setiap profile
    for (const p of profiles) {
        // Tentukan password: Jika role STUDENT, gunakan NIS. Jika tidak ada NIS, gunakan "password123".
        const password = p.role === 'STUDENT' ? (p.nis || 'password123') : 'password123'
        
        // Cek apakah user dengan email ini sudah ada (optional, admin.createUser akan error jika sudah ada)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: p.email,
            password: password,
            email_confirm: true,
            user_metadata: {
                name: p.name,
                role: p.role,
                nis: p.nis || null
            }
        })

        if (createError) {
            console.error(`⚠️ Gagal membuat auth untuk ${p.email}: ${createError.message}`)
            failedCount++
        } else {
            console.log(`✅ Berhasil memulihkan akun: ${p.email} (Password: ${password})`)
            
            // Opsional: Karena createUser membuat ID acak baru untuk Auth, 
            // idealnya kita harus mengupdate kolom 'id' di tabel profiles, MenuItem, Order agar nyambung.
            // TAPI, tabel profiles kita id-nya tersambung ke id lama. 
            // Supabase admin.createUser TIDAK BISA memaksakan custom ID (UUID).
            console.warn("PERHATIAN: ID Auth baru tidak sama dengan ID Profile lama. Harap cek keterkaitan data!")
            successCount++
        }
    }

    console.log(`\n✨ Selesai! Berhasil: ${successCount}, Gagal: ${failedCount}`)
}

migrateAuth()
