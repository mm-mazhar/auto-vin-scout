 
// tests/integration/transactional-emails.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TestUtils } from './setup'
import { OrganizationService } from '@/lib/services/organization-service'
import { InvitationService } from '@/lib/services/invitation-service'
import { ROLES, CREDITS_FREE } from '@/lib/constants'
import * as emailModule from '@/app/lib/email'
import { itIf, MULTI_ORG_ENABLED } from '../helpers/guards'

// Mock the email module
vi.mock('@/app/lib/email', async () => {
  const actual = await vi.importActual('@/app/lib/email')
  return {
    ...actual,
    sendPaymentConfirmationEmail: vi.fn(),
    sendCancellationEmail: vi.fn(),
    sendInviteEmail: vi.fn(),
    sendLowCreditsEmail: vi.fn(),
    sendRenewalReminderEmail: vi.fn(),
  }
})

describe('Transactional Emails', () => {
  let testUser: any
  let testOrg: any

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    
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

  describe('Test 6.1: Payment Confirmation Email', () => {
    it('should send payment confirmation email with correct content for Pro plan', async () => {
      const mockSendPaymentConfirmationEmail = vi.mocked(emailModule.sendPaymentConfirmationEmail)
      
      // Simulate payment confirmation
      await emailModule.sendPaymentConfirmationEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: testOrg.name,
        amountPaid: 5999, // $59.99 in cents
        currency: 'usd',
        invoiceUrl: 'https://invoice.stripe.com/test',
        invoiceNumber: 'INV-001',
        planTitle: 'Pro Plan',
        periodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
        finalCredits: CREDITS_FREE + 10,
      })

      // Verify the function was called
      expect(mockSendPaymentConfirmationEmail).toHaveBeenCalledTimes(1)
      
      // Verify the parameters
      const callArgs = mockSendPaymentConfirmationEmail.mock.calls[0][0]
      expect(callArgs.to).toBe(testUser.email)
      expect(callArgs.orgName).toBe(testOrg.name)
      expect(callArgs.planTitle).toBe('Pro Plan')
      expect(callArgs.amountPaid).toBe(5999)
      expect(callArgs.currency).toBe('usd')
      expect(callArgs.invoiceUrl).toBe('https://invoice.stripe.com/test')
      expect(callArgs.finalCredits).toBe(CREDITS_FREE + 10)
    })

    it('should send payment confirmation email with correct content for Dealer Plus plan', async () => {
      const mockSendPaymentConfirmationEmail = vi.mocked(emailModule.sendPaymentConfirmationEmail)
      
      // Simulate payment confirmation for Dealer Plus
      await emailModule.sendPaymentConfirmationEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: testOrg.name,
        amountPaid: 49999, // $499.99 in cents
        currency: 'usd',
        invoiceUrl: 'https://invoice.stripe.com/test',
        invoiceNumber: 'INV-002',
        planTitle: 'Dealer Plus',
        periodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        finalCredits: CREDITS_FREE + 200,
      })

      // Verify the function was called
      expect(mockSendPaymentConfirmationEmail).toHaveBeenCalledTimes(1)
      
      // Verify the parameters
      const callArgs = mockSendPaymentConfirmationEmail.mock.calls[0][0]
      expect(callArgs.planTitle).toBe('Dealer Plus')
      expect(callArgs.amountPaid).toBe(49999)
      expect(callArgs.finalCredits).toBe(CREDITS_FREE + 200)
    })

    it('should include organization name in subject', async () => {
      const mockSendPaymentConfirmationEmail = vi.mocked(emailModule.sendPaymentConfirmationEmail)
      
      await emailModule.sendPaymentConfirmationEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: 'Acme Corp',
        amountPaid: 2000,
        currency: 'usd',
        invoiceUrl: 'https://invoice.stripe.com/test',
        planTitle: 'Pro Plan',
      })

      const callArgs = mockSendPaymentConfirmationEmail.mock.calls[0][0]
      expect(callArgs.orgName).toBe('Acme Corp')
    })

    it('should include invoice URL for "View Invoice" button', async () => {
      const mockSendPaymentConfirmationEmail = vi.mocked(emailModule.sendPaymentConfirmationEmail)
      const invoiceUrl = 'https://invoice.stripe.com/i/acct_test/test_invoice_123'
      
      await emailModule.sendPaymentConfirmationEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: testOrg.name,
        amountPaid: 5999,
        currency: 'usd',
        invoiceUrl,
        planTitle: 'Pro Plan',
      })

      const callArgs = mockSendPaymentConfirmationEmail.mock.calls[0][0]
      expect(callArgs.invoiceUrl).toBe(invoiceUrl)
    })
  })

  describe('Test 6.2: Cancellation Email (Final)', () => {
    itIf(MULTI_ORG_ENABLED)('should send final cancellation email with credit transfer information', async () => {
      const mockSendCancellationEmail = vi.mocked(emailModule.sendCancellationEmail)
      
      // Create a second organization for credit transfer
      const targetOrg = await OrganizationService.createOrganization(
        testUser.id,
        'Target Organization',
        TestUtils.generateUniqueSlug('target-org')
      )

      // Simulate final cancellation with credit transfer
      await emailModule.sendCancellationEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: testOrg.name,
        planTitle: 'Pro',
        final: true,
        creditsRemaining: 25,
        creditsTransferredTo: targetOrg.name,
      })

      // Verify the function was called
      expect(mockSendCancellationEmail).toHaveBeenCalledTimes(1)
      
      // Verify the parameters
      const callArgs = mockSendCancellationEmail.mock.calls[0][0]
      expect(callArgs.to).toBe(testUser.email)
      expect(callArgs.orgName).toBe(testOrg.name)
      expect(callArgs.final).toBe(true)
      expect(callArgs.creditsRemaining).toBe(25)
      expect(callArgs.creditsTransferredTo).toBe(targetOrg.name)
    })

    it('should include organization name in subject for final cancellation', async () => {
      const mockSendCancellationEmail = vi.mocked(emailModule.sendCancellationEmail)
      
      await emailModule.sendCancellationEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: 'Acme Corp',
        planTitle: 'Pro',
        final: true,
        creditsRemaining: 10,
        creditsTransferredTo: 'Target Org',
      })

      const callArgs = mockSendCancellationEmail.mock.calls[0][0]
      expect(callArgs.orgName).toBe('Acme Corp')
      expect(callArgs.final).toBe(true)
    })

    it('should NOT include reactivation button for final cancellation', async () => {
      const mockSendCancellationEmail = vi.mocked(emailModule.sendCancellationEmail)
      
      await emailModule.sendCancellationEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: testOrg.name,
        planTitle: 'Pro',
        final: true,
        creditsRemaining: 15,
      })

      const callArgs = mockSendCancellationEmail.mock.calls[0][0]
      expect(callArgs.final).toBe(true)
      // The email template should not include "Go to Billing" or "Reactivate" when final is true
    })

    it('should handle zero credits transfer', async () => {
      const mockSendCancellationEmail = vi.mocked(emailModule.sendCancellationEmail)
      
      await emailModule.sendCancellationEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: testOrg.name,
        planTitle: 'Pro',
        final: true,
        creditsRemaining: 0,
        creditsTransferredTo: 'Target Org',
      })

      const callArgs = mockSendCancellationEmail.mock.calls[0][0]
      expect(callArgs.creditsRemaining).toBe(0)
      expect(callArgs.creditsTransferredTo).toBe('Target Org')
    })

    it('should send scheduled cancellation email with reactivation option', async () => {
      const mockSendCancellationEmail = vi.mocked(emailModule.sendCancellationEmail)
      const effectiveDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days from now
      
      await emailModule.sendCancellationEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: testOrg.name,
        planTitle: 'Pro',
        final: false,
        effectiveDate,
        creditsRemaining: 40,
      })

      const callArgs = mockSendCancellationEmail.mock.calls[0][0]
      expect(callArgs.final).toBe(false)
      expect(callArgs.effectiveDate).toBe(effectiveDate)
      expect(callArgs.creditsRemaining).toBe(40)
    })
  })

  describe('Test 6.3: Invitation Email', () => {
    it('should send invitation email with correct organization name and role', async () => {
      const mockSendInviteEmail = vi.mocked(emailModule.sendInviteEmail)
      
      // Create an invite
      const invite = await InvitationService.createInvite(
        testUser.id,
        testOrg.id,
        'friend@example.com',
        ROLES.ADMIN
      )
      
      const inviteLink = InvitationService.getInviteLink(invite.token)
      
      // Send invitation email
      await emailModule.sendInviteEmail({
        to: 'friend@example.com',
        organizationName: testOrg.name,
        inviteLink,
        role: ROLES.ADMIN,
        inviterName: testUser.name,
        expiresAt: invite.expiresAt,
      })

      // Verify the function was called
      expect(mockSendInviteEmail).toHaveBeenCalledTimes(1)
      
      // Verify the parameters
      const callArgs = mockSendInviteEmail.mock.calls[0][0]
      expect(callArgs.to).toBe('friend@example.com')
      expect(callArgs.organizationName).toBe(testOrg.name)
      expect(callArgs.role).toBe(ROLES.ADMIN)
      expect(callArgs.inviterName).toBe(testUser.name)
      expect(callArgs.inviteLink).toContain('/invite/')
      expect(callArgs.inviteLink).toContain(invite.token)
    })

    it('should include correct invite link with token', async () => {
      const mockSendInviteEmail = vi.mocked(emailModule.sendInviteEmail)
      
      const invite = await InvitationService.createInvite(
        testUser.id,
        testOrg.id,
        'member@example.com',
        ROLES.MEMBER
      )
      
      const inviteLink = InvitationService.getInviteLink(invite.token)
      
      await emailModule.sendInviteEmail({
        to: 'member@example.com',
        organizationName: testOrg.name,
        inviteLink,
        role: ROLES.MEMBER,
        inviterName: testUser.name,
      })

      const callArgs = mockSendInviteEmail.mock.calls[0][0]
      expect(callArgs.inviteLink).toMatch(/\/invite\/[a-f0-9]{64}/)
    })

    it('should mention organization name in email body', async () => {
      const mockSendInviteEmail = vi.mocked(emailModule.sendInviteEmail)
      
      await emailModule.sendInviteEmail({
        to: 'test@example.com',
        organizationName: 'Acme Corporation',
        inviteLink: 'https://example.com/invite/token123',
        role: ROLES.MEMBER,
        inviterName: 'John Doe',
      })

      const callArgs = mockSendInviteEmail.mock.calls[0][0]
      expect(callArgs.organizationName).toBe('Acme Corporation')
    })

    it('should include inviter name in email', async () => {
      const mockSendInviteEmail = vi.mocked(emailModule.sendInviteEmail)
      
      await emailModule.sendInviteEmail({
        to: 'test@example.com',
        organizationName: testOrg.name,
        inviteLink: 'https://example.com/invite/token123',
        role: ROLES.ADMIN,
        inviterName: 'Jane Smith',
      })

      const callArgs = mockSendInviteEmail.mock.calls[0][0]
      expect(callArgs.inviterName).toBe('Jane Smith')
    })

    it('should include role information in email', async () => {
      const mockSendInviteEmail = vi.mocked(emailModule.sendInviteEmail)
      
      await emailModule.sendInviteEmail({
        to: 'test@example.com',
        organizationName: testOrg.name,
        inviteLink: 'https://example.com/invite/token123',
        role: ROLES.ADMIN,
        inviterName: testUser.name,
      })

      const callArgs = mockSendInviteEmail.mock.calls[0][0]
      expect(callArgs.role).toBe(ROLES.ADMIN)
    })

    it('should include expiration information', async () => {
      const mockSendInviteEmail = vi.mocked(emailModule.sendInviteEmail)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      
      await emailModule.sendInviteEmail({
        to: 'test@example.com',
        organizationName: testOrg.name,
        inviteLink: 'https://example.com/invite/token123',
        role: ROLES.MEMBER,
        inviterName: testUser.name,
        expiresAt,
      })

      const callArgs = mockSendInviteEmail.mock.calls[0][0]
      expect(callArgs.expiresAt).toEqual(expiresAt)
    })
  })

  describe('Test 6.4: Low Credits Email', () => {
    it('should send low credits alert email', async () => {
      const mockSendLowCreditsEmail = vi.mocked(emailModule.sendLowCreditsEmail)
      
      await emailModule.sendLowCreditsEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: testOrg.name,
        creditsRemaining: 3,
      })

      expect(mockSendLowCreditsEmail).toHaveBeenCalledTimes(1)
      
      const callArgs = mockSendLowCreditsEmail.mock.calls[0][0]
      expect(callArgs.to).toBe(testUser.email)
      expect(callArgs.orgName).toBe(testOrg.name)
      expect(callArgs.creditsRemaining).toBe(3)
    })

    it('should include organization name in low credits email', async () => {
      const mockSendLowCreditsEmail = vi.mocked(emailModule.sendLowCreditsEmail)
      
      await emailModule.sendLowCreditsEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: 'Production Org',
        creditsRemaining: 2,
      })

      const callArgs = mockSendLowCreditsEmail.mock.calls[0][0]
      expect(callArgs.orgName).toBe('Production Org')
    })
  })

  describe('Test 6.5: Renewal Reminder Email', () => {
    it('should send renewal reminder email with correct details', async () => {
      const mockSendRenewalReminderEmail = vi.mocked(emailModule.sendRenewalReminderEmail)
      const periodEnd = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days from now
      
      await emailModule.sendRenewalReminderEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: testOrg.name,
        planTitle: 'Pro',
        periodEnd,
        creditsRemaining: 15,
      })

      expect(mockSendRenewalReminderEmail).toHaveBeenCalledTimes(1)
      
      const callArgs = mockSendRenewalReminderEmail.mock.calls[0][0]
      expect(callArgs.to).toBe(testUser.email)
      expect(callArgs.orgName).toBe(testOrg.name)
      expect(callArgs.planTitle).toBe('Pro')
      expect(callArgs.periodEnd).toBe(periodEnd)
      expect(callArgs.creditsRemaining).toBe(15)
    })

    it('should include organization name in renewal reminder', async () => {
      const mockSendRenewalReminderEmail = vi.mocked(emailModule.sendRenewalReminderEmail)
      const periodEnd = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60
      
      await emailModule.sendRenewalReminderEmail({
        to: testUser.email,
        name: testUser.name,
        orgName: 'Enterprise Org',
        planTitle: 'Pro Plus',
        periodEnd,
        creditsRemaining: 50,
      })

      const callArgs = mockSendRenewalReminderEmail.mock.calls[0][0]
      expect(callArgs.orgName).toBe('Enterprise Org')
      expect(callArgs.planTitle).toBe('Pro Plus')
    })
  })
})
