// lib/services/project-service.ts

import prisma from '@/app/lib/db'
import { LIMITS } from '@/lib/constants'

export class ProjectService {
  static async createProject(userId: string, organizationId: string, name: string, slug: string) {
    // 1. Enforce Membership (Security)
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } }
    })
    
    if (!membership) {
        throw new Error('Unauthorized: You are not a member of this organization.')
    }

    // 2. Check Limits
    const projectCount = await prisma.project.count({
      where: {
        organizationId,
        organization: {
          deletedAt: null,
        },
      },
    })

    if (projectCount >= LIMITS.MAX_PROJECTS_PER_ORGANIZATION) {
      throw new Error(`Limit reached: Organization can only have up to ${LIMITS.MAX_PROJECTS_PER_ORGANIZATION} projects.`)
    }

    // 3. Create Project
    return await prisma.project.create({
      data: {
        name,
        slug,
        organizationId,
      },
    })
  }

  static async getOrganizationProjects(userId: string, organizationId: string) {
    return await prisma.project.findMany({
      where: {
        organizationId,
        // Enforce RLS: User must be member of the org
        organization: {
            deletedAt: null,
            members: {
                some: {
                    userId
                }
            }
        }
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  static async getProjectBySlug(userId: string, organizationId: string, slug: string) {
    return await prisma.project.findFirst({
      where: {
        slug,
        organizationId,
        // Enforce RLS
        organization: {
            deletedAt: null,
            members: {
                some: { userId }
            }
        }
      },
    })
  }

  static async updateProject(userId: string, projectId: string, data: { name?: string; slug?: string }) {
    // Check if project exists and user has access (RLS)
    // We update only if the project's org has this user as member
    // Note: Caller should verify granular permissions (Edit capability)
    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            organization: { 
                deletedAt: null,
                members: { some: { userId } } 
            }
        }
    })

    if (!project) throw new Error('Project not found or unauthorized')

    return await prisma.project.update({
      where: { id: projectId },
      data,
    })
  }

  static async deleteProject(userId: string, projectId: string) {
     // Verify access first
     const project = await prisma.project.findFirst({
         where: {
             id: projectId,
             organization: { 
                 deletedAt: null,
                 members: { some: { userId } } 
             }
         }
     })

     if (!project) throw new Error('Project not found or unauthorized')

    return await prisma.project.delete({
      where: { id: projectId },
    })
  }
}
