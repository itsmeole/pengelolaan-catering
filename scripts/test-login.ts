import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    console.log("Testing Student Login...")
    const { data: q1, error: err1 } = await supabase.auth.signInWithPassword({
        email: "putrasanjaya01@gmail.com",
        password: "231351070"
    })
    console.log("Student:", q1, err1?.message)

    console.log("Testing Admin Login...")
    const { data: q2, error: err2 } = await supabase.auth.signInWithPassword({
        email: "admin@school.id",
        password: "password123"
    })
    console.log("Admin:", q2, err2?.message)
}

test()
