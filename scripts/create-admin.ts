import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdmin() {
    console.log("Membuat akun Admin...")
    
    // Create the admin account
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: "admin@catering.app",
        password: "password123",
        options: {
            data: {
                name: "System Admin",
                role: "ADMIN"
            }
        }
    })

    if (authError) {
        console.error("Gagal Daftar Supabase:", authError.message)
        // Try sign in just in case it already exists
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
            email: "admin@catering.app",
            password: "password123"
        })
        if (loginData.user) {
            console.log("Admin sudah ada dan bisa login!")
        } else {
            console.log("Login Error:", loginErr?.message)
        }
    } else {
        console.log("Berasil membuat akun Admin!")
    }
}

createAdmin()
