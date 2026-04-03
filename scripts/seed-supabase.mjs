import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Membaca file .env
const envFile = fs.readFileSync('.env', 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)/)
    if (match) {
        envVars[match[1]] = match[2].replace(/^"|"$/g, '')
    }
})

const supaUrl = envVars['NEXT_PUBLIC_SUPABASE_URL']
const supaKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']

const supabase = createClient(supaUrl, supaKey)

async function seed() {
    console.log("Memulai proses otomatis seeding pengguna...")
    const users = [
        { email: 'admin@school.id', password: 'password123', meta: { name: 'Admin Sekolah', role: 'ADMIN' } },
        { email: 'vendor1@catering.id', password: 'password123', meta: { name: 'Dapur Bunda', role: 'VENDOR' } },
        { email: 'siswa1@sekolah.sch.id', password: 'password123', meta: { name: 'Budi Santoso', role: 'STUDENT' } }
    ]

    for (const u of users) {
        const { data, error } = await supabase.auth.signUp({
            email: u.email,
            password: u.password,
            options: {
                data: u.meta
            }
        })
        if (error) {
            console.error(`❌ Gagal mendaftar ${u.email}:`, error.message)
        } else {
            console.log(`✅ Berhasil mendaftar: ${u.email}`)
        }
    }
    console.log("✨ Seeding selesai!")
}

seed()
