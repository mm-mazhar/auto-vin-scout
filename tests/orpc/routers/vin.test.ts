// tests/orpc/routers/vin.test.ts

import { describe, it, expect } from 'vitest'
import { vinSchema, analyzeInputSchema, listInputSchema } from '@/lib/orpc/routers/vin'

describe('VIN Router Schemas', () => {
  describe('VIN Schema Validation', () => {
    it('accepts valid 17-character VINs without I, O, Q', () => {
      const validVins = [
        '1HGBH41JXMN109186',
        '1G1RC6E45EU123456',
        'JH4KA7561PC008269',
        '5YJSA1E14HF123456',
        'WBADT43452G123456',
      ]

      validVins.forEach((vin) => {
        const result = vinSchema.safeParse(vin)
        expect(result.success).toBe(true)
      })
    })

    it('rejects VINs with incorrect length', () => {
      const invalidVins = [
        '1HGBH41JXMN10918', // 16 chars
        '1HGBH41JXMN1091866', // 18 chars
        '1HGBH41', // 7 chars
        '', // empty
      ]

      invalidVins.forEach((vin) => {
        const result = vinSchema.safeParse(vin)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors[0].message).toContain('17 characters')
        }
      })
    })

    it('rejects VINs containing I, O, or Q', () => {
      const invalidVins = [
        '1HGBH41JXMN10918I', // contains I
        '1HGBH41JXMN10918O', // contains O
        '1HGBH41JXMN10918Q', // contains Q
        'IHGBH41JXMN109186', // I at start
        'OHGBH41JXMN109186', // O at start
        'QHGBH41JXMN109186', // Q at start
      ]

      invalidVins.forEach((vin) => {
        const result = vinSchema.safeParse(vin)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors[0].message).toContain('valid characters')
        }
      })
    })

    it('rejects VINs with lowercase letters', () => {
      const result = vinSchema.safeParse('1hgbh41jxmn109186')
      expect(result.success).toBe(false)
    })

    it('rejects VINs with special characters', () => {
      const invalidVins = [
        '1HGBH41JXMN10918-',
        '1HGBH41JXMN10918_',
        '1HGBH41JXMN10918.',
        '1HGBH41JXMN10918 ',
      ]

      invalidVins.forEach((vin) => {
        const result = vinSchema.safeParse(vin)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Analyze Input Schema', () => {
    it('accepts valid input with VIN and projectId', () => {
      const validInput = {
        vin: '1HGBH41JXMN109186',
        projectId: 'proj_123',
      }

      const result = analyzeInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('rejects input with invalid VIN', () => {
      const invalidInput = {
        vin: 'INVALID',
        projectId: 'proj_123',
      }

      const result = analyzeInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects input with empty projectId', () => {
      const invalidInput = {
        vin: '1HGBH41JXMN109186',
        projectId: '',
      }

      const result = analyzeInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects input with missing fields', () => {
      const invalidInputs = [
        { vin: '1HGBH41JXMN109186' }, // missing projectId
        { projectId: 'proj_123' }, // missing vin
        {}, // missing both
      ]

      invalidInputs.forEach((input) => {
        const result = analyzeInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('List Input Schema', () => {
    it('accepts valid input with projectId', () => {
      const validInput = {
        projectId: 'proj_123',
      }

      const result = listInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('rejects input with empty projectId', () => {
      const invalidInput = {
        projectId: '',
      }

      const result = listInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects input with missing projectId', () => {
      const result = listInputSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })
})
