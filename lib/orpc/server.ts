// lib/orpc/server.ts

import { ORPCError, os } from '@orpc/server'
import type { ORPCContext } from './context'

/**
 * Domain error patterns that should be mapped to specific oRPC error codes
 */
type ORPCErrorCode = 'PRECONDITION_FAILED' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR'

const ERROR_MAPPINGS: Array<{ pattern: string; code: ORPCErrorCode }> = [
  { pattern: 'Limit reached', code: 'PRECONDITION_FAILED' },
  { pattern: 'limit reached', code: 'PRECONDITION_FAILED' },
  { pattern: 'Unauthorized', code: 'UNAUTHORIZED' },
  { pattern: 'unauthorized', code: 'UNAUTHORIZED' },
  { pattern: 'Not a member', code: 'FORBIDDEN' },
  { pattern: 'not a member', code: 'FORBIDDEN' },
  { pattern: 'Not found', code: 'NOT_FOUND' },
  { pattern: 'not found', code: 'NOT_FOUND' },
]

/**
 * Maps domain errors to appropriate oRPC error codes
 * @param error - The error to map
 * @returns The mapped ORPCError code or null if no mapping found
 */
export function mapDomainError(error: Error): ORPCErrorCode | null {
  const message = error.message
  for (const mapping of ERROR_MAPPINGS) {
    if (message.includes(mapping.pattern)) {
      return mapping.code
    }
  }
  return null
}

/**
 * Base oRPC builder with context type
 */
const base = os.$context<ORPCContext>()

/**
 * Logging middleware - logs procedure path and execution time in development mode
 */
const loggingMiddleware = base.middleware(async ({ path, next }) => {
  if (process.env.NODE_ENV !== 'development') {
    return next()
  }

  const start = Date.now()
  try {
    const result = await next()
    console.log(`[oRPC] ${path} - ${Date.now() - start}ms`)
    return result
  } catch (error) {
    console.log(`[oRPC] ${path} - ${Date.now() - start}ms (error)`)
    throw error
  }
})

/**
 * Error mapping middleware - maps domain errors to appropriate oRPC error codes
 */
const errorMappingMiddleware = base.middleware(async ({ next }) => {
  try {
    return await next()
  } catch (error) {
    // Only process non-ORPCError errors
    if (error instanceof ORPCError) {
      throw error
    }

    if (error instanceof Error) {
      const mappedCode = mapDomainError(error)
      if (mappedCode) {
        throw new ORPCError(mappedCode, { 
          message: error.message,
          cause: error,
        })
      }
    }
    
    throw error
  }
})

/**
 * Base procedure with logging and error mapping middleware
 * All procedures should be built from this base
 */
export const baseProcedure = base
  .use(loggingMiddleware)
  .use(errorMappingMiddleware)

/**
 * Re-export ORPCError and os for use in procedures and routers
 */
export { ORPCError, os }
