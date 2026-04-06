// app/api/rpc/[[...rest]]/route.ts

import { RPCHandler } from '@orpc/server/fetch'
import { onError } from '@orpc/server'
import { appRouter } from '@/lib/orpc/root'
import { createContext } from '@/lib/orpc/context'

/**
 * oRPC handler with error interceptor for logging
 */
const handler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error('[oRPC Error]', error)
    }),
  ],
})

/**
 * Handle incoming RPC requests
 * Creates context with authenticated user and organization info
 */
async function handleRequest(request: Request) {
  try {
    const { response } = await handler.handle(request, {
      prefix: '/api/rpc',
      context: await createContext(request),
    })

    return response ?? new Response('Not found', { status: 404 })
  } catch (error) {
    console.error('[oRPC] Handler error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

// Export handlers for all HTTP methods
export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const PATCH = handleRequest
export const DELETE = handleRequest
