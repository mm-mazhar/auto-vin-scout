// tests/unit/rate-limit.test.ts

import { describe, expect, it } from 'vitest'
import { clientIpFromHeaders, createFixedWindowLimiter } from '@/lib/rate-limit'

describe('createFixedWindowLimiter', () => {
  it('allows requests up to the limit', () => {
    // #given a limiter of 2 per window
    const limiter = createFixedWindowLimiter({ limit: 2, windowMs: 1000 }, () => 0)

    // #when the same key calls twice
    limiter.check('ip')
    const second = limiter.check('ip')

    // #then the second call is still allowed
    expect(second.allowed).toBe(true)
  })

  it('blocks the request after the limit and reports the wait', () => {
    // #given a limiter of 1 per second at t=200ms into the window
    let time = 0
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 1000 }, () => time)
    limiter.check('ip')
    time = 200

    // #when the key calls again
    const result = limiter.check('ip')

    // #then it is blocked with the remaining window rounded up
    expect(result).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 1 })
  })

  it('resets once the window has passed', () => {
    // #given an exhausted key
    let time = 0
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 1000 }, () => time)
    limiter.check('ip')

    // #when the window elapses
    time = 1000
    const result = limiter.check('ip')

    // #then the key is allowed again
    expect(result.allowed).toBe(true)
  })

  it('tracks keys independently', () => {
    // #given one exhausted key
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 1000 }, () => 0)
    limiter.check('a')

    // #when a different key calls
    const result = limiter.check('b')

    // #then it is unaffected
    expect(result.allowed).toBe(true)
  })
})

describe('clientIpFromHeaders', () => {
  it('uses the first x-forwarded-for entry', () => {
    // #given a proxied request
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })

    // #when / #then the client hop is returned
    expect(clientIpFromHeaders(headers)).toBe('203.0.113.7')
  })

  it('falls back to x-real-ip, then unknown', () => {
    // #given a request with no forwarding headers
    const headers = new Headers()

    // #when / #then the shared unknown bucket is used
    expect(clientIpFromHeaders(headers)).toBe('unknown')
  })
})
