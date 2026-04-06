// lib/services/invitation-service.ts

import prisma from '@/app/lib/db'
import { randomBytes } from 'crypto'
import { INVITE_EXPIRATION_MS, LIMITS, LOCAL_SITE_URL, OrganizationRole, PRODUCTION_URL, ROLES, SITE_URL, CHECK_DISPOSABLE_EMAILS } from '../constants'
import { isDisposableEmail } from '../email-validator'

export class InvitationService {
  static resolveOrigin() {
    const env = process.env.NODE_ENV
    
    if (env === 'development') {
      return LOCAL_SITE_URL || SITE_URL || 'http://localhost:3000'
    }
    
    // For production, try multiple sources and clean up any quotes
    // const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
    const productionUrl = PRODUCTION_URL?.replace(/['"]/g, '') || ''
    // const siteUrl = SITE_URL?.replace(/['"]/g, '') || ''
    
    // return productionUrl || siteUrl || vercelUrl || 'http://localhost:3000'
    return productionUrl
  }

  static getInviteLink(token: string) {
    const origin = InvitationService.resolveOrigin()
    
    // Ensure we have a valid origin before constructing URL
    if (!origin) {
      console.warn('No origin found for invite link, using relative path')
      return `/invite/${token}`
    }
    
    try {
      return new URL(`/invite/${token}`, origin).href
    } catch (error) {
      console.error('Failed to construct invite URL:', error, { origin, token })
      return `/invite/${token}`
    }
  }
  static async createInvite(inviterId: string, organizationId: string, email: string, role: OrganizationRole = ROLES.MEMBER) {
    // 1. Check for disposable email
    if (CHECK_DISPOSABLE_EMAILS && isDisposableEmail(email)) {
      throw new Error('Disposable emails cannot be invited to organizations. Please use a permanent email address.')
    }

    // 2. Check Limits
    const pendingInvites = await prisma.organizationInvite.count({
      where: {
        organizationId,
        status: 'PENDING',
      },
    })

    if (pendingInvites >= LIMITS.MAX_PENDING_INVITES_PER_ORG) {
      throw new Error(`Limit reached: Organization can only have ${LIMITS.MAX_PENDING_INVITES_PER_ORG} pending invites.`)
    }

    // 3. Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: {
          email,
        },
      },
    })

    if (existingMember) {
      throw new Error('User is already a member of this organization.')
    }

    // 4. Create Invite
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_MS)

    return await prisma.organizationInvite.create({
      data: {
        email,
        organizationId,
        inviterId,
        role,
        token,
        expiresAt,
      },
      include: { inviter: true, organization: true },
    })
  }

  static async getOrganizationInvites(organizationId: string) {
    const invites = await prisma.organizationInvite.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    const emails = invites.map((i) => i.email)
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, name: true },
    })

    const userMap = new Map(users.map((u) => [u.email, u.name]))

    return invites.map((invite) => ({
      ...invite,
      invitee: {
        name: userMap.get(invite.email) || null,
      },
    }))
  }

  static async acceptInvite(token: string, userId: string) {
    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
    })

    if (!invite) {
      throw new Error('Invalid invite token.')
    }

    if (invite.status !== 'PENDING') {
      throw new Error('Invite is no longer valid.')
    }

    if (invite.expiresAt < new Date()) {
      await prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      })
      throw new Error('Invite has expired.')
    }

    const userRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (!userRow) {
      throw new Error('User not found.')
    }

    const inviteEmail = String(invite.email || '').trim().toLowerCase()
    const userEmail = String(userRow.email || '').trim().toLowerCase()
    if (!inviteEmail || inviteEmail !== userEmail) {
      throw new Error('Invite does not belong to the current user.')
    }

    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId,
        },
      },
    })

    if (existingMember) {
      await prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      })
      return existingMember
    }

    // Transaction to add member and update invite
    return await prisma.$transaction(async (tx) => {
      // Check member limit again inside transaction just in case
      const memberCount = await tx.organizationMember.count({
        where: { organizationId: invite.organizationId },
      })

      if (memberCount >= LIMITS.MAX_MEMBERS_PER_ORGANIZATION) {
        throw new Error('Organization member limit reached.')
      }

      const member = await tx.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role,
        },
      })

      await tx.organizationInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      })

      return member
    })
  }

  static async revokeInvite(inviteId: string) {
    const invite = await prisma.organizationInvite.findUnique({
      where: { id: inviteId },
      select: { id: true, status: true },
    })
    if (!invite) {
      throw new Error('Invite not found.')
    }
    if (invite.status !== 'PENDING') {
      throw new Error('Only pending invites can be revoked.')
    }
    return await prisma.organizationInvite.update({
      where: { id: inviteId },
      data: { status: 'REVOKED' },
    })
  }

  static async deleteInvite(inviteId: string) {
    return await prisma.organizationInvite.delete({
      where: { id: inviteId },
    })
  }

  static async reinvite(inviteId: string) {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_MS)
    return await prisma.organizationInvite.update({
      where: { id: inviteId },
      data: { token, expiresAt, status: 'PENDING' },
      include: { inviter: true, organization: true },
    })
  }
}
