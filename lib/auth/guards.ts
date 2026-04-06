// lib/auth/guards.ts


import prisma from '@/app/lib/db'
import { OrganizationRole, ROLES } from '@/lib/constants'

export async function getCurrentOrgContext(organizationId: string, userId: string) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: {
      role: true,
    },
  })

  if (!membership) {
    return null
  }

  return membership.role as OrganizationRole
}


const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  [ROLES.OWNER]: 3,
  [ROLES.ADMIN]: 2,
  [ROLES.MEMBER]: 1,
}

export async function requireOrgRole(orgId: string, userId: string, minimumRole: OrganizationRole) {
  const role = await getCurrentOrgContext(orgId, userId)

  if (!role) {
    throw new Error('Unauthorized: Not a member of this organization')
  }

  const userLevel = ROLE_HIERARCHY[role]
  const requiredLevel = ROLE_HIERARCHY[minimumRole]

  if (userLevel < requiredLevel) {
    throw new Error(`Unauthorized: Requires ${minimumRole} role`)
  }

  return role
}
