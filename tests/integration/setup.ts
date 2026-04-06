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
    // Clean up in proper order to respect foreign key constraints
    
    // 1. Delete organization invites
    await testDb.organizationInvite.deleteMany({
      where: { inviterId: userId },
    })

    // 2. Delete organization memberships
    await testDb.organizationMember.deleteMany({
      where: { userId },
    })

    // 3. Delete projects from organizations owned by this user
    const userOrganizations = await testDb.organization.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      select: { id: true },
    })

    for (const org of userOrganizations) {
      await testDb.project.deleteMany({
        where: { organizationId: org.id },
      })
    }

    // 4. Delete organizations
    await testDb.organization.deleteMany({
      where: {
        members: {
          some: { userId },
        },
      },
    })

    // 5. Finally delete the user
    await testDb.user.delete({
      where: { id: userId },
    })
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