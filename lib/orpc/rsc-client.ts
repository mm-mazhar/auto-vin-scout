// lib/orpc/rsc-client.ts

import 'server-only'

import { createRouterClient, type RouterClient } from '@orpc/server'
import { appRouter, type AppRouter } from './root'
import { createContext } from './context'
import prisma from '@/app/lib/db'
import type { User } from '@supabase/supabase-js'
import type { OrganizationRole } from '@/lib/constants'

/**
 * Server-side RPC caller for React Server Components
 * Executes procedures directly without HTTP round-trips
 */
export async function getRPCCaller(): Promise<any> {
  const context = await createContext()
  const client = createRouterClient(appRouter, { context })
  return client
}

/**
 * Creates an RPC caller with an explicit, pre-validated org context.
 * Use this when the page has already resolved the effective org (e.g. dashboard)
 * to avoid a second cookie read that might resolve a different org.
 */
export function getRPCCallerForOrg(
  user: User,
  orgId: string,
  role: OrganizationRole
): any {
  const context = {
    user,
    db: prisma,
    orgId,
    role,
  }
  return createRouterClient(appRouter, { context })
}

/**
 * Type export for the RPC caller
 */
export type RPCCaller = RouterClient<AppRouter>
