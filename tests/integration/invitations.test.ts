// tests/integration/invitations.test.ts

import { describe, it, expect, afterEach } from 'vitest'
import { OrganizationService } from '@/lib/services/organization-service'
import { InvitationService } from '@/lib/services/invitation-service'
import { ROLES, LIMITS } from '@/lib/constants'
import { TestUtils, testDb } from './setup'

describe('Organization Invitations', () => {
  let ownerUserId: string
  let organizationId: string
  const createdUserIds: string[] = []

  async function setupOrganization() {
    const owner = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('owner'))
    ownerUserId = owner.id
    createdUserIds.push(owner.id)

    const org = await OrganizationService.createOrganization(
      owner.id,
      'Test Organization',
      TestUtils.generateUniqueSlug('test-org')
    )
    organizationId = org.id

    return { owner, org }
  }

  afterEach(async () => {
    // Cleanup invites first
    if (organizationId) {
      await testDb.organizationInvite.deleteMany({ where: { organizationId } })
      await testDb.project.deleteMany({ where: { organizationId } })
      await testDb.organizationMember.deleteMany({ where: { organizationId } })
      await testDb.organization.deleteMany({ where: { id: organizationId } })
    }
    
    // Cleanup users
    for (const userId of createdUserIds) {
      await testDb.user.deleteMany({ where: { id: userId } })
    }
    
    // Reset
    ownerUserId = ''
    organizationId = ''
    createdUserIds.length = 0
  })

  describe('Test 3.1: Invite Creation', () => {
    it('should create a pending invite with correct properties', async () => {
      await setupOrganization()

      const inviteEmail = TestUtils.generateUniqueEmail('invitee')
      const invite = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        inviteEmail,
        ROLES.MEMBER
      )

      expect(invite).toBeDefined()
      expect(invite.email).toBe(inviteEmail)
      expect(invite.organizationId).toBe(organizationId)
      expect(invite.inviterId).toBe(ownerUserId)
      expect(invite.role).toBe(ROLES.MEMBER)
      expect(invite.status).toBe('PENDING')
      expect(invite.token).toBeDefined()
      expect(invite.expiresAt).toBeDefined()
      expect(new Date(invite.expiresAt).getTime()).toBeGreaterThan(Date.now())
    })

    it('should create invite with ADMIN role when specified', async () => {
      await setupOrganization()

      const inviteEmail = TestUtils.generateUniqueEmail('admin-invitee')
      const invite = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        inviteEmail,
        ROLES.ADMIN
      )

      expect(invite.role).toBe(ROLES.ADMIN)
    })

    it('should generate unique tokens for each invite', async () => {
      await setupOrganization()

      const invite1 = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        TestUtils.generateUniqueEmail('invitee1'),
        ROLES.MEMBER
      )

      const invite2 = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        TestUtils.generateUniqueEmail('invitee2'),
        ROLES.MEMBER
      )

      expect(invite1.token).not.toBe(invite2.token)
    })

    it('should generate valid invite link', async () => {
      await setupOrganization()

      const invite = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        TestUtils.generateUniqueEmail('invitee'),
        ROLES.MEMBER
      )

      const inviteLink = InvitationService.getInviteLink(invite.token)
      expect(inviteLink).toContain('/invite/')
      expect(inviteLink).toContain(invite.token)
    })
  })

  describe('Test 3.2: Invite Limits', () => {
    it('should enforce pending invite limit per organization', async () => {
      await setupOrganization()

      // Create invites up to the limit
      for (let i = 0; i < LIMITS.MAX_PENDING_INVITES_PER_ORG; i++) {
        await InvitationService.createInvite(
          ownerUserId,
          organizationId,
          TestUtils.generateUniqueEmail(`invitee-${i}`),
          ROLES.MEMBER
        )
      }

      // Verify limit is reached
      const pendingCount = await testDb.organizationInvite.count({
        where: {
          organizationId,
          status: 'PENDING',
        },
      })
      expect(pendingCount).toBe(LIMITS.MAX_PENDING_INVITES_PER_ORG)

      // Attempt to create one more should fail
      await expect(
        InvitationService.createInvite(
          ownerUserId,
          organizationId,
          TestUtils.generateUniqueEmail('over-limit'),
          ROLES.MEMBER
        )
      ).rejects.toThrow(`Limit reached: Organization can only have ${LIMITS.MAX_PENDING_INVITES_PER_ORG} pending invites.`)
    })

    it('should allow new invites after revoking existing ones', async () => {
      await setupOrganization()

      // Create invites up to the limit
      const invites = []
      for (let i = 0; i < LIMITS.MAX_PENDING_INVITES_PER_ORG; i++) {
        const invite = await InvitationService.createInvite(
          ownerUserId,
          organizationId,
          TestUtils.generateUniqueEmail(`invitee-${i}`),
          ROLES.MEMBER
        )
        invites.push(invite)
      }

      // Revoke one invite
      await InvitationService.revokeInvite(invites[0].id)

      // Should now be able to create a new invite
      const newInvite = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        TestUtils.generateUniqueEmail('new-invitee'),
        ROLES.MEMBER
      )
      expect(newInvite).toBeDefined()
      expect(newInvite.status).toBe('PENDING')
    })
  })

  describe('Test 3.3: Invite Acceptance', () => {
    it('should accept invite and add user as member with correct role', async () => {
      await setupOrganization()

      // Create a new user to accept the invite
      const inviteeEmail = TestUtils.generateUniqueEmail('invitee')
      const invitee = await TestUtils.createTestUser(inviteeEmail)
      createdUserIds.push(invitee.id)

      // Create invite for this user
      const invite = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        inviteeEmail,
        ROLES.ADMIN
      )

      // Accept the invite
      const membership = await InvitationService.acceptInvite(invite.token, invitee.id)

      expect(membership).toBeDefined()
      expect(membership.organizationId).toBe(organizationId)
      expect(membership.userId).toBe(invitee.id)
      expect(membership.role).toBe(ROLES.ADMIN)

      // Verify invite status is updated
      const updatedInvite = await testDb.organizationInvite.findUnique({
        where: { id: invite.id },
      })
      expect(updatedInvite?.status).toBe('ACCEPTED')
    })

    it('should reject invite acceptance for wrong user', async () => {
      await setupOrganization()

      // Create invite for one email
      const invite = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        TestUtils.generateUniqueEmail('intended-user'),
        ROLES.MEMBER
      )

      // Create a different user trying to accept
      const wrongUser = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('wrong-user'))
      createdUserIds.push(wrongUser.id)

      await expect(
        InvitationService.acceptInvite(invite.token, wrongUser.id)
      ).rejects.toThrow('Invite does not belong to the current user.')
    })

    it('should reject invalid invite token', async () => {
      await setupOrganization()

      const user = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('user'))
      createdUserIds.push(user.id)

      await expect(
        InvitationService.acceptInvite('invalid-token-12345', user.id)
      ).rejects.toThrow('Invalid invite token.')
    })

    it('should reject already accepted invite', async () => {
      await setupOrganization()

      const inviteeEmail = TestUtils.generateUniqueEmail('invitee')
      const invitee = await TestUtils.createTestUser(inviteeEmail)
      createdUserIds.push(invitee.id)

      const invite = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        inviteeEmail,
        ROLES.MEMBER
      )

      // Accept once
      await InvitationService.acceptInvite(invite.token, invitee.id)

      // Try to accept again - should reject since invite is no longer PENDING
      await expect(
        InvitationService.acceptInvite(invite.token, invitee.id)
      ).rejects.toThrow('Invite is no longer valid.')
    })

    it('should reject revoked invite', async () => {
      await setupOrganization()

      const inviteeEmail = TestUtils.generateUniqueEmail('invitee')
      const invitee = await TestUtils.createTestUser(inviteeEmail)
      createdUserIds.push(invitee.id)

      const invite = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        inviteeEmail,
        ROLES.MEMBER
      )

      // Revoke the invite
      await InvitationService.revokeInvite(invite.id)

      // Try to accept
      await expect(
        InvitationService.acceptInvite(invite.token, invitee.id)
      ).rejects.toThrow('Invite is no longer valid.')
    })
  })

  describe('Test 3.4: Existing Member Check', () => {
    it('should prevent inviting existing members', async () => {
      await setupOrganization()

      // Add a member to the organization
      const memberEmail = TestUtils.generateUniqueEmail('existing-member')
      const member = await TestUtils.createTestUser(memberEmail)
      createdUserIds.push(member.id)

      await testDb.organizationMember.create({
        data: {
          organizationId,
          userId: member.id,
          role: ROLES.MEMBER,
        },
      })

      // Try to invite the same email
      await expect(
        InvitationService.createInvite(
          ownerUserId,
          organizationId,
          memberEmail,
          ROLES.MEMBER
        )
      ).rejects.toThrow('User is already a member of this organization.')
    })
  })

  describe('Test 3.5: Invite Management', () => {
    it('should list all organization invites', async () => {
      await setupOrganization()

      // Create multiple invites
      await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        TestUtils.generateUniqueEmail('invitee1'),
        ROLES.MEMBER
      )
      await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        TestUtils.generateUniqueEmail('invitee2'),
        ROLES.ADMIN
      )

      const invites = await InvitationService.getOrganizationInvites(organizationId)
      expect(invites).toHaveLength(2)
    })

    it('should revoke an invite', async () => {
      await setupOrganization()

      const invite = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        TestUtils.generateUniqueEmail('invitee'),
        ROLES.MEMBER
      )

      const revoked = await InvitationService.revokeInvite(invite.id)
      expect(revoked.status).toBe('REVOKED')
    })

    it('should delete an invite permanently', async () => {
      await setupOrganization()

      const invite = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        TestUtils.generateUniqueEmail('invitee'),
        ROLES.MEMBER
      )

      await InvitationService.deleteInvite(invite.id)

      const deleted = await testDb.organizationInvite.findUnique({
        where: { id: invite.id },
      })
      expect(deleted).toBeNull()
    })

    it('should reinvite with new token and expiry', async () => {
      await setupOrganization()

      const invite = await InvitationService.createInvite(
        ownerUserId,
        organizationId,
        TestUtils.generateUniqueEmail('invitee'),
        ROLES.MEMBER
      )

      const originalToken = invite.token
      const originalExpiry = invite.expiresAt

      // Wait a tiny bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10))

      const reinvited = await InvitationService.reinvite(invite.id)

      expect(reinvited.token).not.toBe(originalToken)
      expect(new Date(reinvited.expiresAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalExpiry).getTime()
      )
      expect(reinvited.status).toBe('PENDING')
    })
  })
})
