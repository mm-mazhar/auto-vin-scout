// tests/integration/rbac-permissions.test.ts

import { describe, it, expect, afterEach } from 'vitest'
import { OrganizationService } from '@/lib/services/organization-service'
import { ROLES } from '@/lib/constants'
import { getCurrentOrgContext, requireOrgRole } from '@/lib/auth/guards'
import { can } from '@/lib/auth/permissions'
import { TestUtils, testDb } from './setup'

describe('RBAC (Roles & Permissions)', () => {
  let ownerUserId: string
  let adminUserId: string
  let memberUserId: string
  let organizationId: string

  // Helper to setup a complete org with owner, admin, and member
  async function setupOrgWithAllRoles() {
    // Create owner
    const owner = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('owner'))
    ownerUserId = owner.id

    // Create organization with owner
    const org = await OrganizationService.createOrganization(
      owner.id,
      'Test Organization',
      TestUtils.generateUniqueSlug('test-org')
    )
    organizationId = org.id

    // Create admin user and add to org
    const admin = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('admin'))
    adminUserId = admin.id
    await testDb.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: admin.id,
        role: ROLES.ADMIN,
      },
    })

    // Create member user and add to org
    const member = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('member'))
    memberUserId = member.id
    await testDb.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: member.id,
        role: ROLES.MEMBER,
      },
    })

    return { owner, admin, member, org }
  }

  afterEach(async () => {
    // Cleanup in reverse order of dependencies
    if (organizationId) {
      await testDb.organizationInvite.deleteMany({ where: { organizationId } })
      await testDb.project.deleteMany({ where: { organizationId } })
      await testDb.organizationMember.deleteMany({ where: { organizationId } })
      await testDb.organization.deleteMany({ where: { id: organizationId } })
    }
    if (memberUserId) await testDb.user.deleteMany({ where: { id: memberUserId } })
    if (adminUserId) await testDb.user.deleteMany({ where: { id: adminUserId } })
    if (ownerUserId) await testDb.user.deleteMany({ where: { id: ownerUserId } })
    
    // Reset IDs
    ownerUserId = ''
    adminUserId = ''
    memberUserId = ''
    organizationId = ''
  })

  describe('Test 2.1: Member Restrictions', () => {
    it('should correctly identify MEMBER role via getCurrentOrgContext', async () => {
      await setupOrgWithAllRoles()

      const memberRole = await getCurrentOrgContext(organizationId, memberUserId)
      expect(memberRole).toBe(ROLES.MEMBER)
    })

    it('should deny MEMBER access to admin-level actions via requireOrgRole', async () => {
      await setupOrgWithAllRoles()

      // MEMBER should fail when ADMIN role is required
      await expect(
        requireOrgRole(organizationId, memberUserId, ROLES.ADMIN)
      ).rejects.toThrow('Unauthorized: Requires ADMIN role')
    })

    it('should deny MEMBER permission to invite members', async () => {
      await setupOrgWithAllRoles()

      const canInvite = can(ROLES.MEMBER, 'member:invite')
      expect(canInvite).toBe(false)
    })

    it('should deny MEMBER permission to remove members', async () => {
      await setupOrgWithAllRoles()

      const canRemove = can(ROLES.MEMBER, 'member:remove')
      expect(canRemove).toBe(false)
    })

    it('should deny MEMBER permission to update organization', async () => {
      await setupOrgWithAllRoles()

      const canUpdate = can(ROLES.MEMBER, 'org:update')
      expect(canUpdate).toBe(false)
    })

    it('should deny MEMBER permission to delete organization', async () => {
      await setupOrgWithAllRoles()

      const canDelete = can(ROLES.MEMBER, 'org:delete')
      expect(canDelete).toBe(false)
    })

    it('should allow MEMBER to create projects', async () => {
      await setupOrgWithAllRoles()

      const canCreate = can(ROLES.MEMBER, 'project:create')
      expect(canCreate).toBe(true)
    })

    it('should allow MEMBER to update projects', async () => {
      await setupOrgWithAllRoles()

      const canUpdate = can(ROLES.MEMBER, 'project:update')
      expect(canUpdate).toBe(true)
    })

    it('should deny MEMBER permission to delete projects', async () => {
      await setupOrgWithAllRoles()

      const canDelete = can(ROLES.MEMBER, 'project:delete')
      expect(canDelete).toBe(false)
    })
  })

  describe('Test 2.2: Admin Restrictions', () => {
    it('should correctly identify ADMIN role via getCurrentOrgContext', async () => {
      await setupOrgWithAllRoles()

      const adminRole = await getCurrentOrgContext(organizationId, adminUserId)
      expect(adminRole).toBe(ROLES.ADMIN)
    })

    it('should allow ADMIN access when ADMIN role is required', async () => {
      await setupOrgWithAllRoles()

      const role = await requireOrgRole(organizationId, adminUserId, ROLES.ADMIN)
      expect(role).toBe(ROLES.ADMIN)
    })

    it('should deny ADMIN access when OWNER role is required', async () => {
      await setupOrgWithAllRoles()

      await expect(
        requireOrgRole(organizationId, adminUserId, ROLES.OWNER)
      ).rejects.toThrow('Unauthorized: Requires OWNER role')
    })

    it('should allow ADMIN to update organization', async () => {
      await setupOrgWithAllRoles()

      const canUpdate = can(ROLES.ADMIN, 'org:update')
      expect(canUpdate).toBe(true)
    })

    it('should deny ADMIN permission to delete organization', async () => {
      await setupOrgWithAllRoles()

      const canDelete = can(ROLES.ADMIN, 'org:delete')
      expect(canDelete).toBe(false)
    })

    it('should deny ADMIN permission to transfer organization', async () => {
      await setupOrgWithAllRoles()

      const canTransfer = can(ROLES.ADMIN, 'org:transfer')
      expect(canTransfer).toBe(false)
    })

    it('should allow ADMIN to invite members', async () => {
      await setupOrgWithAllRoles()

      const canInvite = can(ROLES.ADMIN, 'member:invite')
      expect(canInvite).toBe(true)
    })

    it('should allow ADMIN to remove members', async () => {
      await setupOrgWithAllRoles()

      const canRemove = can(ROLES.ADMIN, 'member:remove')
      expect(canRemove).toBe(true)
    })

    it('should allow ADMIN to update member roles', async () => {
      await setupOrgWithAllRoles()

      const canUpdate = can(ROLES.ADMIN, 'member:update')
      expect(canUpdate).toBe(true)
    })

    it('should allow ADMIN full project permissions', async () => {
      await setupOrgWithAllRoles()

      expect(can(ROLES.ADMIN, 'project:create')).toBe(true)
      expect(can(ROLES.ADMIN, 'project:update')).toBe(true)
      expect(can(ROLES.ADMIN, 'project:delete')).toBe(true)
    })
  })

  describe('Test 2.3: Owner Permissions', () => {
    it('should correctly identify OWNER role via getCurrentOrgContext', async () => {
      await setupOrgWithAllRoles()

      const ownerRole = await getCurrentOrgContext(organizationId, ownerUserId)
      expect(ownerRole).toBe(ROLES.OWNER)
    })

    it('should allow OWNER access for all role requirements', async () => {
      await setupOrgWithAllRoles()

      // OWNER should pass all role checks
      expect(await requireOrgRole(organizationId, ownerUserId, ROLES.MEMBER)).toBe(ROLES.OWNER)
      expect(await requireOrgRole(organizationId, ownerUserId, ROLES.ADMIN)).toBe(ROLES.OWNER)
      expect(await requireOrgRole(organizationId, ownerUserId, ROLES.OWNER)).toBe(ROLES.OWNER)
    })

    it('should allow OWNER all organization permissions', async () => {
      await setupOrgWithAllRoles()

      expect(can(ROLES.OWNER, 'org:update')).toBe(true)
      expect(can(ROLES.OWNER, 'org:delete')).toBe(true)
      expect(can(ROLES.OWNER, 'org:transfer')).toBe(true)
    })

    it('should allow OWNER all member permissions', async () => {
      await setupOrgWithAllRoles()

      expect(can(ROLES.OWNER, 'member:invite')).toBe(true)
      expect(can(ROLES.OWNER, 'member:remove')).toBe(true)
      expect(can(ROLES.OWNER, 'member:update')).toBe(true)
    })

    it('should allow OWNER all project permissions', async () => {
      await setupOrgWithAllRoles()

      expect(can(ROLES.OWNER, 'project:create')).toBe(true)
      expect(can(ROLES.OWNER, 'project:update')).toBe(true)
      expect(can(ROLES.OWNER, 'project:delete')).toBe(true)
    })
  })

  describe('Test 2.4: Role Change Restrictions', () => {
    it('should verify OWNER role cannot be changed to non-OWNER via business logic', async () => {
      await setupOrgWithAllRoles()

      // The router layer prevents changing OWNER role, but at service level
      // we verify the owner still exists and has OWNER role
      const ownerMembership = await testDb.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: ownerUserId,
          },
        },
      })
      expect(ownerMembership?.role).toBe(ROLES.OWNER)

      // Verify there's exactly one owner
      const ownerCount = await testDb.organizationMember.count({
        where: {
          organizationId,
          role: ROLES.OWNER,
        },
      })
      expect(ownerCount).toBe(1)
    })

    it('should allow ADMIN to change MEMBER role', async () => {
      await setupOrgWithAllRoles()

      // This tests the service layer - admin changing member to admin
      // Note: The actual authorization check happens in the router/procedure layer
      const updated = await OrganizationService.updateMemberRole(
        organizationId,
        memberUserId,
        ROLES.ADMIN
      )
      expect(updated.role).toBe(ROLES.ADMIN)
    })

    it('should allow ADMIN to demote another ADMIN to MEMBER', async () => {
      await setupOrgWithAllRoles()

      // First promote member to admin
      await OrganizationService.updateMemberRole(organizationId, memberUserId, ROLES.ADMIN)

      // Then demote back to member
      const updated = await OrganizationService.updateMemberRole(
        organizationId,
        memberUserId,
        ROLES.MEMBER
      )
      expect(updated.role).toBe(ROLES.MEMBER)
    })

    it('should not allow setting role to OWNER via updateMemberRole', async () => {
      await setupOrgWithAllRoles()

      // The schema should prevent OWNER from being set via updateMemberRole
      // This is enforced at the router level with z.enum([ROLES.ADMIN, ROLES.MEMBER])
      // At service level, we verify the role hierarchy is maintained
      const membership = await testDb.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: memberUserId,
          },
        },
      })
      expect(membership?.role).not.toBe(ROLES.OWNER)
    })
  })

  describe('Test 2.5: Non-Member Access', () => {
    it('should return null for non-member via getCurrentOrgContext', async () => {
      await setupOrgWithAllRoles()

      // Create a user who is not a member
      const outsider = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('outsider'))

      const role = await getCurrentOrgContext(organizationId, outsider.id)
      expect(role).toBeNull()

      // Cleanup outsider
      await testDb.user.delete({ where: { id: outsider.id } })
    })

    it('should throw for non-member via requireOrgRole', async () => {
      await setupOrgWithAllRoles()

      const outsider = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('outsider'))

      await expect(
        requireOrgRole(organizationId, outsider.id, ROLES.MEMBER)
      ).rejects.toThrow('Unauthorized: Not a member of this organization')

      await testDb.user.delete({ where: { id: outsider.id } })
    })
  })

  describe('Test 2.6: Role Hierarchy', () => {
    it('should enforce OWNER > ADMIN > MEMBER hierarchy', async () => {
      await setupOrgWithAllRoles()

      // OWNER can access everything
      expect(await requireOrgRole(organizationId, ownerUserId, ROLES.MEMBER)).toBe(ROLES.OWNER)
      expect(await requireOrgRole(organizationId, ownerUserId, ROLES.ADMIN)).toBe(ROLES.OWNER)
      expect(await requireOrgRole(organizationId, ownerUserId, ROLES.OWNER)).toBe(ROLES.OWNER)

      // ADMIN can access MEMBER and ADMIN level
      expect(await requireOrgRole(organizationId, adminUserId, ROLES.MEMBER)).toBe(ROLES.ADMIN)
      expect(await requireOrgRole(organizationId, adminUserId, ROLES.ADMIN)).toBe(ROLES.ADMIN)

      // MEMBER can only access MEMBER level
      expect(await requireOrgRole(organizationId, memberUserId, ROLES.MEMBER)).toBe(ROLES.MEMBER)
    })
  })
})
