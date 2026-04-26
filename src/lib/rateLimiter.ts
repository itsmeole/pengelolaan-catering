/**
 * Simple in-memory IP rate limiter for Next.js API routes.
 * Resets on server restart (sufficient for anti-spam, not a security-critical gate).
 */

interface RateLimitEntry {
    count: number
    firstRequestAt: number
    lastRequestAt: number
}

// Global map persists across requests within the same Node.js process
const store = new Map<string, RateLimitEntry>()

const WINDOW_MS = 3 * 60 * 1000 // 3 minutes
const MAX_REQUESTS = 3          // Max 10 orders per window per IP (mengakomodasi WiFi sekolah/NAT)

/** Clean up entries older than 2x the window to prevent memory leaks */
function cleanup() {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
        if (now - entry.firstRequestAt > WINDOW_MS * 2) {
            store.delete(key)
        }
    }
}

export interface RateLimitResult {
    allowed: boolean
    /** How many seconds remain before the window resets */
    retryAfterSeconds: number
    requestCount: number
}

/**
 * Check if an IP is within rate limits.
 * Call this BEFORE processing the request.
 * Call `recordRequest` after a successful check to increment the counter.
 */
export function checkRateLimit(ip: string): RateLimitResult {
    cleanup()
    const now = Date.now()
    const entry = store.get(ip)

    if (!entry) {
        return { allowed: true, retryAfterSeconds: 0, requestCount: 0 }
    }

    const windowElapsed = now - entry.firstRequestAt
    if (windowElapsed > WINDOW_MS) {
        // Window expired — reset
        store.delete(ip)
        return { allowed: true, retryAfterSeconds: 0, requestCount: 0 }
    }

    if (entry.count >= MAX_REQUESTS) {
        const retryAfterMs = WINDOW_MS - windowElapsed
        return {
            allowed: false,
            retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
            requestCount: entry.count
        }
    }

    return { allowed: true, retryAfterSeconds: 0, requestCount: entry.count }
}

/** Record a new request for the given IP */
export function recordRequest(ip: string) {
    const now = Date.now()
    const existing = store.get(ip)
    if (!existing) {
        store.set(ip, { count: 1, firstRequestAt: now, lastRequestAt: now })
    } else {
        existing.count++
        existing.lastRequestAt = now
    }
}

/**
 * Extract IP from Next.js Request object.
 * Handles Vercel / proxies via x-forwarded-for header.
 */
export function getClientIp(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for')
    if (forwarded) {
        // x-forwarded-for can be a comma-separated list; take the first
        return forwarded.split(',')[0].trim()
    }
    // Fallback for local dev
    return req.headers.get('x-real-ip') || '127.0.0.1'
}
