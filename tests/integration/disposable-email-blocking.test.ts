 
// tests/integration/disposable-email-blocking.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestUtils } from './setup'
// import { DatabaseHelpers, testDb } from './setup'
import { isDisposableEmail } from '@/lib/email-validator'
import { validateEmail } from '@/app/actions/auth-check'
import { InvitationService } from '@/lib/services/invitation-service'
import { OrganizationService } from '@/lib/services/organization-service'
import { ROLES } from '@/lib/constants'
import { itIf, MULTI_ORG_ENABLED } from '../helpers/guards'

describe('Disposable Email Blocking', () => {
  
  let testUser: any
  let testOrg: any

  beforeEach(async () => {
    // Create test user and organization
    testUser = await TestUtils.createTestUser()
    testOrg = await OrganizationService.createOrganization(
      testUser.id,
      'Test Organization',
      TestUtils.generateUniqueSlug('test-org')
    )
  })

  afterEach(async () => {
    if (testUser) {
      await TestUtils.cleanupUser(testUser.id)
    }
  })

  describe('Test 5.1: Client-Side Blocking (Sign Up)', () => {
    it('should detect disposable emails correctly', () => {
      // Test known disposable domains from the JSON file
      expect(isDisposableEmail('test@mailinator.com')).toBe(true)
      expect(isDisposableEmail('user@guerrillamail.com')).toBe(true)
      expect(isDisposableEmail('spam@10minutemail.com')).toBe(true)
      expect(isDisposableEmail('temp@temp-mail.org')).toBe(true)
      expect(isDisposableEmail('fake@yopmail.com')).toBe(true)
    })

    it('should allow legitimate emails', () => {
      // Test legitimate email domains
      expect(isDisposableEmail('user@gmail.com')).toBe(false)
      expect(isDisposableEmail('user@outlook.com')).toBe(false)
      expect(isDisposableEmail('user@yahoo.com')).toBe(false)
      expect(isDisposableEmail('user@company.com')).toBe(false)
      expect(isDisposableEmail('user@example.com')).toBe(false)
    })

    it('should handle edge cases correctly', () => {
      // Test edge cases
      expect(isDisposableEmail('')).toBe(false)
      expect(isDisposableEmail('invalid-email')).toBe(false)
      expect(isDisposableEmail('user@')).toBe(false)
      expect(isDisposableEmail('@domain.com')).toBe(false)
      expect(isDisposableEmail('user@MAILINATOR.COM')).toBe(true) // Case insensitive
      expect(isDisposableEmail('  user@mailinator.com  ')).toBe(true) // Whitespace handling
    })

    it('should validate emails through server action', async () => {
      // Test disposable email validation through server action
      const disposableResult = await validateEmail('test@mailinator.com')
      expect(disposableResult.valid).toBe(false)
      expect(disposableResult.message).toContain('permanent email address')

      // Test legitimate email validation
      const legitimateResult = await validateEmail('user@gmail.com')
      expect(legitimateResult.valid).toBe(true)
      expect(legitimateResult.message).toBeUndefined()
    })
  })

  describe('Test 5.2: Server-Side Blocking (Invites)', () => {
    it('should block disposable emails in invitation system', async () => {
      // Test that disposable emails are blocked when creating invites
      await expect(
        InvitationService.createInvite(
          testUser.id,
          testOrg.id,
          'spam@guerrillamail.com',
          ROLES.MEMBER
        )
      ).rejects.toThrow('Disposable emails cannot be invited')

      // Verify no invite was created
      const invites = await InvitationService.getOrganizationInvites(testOrg.id)
      expect(invites).toHaveLength(0)
    })

    it('should block various disposable email domains', async () => {
      const disposableDomains = [
        'mailinator.com',
        'guerrillamail.com',
        '10minutemail.com',
        'temp-mail.org',
        'yopmail.com',
        'throwawaymail.com',
        'gettempmail.com'
      ]

      for (const domain of disposableDomains) {
        const email = `test@${domain}`
        await expect(
          InvitationService.createInvite(
            testUser.id,
            testOrg.id,
            email,
            ROLES.MEMBER
          )
        ).rejects.toThrow('Disposable emails cannot be invited')
      }

      // Verify no invites were created
      const invites = await InvitationService.getOrganizationInvites(testOrg.id)
      expect(invites).toHaveLength(0)
    })

    it('should allow legitimate emails in invitation system', async () => {
      const legitimateEmails = [
        'user@gmail.com',
        'member@outlook.com',
        'admin@yahoo.com'
      ]

      for (const email of legitimateEmails) {
        const invite = await InvitationService.createInvite(
          testUser.id,
          testOrg.id,
          email,
          ROLES.MEMBER
        )
        expect(invite.email).toBe(email)
        expect(invite.status).toBe('PENDING')
      }

      // Verify all invites were created
      const invites = await InvitationService.getOrganizationInvites(testOrg.id)
      expect(invites).toHaveLength(legitimateEmails.length)
    })

    it('should handle case-insensitive disposable email detection', async () => {
      // Test various case combinations
      const caseVariations = [
        'test@MAILINATOR.COM',
        'test@Mailinator.com',
        'test@mailinator.COM',
        'test@GUERRILLAMAIL.COM',
        'test@GuerRillaMail.com'
      ]

      for (const email of caseVariations) {
        await expect(
          InvitationService.createInvite(
            testUser.id,
            testOrg.id,
            email,
            ROLES.MEMBER
          )
        ).rejects.toThrow('Disposable emails cannot be invited')
      }

      // Verify no invites were created
      const invites = await InvitationService.getOrganizationInvites(testOrg.id)
      expect(invites).toHaveLength(0)
    })

    it('should provide appropriate error message for disposable emails', async () => {
      try {
        await InvitationService.createInvite(
          testUser.id,
          testOrg.id,
          'spam@mailinator.com',
          ROLES.ADMIN
        )
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        if (error instanceof Error) {
          expect(error.message).toContain('Disposable emails cannot be invited to organizations')
          expect(error.message).toContain('permanent email address')
        }
      }
    })

    it('should block disposable emails regardless of role', async () => {
      const roles = [ROLES.MEMBER, ROLES.ADMIN]
      
      for (const role of roles) {
        await expect(
          InvitationService.createInvite(
            testUser.id,
            testOrg.id,
            'test@10minutemail.com',
            role
          )
        ).rejects.toThrow('Disposable emails cannot be invited')
      }

      // Verify no invites were created
      const invites = await InvitationService.getOrganizationInvites(testOrg.id)
      expect(invites).toHaveLength(0)
    })

    it('should validate email before other business logic', async () => {
      // Create an organization at the member limit
      const memberEmails = []
      for (let i = 0; i < 3; i++) { // Use the actual limit (3)
        const email = TestUtils.generateUniqueEmail('member')
        memberEmails.push(email)
        await InvitationService.createInvite(
          testUser.id,
          testOrg.id,
          email,
          ROLES.MEMBER
        )
      }

      // Try to invite a disposable email - should fail with disposable email error, not member limit error
      await expect(
        InvitationService.createInvite(
          testUser.id,
          testOrg.id,
          'test@mailinator.com',
          ROLES.MEMBER
        )
      ).rejects.toThrow('Disposable emails cannot be invited')
    })
  })

  describe('Test 5.3: Integration with Business Logic', () => {
    it('should work correctly with invite management operations', async () => {
      // Create a legitimate invite first
      const legitimateInvite = await InvitationService.createInvite(
        testUser.id,
        testOrg.id,
        'user@gmail.com',
        ROLES.MEMBER
      )

      // Verify we can manage legitimate invites
      const invites = await InvitationService.getOrganizationInvites(testOrg.id)
      expect(invites).toHaveLength(1)

      // Revoke the legitimate invite
      await InvitationService.revokeInvite(legitimateInvite.id)

      // Now try to create a disposable email invite - should still be blocked
      await expect(
        InvitationService.createInvite(
          testUser.id,
          testOrg.id,
          'spam@temp-mail.org',
          ROLES.MEMBER
        )
      ).rejects.toThrow('Disposable emails cannot be invited')
    })

    itIf(MULTI_ORG_ENABLED)('should maintain disposable email blocking across different organizations', async () => {
      // Create another organization
      const secondOrg = await OrganizationService.createOrganization(
        testUser.id,
        'Second Organization',
        TestUtils.generateUniqueSlug('second-org')
      )

      // Try to invite disposable email to both organizations
      await expect(
        InvitationService.createInvite(
          testUser.id,
          testOrg.id,
          'test@yopmail.com',
          ROLES.MEMBER
        )
      ).rejects.toThrow('Disposable emails cannot be invited')

      await expect(
        InvitationService.createInvite(
          testUser.id,
          secondOrg.id,
          'test@yopmail.com',
          ROLES.MEMBER
        )
      ).rejects.toThrow('Disposable emails cannot be invited')

      // Verify no invites were created in either organization
      const firstOrgInvites = await InvitationService.getOrganizationInvites(testOrg.id)
      const secondOrgInvites = await InvitationService.getOrganizationInvites(secondOrg.id)
      
      expect(firstOrgInvites).toHaveLength(0)
      expect(secondOrgInvites).toHaveLength(0)
    })
  })
})
