import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
    console.log("--- MIGRATING DB: ADD COLUMN PHONE ---")
    // SQL via RPC or just DDL execution if possible. 
    // Supabase JS doesn't support raw SQL easily unless we use a library or the REST API.
    // I will use a direct postgres connection since I have the DATABASE_URL.
    
    const postgres = require('postgres')
    const sql = postgres(process.env.DATABASE_URL!)

    try {
        await sql`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "phone" VARCHAR;`
        console.log("SUCCESS: Column 'phone' added to 'profiles'")
    } catch (e: any) {
        console.error("ERROR:", e.message)
    } finally {
        await sql.end()
    }
}

migrate()
