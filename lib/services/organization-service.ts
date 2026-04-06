// lib/services/organization-service.ts

import prisma from '../../app/lib/db'
import { CREDITS_FREE, LIMITS, OrganizationRole, ROLES } from '../constants'

export class OrganizationService {
  static async createOrganization(userId: string, name: string, slug: string) {
    // 1. Check Limits
    const userOrgCount = await prisma.organizationMember.count({
      where: {
        userId,
        role: ROLES.OWNER,
        organization: {
          deletedAt: null,
        },
      },
    })

    if (userOrgCount >= LIMITS.MAX_ORGANIZATIONS_PER_USER) {
      throw new Error(`Limit reached: You can only create up to ${LIMITS.MAX_ORGANIZATIONS_PER_USER} organizations.`)
    }

    // 2. Prevent Infinite Credit Loophole
    // Check if user is already an OWNER of any existing active Organization that is marked as Primary.
    const existingPrimaryOrgCount = await prisma.organizationMember.count({
      where: { 
        userId, 
        role: ROLES.OWNER,
        organization: { 
          isPrimary: true, 
          deletedAt: null 
        }
      }
    })

    let isPrimary = false
    let initialCredits = 0

    if (existingPrimaryOrgCount === 0) {
      isPrimary = true
      initialCredits = CREDITS_FREE
    }

    // 3. Create Org and Membership
    return await prisma.organization.create({
      data: {
        name,
        slug,
        credits: initialCredits,
        isPrimary,
        members: {
          create: {
            userId,
            role: ROLES.OWNER,
          },
        },
      },
      include: {
        members: true,
      },
    })
  }

  static async renameDefaultPrefix(orgId: string, userId: string, newName: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          where: { userId },
        },
      },
    })

    if (!org) {
      throw new Error('Organization not found')
    }
    if (org.deletedAt) {
      throw new Error('Organization is deleted')
    }
    const member = org.members[0]
    if (!member || (member.role !== ROLES.OWNER && member.role !== ROLES.ADMIN)) {
      throw new Error('Forbidden')
    }
    if (!org.isPrimary) {
      throw new Error('Only primary organization can be renamed via this flow')
    }
    const defaultPrefix = 'default-organization-'
    if (!org.slug.startsWith(defaultPrefix)) {
      throw new Error('Slug is not using default prefix')
    }

    const slugified = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 11)

    if (!slugified) {
      throw new Error('Invalid name')
    }

    const suffix = org.slug.slice(defaultPrefix.length)
    const newSlug = `${slugified}-${suffix}`

    try {
      return await prisma.organization.update({
        where: { id: orgId },
        data: {
          name: newName,
          slug: newSlug,
        },
      })
    } catch (e: any) {
      if (typeof e?.code === 'string' && e.code === 'P2002') {
        const fallbackSlug = `${newSlug}-${Date.now().toString(36).slice(-4)}`
        return await prisma.organization.update({
          where: { id: orgId },
          data: {
            name: newName,
            slug: fallbackSlug,
          },
        })
      }
      throw e
    }
  }

  static async getUserOrganizations(userId: string) {
    return await prisma.organization.findMany({
      where: {
        deletedAt: null, // Filter out soft-deleted orgs
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: {
            userId,
          },
        },
      },
    })
  }

  static async getOrganizationBySlug(slug: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })
    // Filter out if soft-deleted
    if (org?.deletedAt) return null
    return org
  }

  static async getOrganizationById(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })
    if (org?.deletedAt) return null
    return org
  }

  static async updateOrganization(orgId: string, data: { name?: string; slug?: string }) {
    return await prisma.organization.update({
      where: { id: orgId },
      data,
    })
  }

  static async deleteOrganization(orgId: string) {
    // Soft Delete: Set deletedAt
    return await prisma.organization.update({
      where: { id: orgId },
      data: { deletedAt: new Date() }
    })
  }

  static async addMember(orgId: string, userId: string, role: OrganizationRole = ROLES.MEMBER) {
    // Check member limit
    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: orgId },
    })

    if (memberCount >= LIMITS.MAX_MEMBERS_PER_ORGANIZATION) {
      throw new Error(`Limit reached: Organization can have max ${LIMITS.MAX_MEMBERS_PER_ORGANIZATION} members.`)
    }

    return await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId,
        role,
      },
    })
  }

  static async removeMember(orgId: string, userId: string) {
    // Prevent removing the last OWNER
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      include: {
        user: true,
      },
    })

    if (member?.role === ROLES.OWNER) {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: ROLES.OWNER,
        },
      })

      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last owner of the organization.')
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Delete the member
      const deletedMember = await tx.organizationMember.delete({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId,
          },
        },
      })

      // 2. Update associated invites to REVOKED instead of deleting
      if (member?.user?.email) {
        await tx.organizationInvite.updateMany({
          where: {
            organizationId: orgId,
            email: member.user.email,
          },
          data: {
            status: 'REVOKED'
          }
        })
      }

      return deletedMember
    })
  }

  static async updateMemberRole(orgId: string, userId: string, newRole: OrganizationRole) {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.organizationMember.update({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId,
          },
        },
        data: { role: newRole },
        include: { user: { select: { email: true } } },
      })

      if (updated.user?.email) {
        await tx.organizationInvite.updateMany({
          where: {
            organizationId: orgId,
            email: updated.user.email,
            status: 'ACCEPTED',
          },
          data: { role: newRole },
        })
      }

      return updated
    })
  }
}
