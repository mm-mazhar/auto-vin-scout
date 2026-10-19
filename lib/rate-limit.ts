// lib/rate-limit.ts

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export interface FixedWindowLimiter {
  check: (key: string) => RateLimitResult
}

/**
 * In-memory fixed-window limiter. State lives per server instance, so on
 * serverless hosts it bounds bursts per instance rather than globally.
 */
export function createFixedWindowLimiter(
  { limit, windowMs }: { limit: number; windowMs: number },
  now: () => number = Date.now
): FixedWindowLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>()

  return {
    check(key) {
      const timestamp = now()

      if (windows.size > 10_000) {
        for (const [entryKey, entry] of windows) {
          if (entry.resetAt <= timestamp) windows.delete(entryKey)
        }
      }

      const current = windows.get(key)
      if (!current || current.resetAt <= timestamp) {
        windows.set(key, { count: 1, resetAt: timestamp + windowMs })
        return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
      }

      if (current.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.ceil((current.resetAt - timestamp) / 1000),
        }
      }

      current.count += 1
      return { allowed: true, remaining: limit - current.count, retryAfterSeconds: 0 }
    },
  }
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }
  return headers.get('x-real-ip')?.trim() || 'unknown'
}
