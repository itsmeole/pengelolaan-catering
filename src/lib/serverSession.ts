/**
 * serverSession.ts
 * Helper untuk mendapatkan user dari session cookie tanpa HTTP call ke Supabase Auth.
 * Gunakan untuk GET routes yang tidak memerlukan verifikasi keamanan tinggi.
 *
 * KAPAN pakai getSessionUser():
 *   - GET routes: ambil data milik user sendiri (riwayat, dashboard, menus)
 *
 * KAPAN tetap pakai getUser():
 *   - POST/PUT/DELETE yang mengubah data sensitif
 *   - Operasi keuangan (refund, verifikasi bayar)
 *   - Reset password, admin actions
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Membaca user dari JWT cookie LOKAL — tidak membuat HTTP call ke Supabase Auth.
 * Lebih cepat, tidak menambah Auth Request count.
 */
export async function getSessionUser() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() {}
            }
        }
    )
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user ?? null
}
