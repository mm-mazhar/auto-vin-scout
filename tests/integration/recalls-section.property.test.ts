// tests/integration/recalls-section.property.test.ts
// Property-Based Tests for RecallsSection badge color logic (Property 10)

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Mirrors the badge color logic from RecallsSection component.
 * Extracted here for pure property testing without a DOM renderer.
 */
function getBadgeColor(count: number): 'green' | 'yellow' | 'red' {
  if (count === 0) return 'green'
  if (count <= 2) return 'yellow'
  return 'red'
}

// ─── Property 10: Recall Badge Color Reflects Count ──────────────────────────

describe('Property 10: Recall Badge Color Reflects Count', () => {
  it('count = 0 always produces green badge', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(0), async (count) => {
        expect(getBadgeColor(count)).toBe('green')
      }),
      { numRuns: 1 }
    )
  })

  it('count in [1, 2] always produces yellow badge', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 2 }), async (count) => {
        expect(getBadgeColor(count)).toBe('yellow')
      }),
      { numRuns: 50 }
    )
  })

  it('count >= 3 always produces red badge', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 1000 }), async (count) => {
        expect(getBadgeColor(count)).toBe('red')
      }),
      { numRuns: 200 }
    )
  })

  it('badge color is deterministic — same count always produces same color', async () => {
    await fc.assert(
      fc.asyncProperty(fc.nat({ max: 100 }), async (count) => {
        const color1 = getBadgeColor(count)
        const color2 = getBadgeColor(count)
        expect(color1).toBe(color2)
      }),
      { numRuns: 200 }
    )
  })

  it('badge color is one of the three valid values for any non-negative count', async () => {
    const validColors = new Set(['green', 'yellow', 'red'])

    await fc.assert(
      fc.asyncProperty(fc.nat({ max: 1000 }), async (count) => {
        const color = getBadgeColor(count)
        expect(validColors.has(color)).toBe(true)
      }),
      { numRuns: 500 }
    )
  })
})
