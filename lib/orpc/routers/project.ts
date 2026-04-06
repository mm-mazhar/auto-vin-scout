// lib/orpc/routers/project.ts

import * as z from 'zod'
import { ProjectService } from '@/lib/services/project-service'
import { orgProcedure, adminProcedure } from '../procedures'
import { ORPCError } from '../server'

/**
 * Project name validation schema
 * Name must be non-empty and 20 characters or fewer
 */
const nameSchema = z.string().min(1, 'Name is required').max(20, 'Name must be 20 characters or fewer')

/**
 * Generate a unique slug from project name, user ID, and timestamp
 * Format: {name-slug}-{user-prefix}-{timestamp}
 */
export function generateProjectSlug(name: string, userId: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const userPrefix = userId.substring(0, 8)
  const timestamp = Date.now()
  return `${baseSlug}-${userPrefix}-${timestamp}`
}

export const projectRouter = {
  /**
   * Create a new project in the current organization
   * Validates name (max 20 chars), generates unique slug
   */
  create: orgProcedure
    .input(z.object({ name: nameSchema }))
    .route({
      method: 'POST',
      path: '/project/create',
      summary: 'Create project',
      description: 'Creates a new project in the current organization',
    })
    .handler(async ({ input, context }) => {
      const slug = generateProjectSlug(input.name, context.user.id)
      
      try {
        return await ProjectService.createProject(
          context.user.id,
          context.orgId,
          input.name,
          slug
        )
      } catch (error) {
        if (error instanceof Error && error.message.includes('Limit reached')) {
          throw new ORPCError('PRECONDITION_FAILED', { message: error.message })
        }
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          throw new ORPCError('FORBIDDEN', { message: error.message })
        }
        throw error
      }
    }),

  /**
   * List all projects in the current organization
   */
  list: orgProcedure
    .route({
      method: 'GET',
      path: '/project/list',
      summary: 'List projects',
      description: 'Returns all projects in the current organization',
    })
    .handler(async ({ context }) => {
      return await ProjectService.getOrganizationProjects(context.user.id, context.orgId)
    }),

  /**
   * Get a project by slug
   */
  getBySlug: orgProcedure
    .input(z.object({ slug: z.string() }))
    .route({
      method: 'GET',
      path: '/project/by-slug',
      summary: 'Get project',
      description: 'Returns project details by slug',
    })
    .handler(async ({ input, context }) => {
      const project = await ProjectService.getProjectBySlug(
        context.user.id,
        context.orgId,
        input.slug
      )
      
      if (!project) {
        throw new ORPCError('NOT_FOUND', { message: 'Project not found' })
      }
      
      return project
    }),

  /**
   * Update project name
   */
  updateName: adminProcedure
    .input(z.object({ 
      projectId: z.string(),
      name: nameSchema 
    }))
    .route({
      method: 'PATCH',
      path: '/project/update-name',
      summary: 'Update project name',
      description: 'Updates the project name (requires admin role)',
    })
    .handler(async ({ input, context }) => {
      try {
        return await ProjectService.updateProject(
          context.user.id,
          input.projectId,
          { name: input.name }
        )
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ORPCError('NOT_FOUND', { message: error.message })
        }
        throw error
      }
    }),

  /**
   * Delete a project
   * Requires ADMIN or OWNER role
   */
  delete: adminProcedure
    .input(z.object({ projectId: z.string() }))
    .route({
      method: 'DELETE',
      path: '/project/delete',
      summary: 'Delete project',
      description: 'Deletes a project (requires admin role)',
    })
    .handler(async ({ input, context }) => {
      try {
        return await ProjectService.deleteProject(context.user.id, input.projectId)
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ORPCError('NOT_FOUND', { message: error.message })
        }
        throw error
      }
    }),
}
