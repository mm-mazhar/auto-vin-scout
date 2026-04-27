// tests/integration/setup.ts
// Load environment variables first

import './env-setup'
import { beforeAll, afterAll } from 'vitest'
import prisma from '@/app/lib/db'

// Export the existing prisma instance for tests
export const testDb = prisma

// Global setup and teardown
beforeAll(async () => {
  // Ensure database connection is established
  await testDb.$connect()
})

afterAll(async () => {
  // Clean up and disconnect
  await testDb.$disconnect()
})

// Test utilities
export class TestUtils {
  static async createTestUser(email?: string, name?: string) {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    return await testDb.user.create({
      data: {
        id: `test-user-${uniqueId}`,
        email: email || `test-${uniqueId}@example.com`,
        name: name || 'Test User',
      },
    })
  }

  static async cleanupUser(userId: string) {
    // 1. Find all orgs this user belongs to
    const userOrganizations = await testDb.organization.findMany({
      where: { members: { some: { userId } } },
      select: { id: true },
    })

    const orgIds = userOrganizations.map((o) => o.id)

    // 2. Delete all org-scoped data in parallel (no FK deps between these)
    await Promise.all([
      testDb.organizationInvite.deleteMany({
        where: { OR: [{ inviterId: userId }, { organizationId: { in: orgIds } }] },
      }),
      testDb.project.deleteMany({ where: { organizationId: { in: orgIds } } }),
      testDb.report.deleteMany({ where: { organizationId: { in: orgIds } } }),
    ])

    // 3. Members must go before orgs (FK constraint)
    await testDb.organizationMember.deleteMany({ where: { userId } })

    // 4. Delete orgs
    if (orgIds.length > 0) {
      await testDb.organization.deleteMany({ where: { id: { in: orgIds } } })
    }

    // 5. Delete user
    await testDb.user.delete({ where: { id: userId } })
  }

  static async cleanupOrganization(organizationId: string) {
    // Delete projects first
    await testDb.project.deleteMany({
      where: { organizationId },
    })

    // Delete invites
    await testDb.organizationInvite.deleteMany({
      where: { organizationId },
    })

    // Delete memberships
    await testDb.organizationMember.deleteMany({
      where: { organizationId },
    })

    // Delete organization
    await testDb.organization.delete({
      where: { id: organizationId },
    })
  }

  static generateUniqueSlug(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  }

  static generateUniqueEmail(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}@example.com`
  }
}

// Database state helpers
export class DatabaseHelpers {
  static async getOrganizationWithMembers(organizationId: string) {
    return await testDb.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        projects: true,
      },
    })
  }

  static async getUserWithOrganizations(userId: string) {
    return await testDb.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    })
  }

  static async getProjectsByOrganization(organizationId: string) {
    return await testDb.project.findMany({
      where: { organizationId },
      include: {
        organization: true,
      },
    })
  }

  static async countUserOrganizations(userId: string) {
    return await testDb.organizationMember.count({
      where: {
        userId,
        organization: {
          deletedAt: null,
        },
      },
    })
  }

  static async countOrganizationProjects(organizationId: string) {
    return await testDb.project.count({
      where: { organizationId },
    })
  }
}