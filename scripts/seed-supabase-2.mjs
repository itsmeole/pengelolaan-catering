import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

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
    const users = [
        { email: 'admin@sekolah.com', password: 'password123', meta: { name: 'Admin Sekolah', role: 'ADMIN' } },
        { email: 'siswa2@sekolah.com', password: 'password123', meta: { name: 'Siswa Percobaan', role: 'STUDENT' } }
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
}
seed()
