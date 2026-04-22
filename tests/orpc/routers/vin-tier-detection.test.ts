// tests/orpc/routers/vin-tier-detection.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { determineUserTier, type UserTier } from '@/lib/orpc/routers/vin'

// Create a mock Prisma client
const createMockPrismaClient = () => {
  return {
    organization: {
      findUnique: vi.fn()
    }
  } as unknown as PrismaClient
}

// Helper function to create mock subscription objects
const createMockSubscription = (status: string = 'active') => ({
  stripeSubscriptionId: `sub_${Math.random().toString(36).substr(2, 9)}`,
  interval: 'month',
  status,
  planId: 'plan_123',
  currentPeriodStart: 1640995200,
  currentPeriodEnd: 1643673600,
  periodEndReminderSent: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  organizationId: 'org_123'
})

describe('Organization Tier Detection', () => {
  let prismaMock: PrismaClient

  beforeEach(() => {
    prismaMock = createMockPrismaClient()
  })

  describe('determineUserTier', () => {
    const testOrgId = 'org_123'

    it('correctly identifies free tier users (0 credits, no subscription)', async () => {
      // Arrange
      vi.mocked(prismaMock.organization.findUnique).mockResolvedValue({
        credits: 0,
        subscription: null
      } as any)

      // Act
      const result = await determineUserTier(prismaMock, testOrgId)

      // Assert
      expect(result).toBe('FREE_TIER')
      expect(prismaMock.organization.findUnique).toHaveBeenCalledWith({
        where: { id: testOrgId },
        select: { 
          credits: true,
          subscription: true
        }
      })
    })

    it('correctly identifies zero credits users (0 credits, has subscription)', async () => {
      // Arrange
      vi.mocked(prismaMock.organization.findUnique).mockResolvedValue({
        credits: 0,
        subscription: { 
          stripeSubscriptionId: 'sub_123',
          interval: 'month',
          status: 'active',
          planId: 'plan_123',
          currentPeriodStart: 1640995200,
          currentPeriodEnd: 1643673600,
          periodEndReminderSent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId: testOrgId
        }
      } as any)

      // Act
      const result = await determineUserTier(prismaMock, testOrgId)

      // Assert
      expect(result).toBe('ZERO_CREDITS')
    })

    it('correctly identifies zero credits users with canceled subscription', async () => {
      // Arrange
      vi.mocked(prismaMock.organization.findUnique).mockResolvedValue({
        credits: 0,
        subscription: { 
          stripeSubscriptionId: 'sub_123',
          interval: 'month',
          status: 'canceled',
          planId: 'plan_123',
          currentPeriodStart: 1640995200,
          currentPeriodEnd: 1643673600,
          periodEndReminderSent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId: testOrgId
        }
      } as any)

      // Act
      const result = await determineUserTier(prismaMock, testOrgId)

      // Assert
      expect(result).toBe('ZERO_CREDITS')
    })

    it('correctly identifies paid users (credits > 0)', async () => {
      // Arrange
      vi.mocked(prismaMock.organization.findUnique).mockResolvedValue({
        credits: 5,
        subscription: null
      } as any)

      // Act
      const result = await determineUserTier(prismaMock, testOrgId)

      // Assert
      expect(result).toBe('PAID')
    })

    it('correctly identifies paid users with subscription and credits', async () => {
      // Arrange
      vi.mocked(prismaMock.organization.findUnique).mockResolvedValue({
        credits: 10,
        subscription: { 
          stripeSubscriptionId: 'sub_123',
          interval: 'month',
          status: 'active',
          planId: 'plan_123',
          currentPeriodStart: 1640995200,
          currentPeriodEnd: 1643673600,
          periodEndReminderSent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId: testOrgId
        }
      } as any)

      // Act
      const result = await determineUserTier(prismaMock, testOrgId)

      // Assert
      expect(result).toBe('PAID')
    })

    it('handles edge case: exactly 1 credit', async () => {
      // Arrange
      vi.mocked(prismaMock.organization.findUnique).mockResolvedValue({
        credits: 1,
        subscription: null
      } as any)

      // Act
      const result = await determineUserTier(prismaMock, testOrgId)

      // Assert
      expect(result).toBe('PAID')
    })

    it('throws error when organization not found', async () => {
      // Arrange
      vi.mocked(prismaMock.organization.findUnique).mockResolvedValue(null)

      // Act & Assert
      await expect(determineUserTier(prismaMock, testOrgId)).rejects.toThrow('Organization not found')
    })

    it('handles large credit amounts', async () => {
      // Arrange
      vi.mocked(prismaMock.organization.findUnique).mockResolvedValue({
        credits: 1000,
        subscription: { 
          stripeSubscriptionId: 'sub_123',
          interval: 'month',
          status: 'active',
          planId: 'plan_123',
          currentPeriodStart: 1640995200,
          currentPeriodEnd: 1643673600,
          periodEndReminderSent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId: testOrgId
        }
      } as any)

      // Act
      const result = await determineUserTier(prismaMock, testOrgId)

      // Assert
      expect(result).toBe('PAID')
    })
  })

  describe('Business Logic Validation', () => {
    const testOrgId = 'org_456'

    it('prioritizes credits over subscription status for tier determination', async () => {
      // Test that having credits always results in PAID tier, regardless of subscription
      const testCases = [
        { credits: 1, subscription: null, expected: 'PAID' },
        { credits: 5, subscription: createMockSubscription('active'), expected: 'PAID' },
        { credits: 10, subscription: createMockSubscription('canceled'), expected: 'PAID' },
        { credits: 100, subscription: createMockSubscription('past_due'), expected: 'PAID' },
      ]

      for (const testCase of testCases) {
        const prismaMock = createMockPrismaClient()
        vi.mocked(prismaMock.organization.findUnique).mockResolvedValue({
          credits: testCase.credits,
          subscription: testCase.subscription
        } as any)

        const result = await determineUserTier(prismaMock, testOrgId)
        expect(result).toBe(testCase.expected)
      }
    })

    it('correctly handles zero credits with different subscription states', async () => {
      const testCases = [
        { subscription: createMockSubscription('active'), expected: 'ZERO_CREDITS' },
        { subscription: createMockSubscription('canceled'), expected: 'ZERO_CREDITS' },
        { subscription: createMockSubscription('past_due'), expected: 'ZERO_CREDITS' },
        { subscription: createMockSubscription('incomplete'), expected: 'ZERO_CREDITS' },
        { subscription: null, expected: 'FREE_TIER' },
      ]

      for (const testCase of testCases) {
        const prismaMock = createMockPrismaClient()
        vi.mocked(prismaMock.organization.findUnique).mockResolvedValue({
          credits: 0,
          subscription: testCase.subscription
        } as any)

        const result = await determineUserTier(prismaMock, testOrgId)
        expect(result).toBe(testCase.expected)
      }
    })
  })
})