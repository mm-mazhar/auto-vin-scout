// lib/vin.ts
//
// Client-safe VIN helpers. The check digit (position 9) follows the North
// American standard (49 CFR 565); vehicles built for other markets may not
// use it, so a mismatch is reported as a warning, not a hard error.

export const VIN_LENGTH = 17

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
}
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

/** Uppercase, drop spaces and dashes, and keep only characters a VIN can hold. */
export function normalizeVin(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, VIN_LENGTH)
}

export type VinCheck =
  | { status: 'empty' }
  | { status: 'incomplete'; remaining: number }
  | { status: 'invalid'; message: string }
  | { status: 'ok'; checkDigitMatches: boolean }

export function checkVin(vin: string): VinCheck {
  if (!vin) return { status: 'empty' }
  const bad = vin.match(/[IOQ]/)
  if (bad) {
    return {
      status: 'invalid',
      message: `VINs never use the letter ${bad[0]}. It is usually a ${bad[0] === 'I' ? '1' : '0'}.`,
    }
  }
  if (vin.length < VIN_LENGTH) return { status: 'incomplete', remaining: VIN_LENGTH - vin.length }
  return { status: 'ok', checkDigitMatches: checkDigit(vin) === vin[8] }
}

export function checkDigit(vin: string): string {
  let sum = 0
  for (let i = 0; i < VIN_LENGTH; i++) {
    const ch = vin[i]
    const value = /\d/.test(ch) ? Number(ch) : (TRANSLITERATION[ch] ?? 0)
    sum += value * WEIGHTS[i]
  }
  const rem = sum % 11
  return rem === 10 ? 'X' : String(rem)
}

/** Where the landing page sends a VIN: straight to the report dialog, via sign-in when needed. */
export function vinDestination(vin: string, isAuthenticated: boolean): string {
  const reports = `/dashboard/reports?vin=${encodeURIComponent(vin)}`
  return isAuthenticated ? reports : `/get-started?next=${encodeURIComponent(reports)}`
}
