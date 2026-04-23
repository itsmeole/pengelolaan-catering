/**
 * uploadImage.ts
 * Client-side utility: compress → upload ke /api/upload → return public URL
 * Dipakai di semua halaman yang butuh upload gambar (proof, refund, menu).
 */

/**
 * Kompres gambar ke JPEG max 800px & kualitas 70%.
 * Ukuran turun ~70-90% dari foto asli HP.
 */
async function compressImage(file: File, maxPx = 800, quality = 0.7): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            URL.revokeObjectURL(url)
            const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
            const canvas = document.createElement('canvas')
            canvas.width = Math.round(img.width * scale)
            canvas.height = Math.round(img.height * scale)
            canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
                'image/jpeg',
                quality
            )
        }
        img.onerror = reject
        img.src = url
    })
}

/**
 * Upload gambar ke Supabase Storage via API route /api/upload.
 * @param file   - File dari <input type="file">
 * @param bucket - Nama bucket: 'proofs' | 'menus' | 'refunds'
 * @returns      - Public URL string dari Supabase Storage
 */
export async function uploadImage(file: File, bucket: 'proofs' | 'menus' | 'refunds'): Promise<string> {
    // 1. Kompres dulu
    const compressed = await compressImage(file)

    // 2. Kirim ke API route
    const formData = new FormData()
    formData.append('file', compressed, `${Date.now()}.jpg`)
    formData.append('bucket', bucket)

    const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload gagal')
    }

    const { url } = await res.json()
    return url
}
