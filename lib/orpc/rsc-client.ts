// lib/orpc/rsc-client.ts

import 'server-only'

import { createRouterClient, type RouterClient } from '@orpc/server'
import { appRouter, type AppRouter } from './root'
import { createContext } from './context'

/**
 * Server-side RPC caller for React Server Components
 * Executes procedures directly without HTTP round-trips
 * 
 * @returns A fully typed caller for all app router procedures
 * 
 * @example
 * ```tsx
 * // In a Server Component
 * import { getRPCCaller } from '@/lib/orpc/rsc-client'
 * 
 * export default async function OrganizationsPage() {
 *   const rpc = await getRPCCaller()
 *   const organizations = await rpc.org.list()
 *   return <OrganizationList organizations={organizations} />
 * }
 * ```
 */
 
export async function getRPCCaller(): Promise<any> {
  // Create context with current request's auth and org info
  const context = await createContext()
  
  // Create a router client that executes procedures directly
  const client = createRouterClient(appRouter, {
    context,
  })
  
  return client
}

/**
 * Type export for the RPC caller
 */
export type RPCCaller = RouterClient<AppRouter>
