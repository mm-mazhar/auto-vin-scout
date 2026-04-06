// lib/orpc/types.ts

import type { InferRouterInputs, InferRouterOutputs } from '@orpc/server'
import type { appRouter } from './root'

/**
 * Inferred input types for all router procedures
 */
export type RouterInputs = InferRouterInputs<typeof appRouter>

/**
 * Inferred output types for all router procedures
 */
export type RouterOutputs = InferRouterOutputs<typeof appRouter>

/**
 * Organization types
 */
export type OrganizationListOutput = RouterOutputs['org']['list']
export type OrganizationGetByIdOutput = RouterOutputs['org']['getById']

/**
 * Project types
 */
export type ProjectListOutput = RouterOutputs['project']['list']

/**
 * Invite types
 */
export type InviteListOutput = RouterOutputs['org']['getInvites']
