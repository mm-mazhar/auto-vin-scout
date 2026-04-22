// tests/orpc/routers/vin.property.test.ts

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { vinSchema } from '@/lib/orpc/routers/vin'

/**
 * Property-Based Tests for VIN Format Validation
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * Property 1: VIN Format Validation
 * For any string submitted as a VIN, the VIN_Router SHALL accept it if and only if 
 * it is exactly 17 characters long and matches the regex pattern /^[A-HJ-NPR-Z0-9]{17}$/ 
 * (excluding characters I, O, and Q).
 */
describe('VIN Format Validation Properties', () => {
  describe('Property 1: VIN Format Validation', () => {
    it('accepts all valid 17-character VINs without I, O, Q', async () => {
      // Generator for valid VIN characters (A-H, J-N, P, R-Z, 0-9)
      const validVinChar = fc.constantFrom(
        ...'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'.split('')
      )
      
      // Generator for valid 17-character VINs
      const validVin = fc.array(validVinChar, { 
        minLength: 17, 
        maxLength: 17 
      }).map(chars => chars.join(''))
      
      await fc.assert(
        fc.asyncProperty(validVin, async (vin) => {
          const result = vinSchema.safeParse(vin)
          expect(result.success).toBe(true)
        }),
        { numRuns: 1000 } // Run 1000 test cases
      )
    })

    it('rejects VINs with incorrect length', async () => {
      // Generator for strings with length != 17
      const invalidLengthVin = fc.oneof(
        // Too short (0-16 characters)
        fc.array(
          fc.constantFrom(...'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'.split('')),
          { minLength: 0, maxLength: 16 }
        ).map(chars => chars.join('')),
        // Too long (18-30 characters)
        fc.array(
          fc.constantFrom(...'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'.split('')),
          { minLength: 18, maxLength: 30 }
        ).map(chars => chars.join(''))
      )
      
      await fc.assert(
        fc.asyncProperty(invalidLengthVin, async (vin) => {
          const result = vinSchema.safeParse(vin)
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.errors[0].message).toContain('17 characters')
          }
        }),
        { numRuns: 500 }
      )
    })

    it('rejects VINs containing I, O, or Q', async () => {
      // Generator for VINs with at least one invalid character (I, O, or Q)
      const invalidChar = fc.constantFrom('I', 'O', 'Q')
      const validChar = fc.constantFrom(
        ...'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'.split('')
      )
      
      // Generate a 17-char string with at least one I, O, or Q
      const vinWithInvalidChar = fc.tuple(
        fc.integer({ min: 0, max: 16 }), // Position for invalid char
        invalidChar,
        fc.array(validChar, { minLength: 16, maxLength: 16 })
      ).map(([position, invalid, validChars]) => {
        const chars = [...validChars]
        chars.splice(position, 0, invalid)
        return chars.join('')
      })
      
      await fc.assert(
        fc.asyncProperty(vinWithInvalidChar, async (vin) => {
          const result = vinSchema.safeParse(vin)
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.errors[0].message).toContain('valid characters')
          }
        }),
        { numRuns: 500 }
      )
    })

    it('rejects VINs with lowercase letters', async () => {
      // Generator for VINs with at least one lowercase letter
      const lowercaseChar = fc.constantFrom(
        ...'abcdefghjklmnprstuvwxyz'.split('')
      )
      const validChar = fc.constantFrom(
        ...'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'.split('')
      )
      
      const vinWithLowercase = fc.tuple(
        fc.integer({ min: 0, max: 16 }),
        lowercaseChar,
        fc.array(validChar, { minLength: 16, maxLength: 16 })
      ).map(([position, lowercase, validChars]) => {
        const chars = [...validChars]
        chars.splice(position, 0, lowercase)
        return chars.join('')
      })
      
      await fc.assert(
        fc.asyncProperty(vinWithLowercase, async (vin) => {
          const result = vinSchema.safeParse(vin)
          expect(result.success).toBe(false)
        }),
        { numRuns: 300 }
      )
    })

    it('rejects VINs with special characters', async () => {
      // Generator for VINs with special characters
      const specialChar = fc.constantFrom(
        ...'!@#$%^&*()-_=+[]{}|;:,.<>?/~`\'" '.split('')
      )
      const validChar = fc.constantFrom(
        ...'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'.split('')
      )
      
      const vinWithSpecialChar = fc.tuple(
        fc.integer({ min: 0, max: 16 }),
        specialChar,
        fc.array(validChar, { minLength: 16, maxLength: 16 })
      ).map(([position, special, validChars]) => {
        const chars = [...validChars]
        chars.splice(position, 0, special)
        return chars.join('')
      })
      
      await fc.assert(
        fc.asyncProperty(vinWithSpecialChar, async (vin) => {
          const result = vinSchema.safeParse(vin)
          expect(result.success).toBe(false)
        }),
        { numRuns: 300 }
      )
    })

    it('validates the complete VIN format property: accepts valid, rejects invalid', async () => {
      // Combined property: any string is either valid or invalid, never both
      const anyString = fc.string({ minLength: 0, maxLength: 30 })
      
      await fc.assert(
        fc.asyncProperty(anyString, async (str) => {
          const result = vinSchema.safeParse(str)
          
          // Check if string matches valid VIN criteria
          const isValidLength = str.length === 17
          const hasOnlyValidChars = /^[A-HJ-NPR-Z0-9]{17}$/.test(str)
          const shouldBeValid = isValidLength && hasOnlyValidChars
          
          // Assert that validation result matches expected outcome
          expect(result.success).toBe(shouldBeValid)
        }),
        { numRuns: 1000 }
      )
    })
  })
})
