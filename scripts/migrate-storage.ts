import { createClient } from '@supabase/supabase-js'
import readline from 'readline'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})
const question = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve))

async function migrateStorage() {
    console.log("===================================================")
    console.log("📦 SUPABASE STORAGE MIGRATION SCRIPT 📦")
    console.log("===================================================\n")
    console.log("Script ini akan memindahkan file gambar dari Project Lama ke Project Baru.")
    console.log("⚠️ SYARAT: Pastikan Anda SUDAH membuat bucket 'menus' dan 'proofs' di project BARU dan di-set Public.\n")

    // Get URL and Service Keys
    const oldUrl = process.argv[2] || await question("➤ Paste [Project URL] LAMA (Contoh: https://xxxx.supabase.co): ")
    const oldKey = process.argv[3] || await question("➤ Paste [Service Role Key] LAMA: ")
    const newUrl = process.argv[4] || await question("➤ Paste [Project URL] BARU (Contoh: https://yyyy.supabase.co): ")
    const newKey = process.argv[5] || await question("➤ Paste [Service Role Key] BARU: ")

    if (!oldUrl || !oldKey || !newUrl || !newKey) {
        console.error("URL dan Key tidak boleh kosong.")
        process.exit(1)
    }

    const oldClient = createClient(oldUrl.trim(), oldKey.trim())
    const newClient = createClient(newUrl.trim(), newKey.trim())

    const buckets = ['menus', 'proofs', 'refunds']

    for (const bucketName of buckets) {
        console.log(`\n📂 Memeriksa Bucket: [${bucketName}]...`)
        
        const { data: files, error: listError } = await oldClient.storage.from(bucketName).list()
        
        if (listError) {
            console.log(`⚠️ Bucket '${bucketName}' tidak ditemukan atau gagal diakses. Lewati.`)
            continue
        }

        // Filter out empty placeholders (usually .emptyFolderPlaceholder)
        const validFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder' && f.metadata)
        
        if (validFiles.length === 0) {
            console.log(`Bucket '${bucketName}' kosong.`)
            continue
        }

        console.log(`Ditemukan ${validFiles.length} file di bucket '${bucketName}'. Memulai transfer...`)

        let success = 0
        let failed = 0

        for (const file of validFiles) {
            try {
                // 1. Download file dari project LAMA
                const { data: fileData, error: downloadError } = await oldClient.storage.from(bucketName).download(file.name)
                
                if (downloadError || !fileData) {
                    console.error(`❌ Gagal download: ${file.name} - ${downloadError?.message}`)
                    failed++
                    continue
                }

                // 2. Upload file ke project BARU
                const { error: uploadError } = await newClient.storage.from(bucketName).upload(file.name, fileData, {
                    contentType: file.metadata?.mimetype || 'image/jpeg',
                    upsert: true
                })

                if (uploadError) {
                    console.error(`❌ Gagal upload: ${file.name} - ${uploadError.message}`)
                    failed++
                } else {
                    process.stdout.write(".") // Indikator progress
                    success++
                }
            } catch (e) {
                console.error(`\n❌ Error memproses file ${file.name}`)
                failed++
            }
        }
        
        console.log(`\n✅ Selesai untuk bucket '${bucketName}'. (Sukses: ${success}, Gagal: ${failed})`)
    }

    console.log("\n🎉 SELURUH GAMBAR BERHASIL DIPINDAHKAN! 🎉")
    process.exit(0)
}

migrateStorage()
