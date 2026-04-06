// tests/integration/onboarding-multi-tenancy.test.ts

import { describe, it, expect, afterEach } from 'vitest'
import { OrganizationService } from '@/lib/services/organization-service'
import { ROLES, LIMITS, CREDITS_FREE } from '@/lib/constants'
import { TestUtils, DatabaseHelpers, testDb } from './setup'
import { itIf, MULTI_ORG_ENABLED } from '../helpers/guards'

describe('Onboarding & Multi-Tenancy Structure', () => {
  let testUserId: string

  afterEach(async () => {
    if (testUserId) {
      await TestUtils.cleanupUser(testUserId)
    }
  })

  describe('Test 1.1: New User Default State', () => {
    it('should create a new user with a "Personal" organization and default credits', async () => {
      // Action: Create a new user (simulating signup)
      const testUser = await TestUtils.createTestUser()
      testUserId = testUser.id

      // Action: Create the default organization (this happens during onboarding)
      const organization = await OrganizationService.createOrganization(
        testUser.id,
        'Personal',
        TestUtils.generateUniqueSlug('personal')
      )

      // Verify (DB): Organization table has 1 row with correct properties
      expect(organization).toBeDefined()
      expect(organization.name).toBe('Personal')
      expect(organization.isPrimary).toBe(true)
      expect(organization.credits).toBe(CREDITS_FREE)

      // Verify (DB): User is the owner of the organization
      const membership = organization.members[0]
      expect(membership.userId).toBe(testUser.id)
      expect(membership.role).toBe(ROLES.OWNER)

      // Verify: User organizations count
      const userOrganizations = await OrganizationService.getUserOrganizations(testUser.id)
      expect(userOrganizations).toHaveLength(1)
      expect(userOrganizations[0].id).toBe(organization.id)
    })

    itIf(MULTI_ORG_ENABLED)('should prevent creating multiple primary organizations for the same user', async () => {
      const testUser = await TestUtils.createTestUser()
      testUserId = testUser.id

      // Create first organization (should be primary)
      const firstOrg = await OrganizationService.createOrganization(
        testUser.id,
        'First Org',
        TestUtils.generateUniqueSlug('first')
      )

      expect(firstOrg.isPrimary).toBe(true)
      expect(firstOrg.credits).toBe(CREDITS_FREE)

      // Create second organization (should not be primary)
      const secondOrg = await OrganizationService.createOrganization(
        testUser.id,
        'Second Org',
        TestUtils.generateUniqueSlug('second')
      )

      expect(secondOrg.isPrimary).toBe(false)
      expect(secondOrg.credits).toBe(0)
    })
  })

  describe('Test 1.2: Data Isolation', () => {
    itIf(MULTI_ORG_ENABLED)('should isolate projects between different organizations', async () => {
      const testUser = await TestUtils.createTestUser()
      testUserId = testUser.id

      // Create two organizations
      const defaultOrg = await OrganizationService.createOrganization(
        testUser.id,
        'Default Organization',
        TestUtils.generateUniqueSlug('default')
      )

      const workOrg = await OrganizationService.createOrganization(
        testUser.id,
        'Work Corp',
        TestUtils.generateUniqueSlug('work')
      )

      // Create a project in Work Corp
      await testDb.project.create({
        data: {
          name: 'Project Alpha',
          slug: 'project-alpha',
          organizationId: workOrg.id,
        },
      })

      // Verify: Project exists in Work Corp
      const workOrgProjects = await DatabaseHelpers.getProjectsByOrganization(workOrg.id)
      expect(workOrgProjects).toHaveLength(1)
      expect(workOrgProjects[0].name).toBe('Project Alpha')

      // Verify: Project does NOT exist in Default Organization
      const defaultOrgProjects = await DatabaseHelpers.getProjectsByOrganization(defaultOrg.id)
      expect(defaultOrgProjects).toHaveLength(0)

      // Verify: Projects are properly isolated by organization
      const allProjects = await testDb.project.findMany({
        where: {
          organization: {
            members: {
              some: { userId: testUser.id },
            },
          },
        },
        include: {
          organization: true,
        },
      })

      expect(allProjects).toHaveLength(1)
      expect(allProjects[0].organizationId).toBe(workOrg.id)
      expect(allProjects[0].organizationId).not.toBe(defaultOrg.id)
    })

    it('should isolate organization members and prevent cross-organization access', async () => {
      // Create two separate users
      const user1 = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('user1'))
      const user2 = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('user2'))
      testUserId = user1.id // For cleanup

      // User1 creates an organization
      const user1Org = await OrganizationService.createOrganization(
        user1.id,
        'User1 Org',
        TestUtils.generateUniqueSlug('user1-org')
      )

      // User2 creates a separate organization
      const user2Org = await OrganizationService.createOrganization(
        user2.id,
        'User2 Org',
        TestUtils.generateUniqueSlug('user2-org')
      )

      // Verify: User1 can only see their own organization
      const user1Organizations = await OrganizationService.getUserOrganizations(user1.id)
      expect(user1Organizations).toHaveLength(1)
      expect(user1Organizations[0].id).toBe(user1Org.id)

      // Verify: User2 can only see their own organization
      const user2Organizations = await OrganizationService.getUserOrganizations(user2.id)
      expect(user2Organizations).toHaveLength(1)
      expect(user2Organizations[0].id).toBe(user2Org.id)

      // Verify: User1 is not a member of User2's organization
      const user1InUser2Org = await testDb.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: user2Org.id,
            userId: user1.id,
          },
        },
      })
      expect(user1InUser2Org).toBeNull()

      // Cleanup user2
      await TestUtils.cleanupUser(user2.id)
    })

    itIf(MULTI_ORG_ENABLED)('should maintain proper organization context when switching between organizations', async () => {
      const testUser = await TestUtils.createTestUser()
      testUserId = testUser.id

      // Create multiple organizations
      const personalOrg = await OrganizationService.createOrganization(
        testUser.id,
        'Personal',
        TestUtils.generateUniqueSlug('personal')
      )

      const businessOrg = await OrganizationService.createOrganization(
        testUser.id,
        'Business',
        TestUtils.generateUniqueSlug('business')
      )

      // Create projects in each organization
      await testDb.project.create({
        data: {
          name: 'Personal Project',
          slug: 'personal-project',
          organizationId: personalOrg.id,
        },
      })

      await testDb.project.create({
        data: {
          name: 'Business Project',
          slug: 'business-project',
          organizationId: businessOrg.id,
        },
      })

      // Verify: When in Personal context, only see Personal projects
      const personalContext = await DatabaseHelpers.getProjectsByOrganization(personalOrg.id)
      expect(personalContext).toHaveLength(1)
      expect(personalContext[0].name).toBe('Personal Project')

      // Verify: When in Business context, only see Business projects
      const businessContext = await DatabaseHelpers.getProjectsByOrganization(businessOrg.id)
      expect(businessContext).toHaveLength(1)
      expect(businessContext[0].name).toBe('Business Project')

      // Verify: Projects don't leak between contexts
      expect(personalContext[0].id).not.toBe(businessContext[0].id)
      expect(personalContext[0].organizationId).not.toBe(businessContext[0].organizationId)
    })
  })

  describe('Additional Multi-Tenancy Tests', () => {
    it('should enforce organization limits per user', async () => {
      const testUser = await TestUtils.createTestUser()
      testUserId = testUser.id

      // Create organizations up to the limit
      const organizations = []
      for (let i = 0; i < LIMITS.MAX_ORGANIZATIONS_PER_USER; i++) {
        const org = await OrganizationService.createOrganization(
          testUser.id,
          `Org ${i + 1}`,
          TestUtils.generateUniqueSlug(`org-${i + 1}`)
        )
        organizations.push(org)
      }

      // Verify: All organizations created successfully
      expect(organizations).toHaveLength(LIMITS.MAX_ORGANIZATIONS_PER_USER)

      // Verify: Attempting to create one more organization should fail
      await expect(
        OrganizationService.createOrganization(
          testUser.id,
          `Org ${LIMITS.MAX_ORGANIZATIONS_PER_USER + 1}`,
          TestUtils.generateUniqueSlug(`org-${LIMITS.MAX_ORGANIZATIONS_PER_USER + 1}`)
        )
      ).rejects.toThrow(`Limit reached: You can only create up to ${LIMITS.MAX_ORGANIZATIONS_PER_USER} organizations.`)
    })

    it('should properly handle organization soft deletion', async () => {
      const testUser = await TestUtils.createTestUser()
      testUserId = testUser.id

      const organization = await OrganizationService.createOrganization(
        testUser.id,
        'To Be Deleted',
        TestUtils.generateUniqueSlug('to-delete')
      )

      // Verify: Organization exists
      let userOrgs = await OrganizationService.getUserOrganizations(testUser.id)
      expect(userOrgs).toHaveLength(1)

      // Soft delete the organization
      await OrganizationService.deleteOrganization(organization.id)

      // Verify: Organization no longer appears in user's organizations
      userOrgs = await OrganizationService.getUserOrganizations(testUser.id)
      expect(userOrgs).toHaveLength(0)

      // Verify: Organization still exists in database but with deletedAt timestamp
      const deletedOrg = await testDb.organization.findUnique({
        where: { id: organization.id },
      })
      expect(deletedOrg).toBeDefined()
      expect(deletedOrg?.deletedAt).toBeDefined()
    })
  })
})
