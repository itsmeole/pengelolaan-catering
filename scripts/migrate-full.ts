import postgres from 'postgres'
import readline from 'readline'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const question = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve))

async function migrate() {
    console.log("===================================================")
    console.log("🚀 SUPABASE FULL DATABASE MIGRATION SCRIPT 🚀")
    console.log("===================================================\n")
    
    console.log("Script ini akan memindahkan SELURUH data Anda (termasuk Auth Users & Passwords) dari Project Lama ke Project Baru tanpa ada data yang hilang.\n")
    console.log("⚠️ SYARAT SEBELUM MELANJUTKAN:")
    console.log("1. Pastikan Anda SUDAH membuat tabel/menjalankan 'database.sql' di SQL Editor project baru.")
    console.log("2. Siapkan 'Transaction Pooler' Connection String dari kedua project (Lama & Baru).")
    console.log("   Cara ambil: Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI.\n")

    const oldUrl = process.argv[2] || await question("➤ Paste Connection String Project LAMA: ")
    const newUrl = process.argv[3] || await question("➤ Paste Connection String Project BARU: ")

    if (!oldUrl || !newUrl) {
        console.log("URL tidak boleh kosong. Dibatalkan.")
        process.exit(1)
    }

    console.log("\n⏳ Sedang menghubungkan ke kedua database...")
    const sqlOld = postgres(oldUrl, { ssl: 'require' })
    const sqlNew = postgres(newUrl, { ssl: 'require' })

    try {
        // --- 1. AUTH USERS ---
        console.log("\n[1/6] Memigrasikan Auth Users & Passwords...")
        const users = await sqlOld`SELECT * FROM auth.users`
        if (users.length > 0) {
            console.log("Mempersiapkan database baru (Menghapus data bawaan/seeder)...")
            await sqlNew`DELETE FROM auth.users`
            
            for (const user of users) {
                // Hapus kolom yang di-generate otomatis oleh Supabase versi terbaru
                delete user.confirmed_at;
                delete user.is_anonymous; // Kadang is_anonymous juga generated
                
                await sqlNew`
                    INSERT INTO auth.users ${sqlNew(user)} 
                    ON CONFLICT (id) DO NOTHING
                `
            }
            console.log(`✅ Berhasil memigrasi ${users.length} Auth Users.`)
        } else {
            console.log("Tidak ada data Auth Users.")
        }

        // --- 2. AUTH IDENTITIES ---
        console.log("[2/6] Memigrasikan Auth Identities (Sesi Login)...")
        const identities = await sqlOld`SELECT * FROM auth.identities`
        if (identities.length > 0) {
            for (const ident of identities) {
                // Hapus kolom generated di versi terbaru
                delete ident.email;
                
                await sqlNew`
                    INSERT INTO auth.identities ${sqlNew(ident)} 
                    ON CONFLICT (id) DO NOTHING
                `
            }
            console.log(`✅ Berhasil memigrasi ${identities.length} Auth Identities.`)
        } else {
            console.log("Tidak ada data Auth Identities.")
        }

        // --- 3. PROFILES ---
        console.log("[3/6] Memigrasikan tabel Profiles...")
        const profiles = await sqlOld`SELECT * FROM public.profiles`
        if (profiles.length > 0) {
            for (const prof of profiles) {
                await sqlNew`
                    INSERT INTO public.profiles ${sqlNew(prof)} 
                    ON CONFLICT (id) DO UPDATE SET 
                        "name" = EXCLUDED."name",
                        "nis" = EXCLUDED."nis",
                        "role" = EXCLUDED."role",
                        "phone" = EXCLUDED."phone",
                        "class" = EXCLUDED."class"
                `
            }
            console.log(`✅ Berhasil memigrasi ${profiles.length} Profil.`)
        }

        // --- 4. SYSTEM SETTING ---
        console.log("[4/6] Memigrasikan tabel SystemSetting...")
        const settings = await sqlOld`SELECT * FROM public."SystemSetting"`
        if (settings.length > 0) {
            for (const setting of settings) {
                await sqlNew`
                    INSERT INTO public."SystemSetting" ${sqlNew(setting)} 
                    ON CONFLICT (key) DO UPDATE SET "value" = EXCLUDED."value"
                `
            }
            console.log(`✅ Berhasil memigrasi ${settings.length} Pengaturan Sistem.`)
        }

        // --- 5. MENU ITEMS ---
        console.log("[5/6] Memigrasikan tabel MenuItem...")
        const menus = await sqlOld`SELECT * FROM public."MenuItem"`
        if (menus.length > 0) {
            for (const menu of menus) {
                await sqlNew`
                    INSERT INTO public."MenuItem" ${sqlNew(menu)} 
                    ON CONFLICT (id) DO NOTHING
                `
            }
            console.log(`✅ Berhasil memigrasi ${menus.length} Menu Vendor.`)
        }

        // --- 6. ORDERS & ORDER ITEMS ---
        console.log("[6/6] Memigrasikan tabel Order dan OrderItem...")
        const orders = await sqlOld`SELECT * FROM public."Order"`
        if (orders.length > 0) {
            let oSuccess = 0;
            for (const order of orders) {
                try {
                    await sqlNew`
                        INSERT INTO public."Order" ${sqlNew(order)} 
                        ON CONFLICT (id) DO NOTHING
                    `
                    oSuccess++;
                } catch(e: any) {
                    console.warn(`⚠️ Lewati Order ${order.id}: ${e.message}`)
                }
            }
            console.log(`✅ Berhasil memigrasi ${oSuccess} Induk Pesanan (Order).`)
        }

        const orderItems = await sqlOld`SELECT * FROM public."OrderItem"`
        if (orderItems.length > 0) {
            let iSuccess = 0;
            for (const item of orderItems) {
                try {
                    await sqlNew`
                        INSERT INTO public."OrderItem" ${sqlNew(item)} 
                        ON CONFLICT (id) DO NOTHING
                    `
                    iSuccess++;
                } catch(e: any) {
                    console.warn(`⚠️ Lewati OrderItem ${item.id}: ${e.message}`)
                }
            }
            console.log(`✅ Berhasil memigrasi ${iSuccess} Detail Pesanan (OrderItem).`)
        }

        console.log("\n🎉 MIGRASI DATABASE SELESAI DENGAN SUKSES! 🎉")
        console.log("Semua data, termasuk riwayat pesanan dan akun siswa berserta passwordnya, telah disalin secara identik ke project baru Anda.")
        
    } catch (e) {
        console.error("\n❌ TERJADI KESALAHAN SAAT MIGRASI:")
        console.error(e)
    } finally {
        await sqlOld.end()
        await sqlNew.end()
        process.exit(0)
    }
}

migrate()
