import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

// Bucket yang diizinkan
const ALLOWED_BUCKETS = ['proofs', 'menus', 'refunds']

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const bucket = formData.get('bucket') as string | null

        if (!file || !bucket) {
            return NextResponse.json({ error: 'File dan bucket wajib diisi' }, { status: 400 })
        }

        if (!ALLOWED_BUCKETS.includes(bucket)) {
            return NextResponse.json({ error: 'Bucket tidak valid' }, { status: 400 })
        }

        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: 'File terlalu besar (max 2MB setelah kompresi)' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Generate nama file unik
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

        // Pastikan bucket ada (tidak error jika sudah ada)
        await supabase.storage.createBucket(bucket, { public: true }).catch(() => {})

        // Upload ke Supabase Storage
        const arrayBuffer = await file.arrayBuffer()
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: false,
            })

        if (error) {
            console.error('Storage upload error:', error)
            return NextResponse.json({ error: 'Gagal upload ke storage' }, { status: 500 })
        }

        // Ambil public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path)

        return NextResponse.json({ url: publicUrl })
    } catch (e: any) {
        console.error('Upload API error:', e)
        return NextResponse.json({ error: e.message || 'System Error' }, { status: 500 })
    }
}
