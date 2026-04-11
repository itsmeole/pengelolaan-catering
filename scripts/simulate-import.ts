import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const filePath = path.join(process.cwd(), 'scripts', 'template_import_siswa (1).xlsx')

async function simulateImport() {
    console.log("--- SIMULASI IMPOR SISWA ---")
    
    if (!fs.existsSync(filePath)) {
        console.error("File tidak ditemukan")
        return
    }

    const fileBuffer = fs.readFileSync(filePath)
    const wb = XLSX.read(fileBuffer)
    const wsname = wb.SheetNames[0]
    const ws = wb.Sheets[wsname]
    const data = XLSX.utils.sheet_to_json(ws) as any[]

    // Manual mapping like in frontend
    const findVal = (row: any, keys: string[]) => {
        const rowKeys = Object.keys(row);
        const foundKey = rowKeys.find(rk => 
          keys.some(k => rk.toLowerCase().includes(k.toLowerCase()))
        );
        return foundKey ? row[foundKey] : undefined;
    };

    const formatted = data.map((row: any) => ({
        name: findVal(row, ['Nama', 'Name', 'Full Name']),
        email: findVal(row, ['Email', 'Mail']),
        nis: String(findVal(row, ['NIS', 'NISN', 'Nomor Induk']) || ""),
        class: String(findVal(row, ['Kelas', 'Class', 'Room']) || "")
    })).filter(r => r.name && r.email)

    console.log(`Total data siap impor: ${formatted.length}`)

    const errors: any[] = []
    let success = 0

    // Just check the first 10 errors to find the pattern
    for (const student of formatted) {
        const email = String(student.email).trim().toLowerCase()
        const nis = String(student.nis).trim()
        const password = nis
        const name = student.name

        // Check if user already exists in auth
        const { data: userData, error: fetchError } = await supabase.auth.admin.listUsers()
        // Wait, listUsers is slow for lookup. Let's try to create and catch error.
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name, role: 'STUDENT' }
        })

        if (authError) {
            errors.push({ email, name, error: authError.message })
            if (errors.length >= 10) break; // Stop after 10 errors to see pattern
            continue
        }

        success++
    }

    console.log("\n--- HASIL SIMULASI (10 GALAT PERTAMA) ---")
    console.log(`Berhasil: ${success}`)
    console.log("Errors:", JSON.stringify(errors, null, 2))
}

simulateImport()
