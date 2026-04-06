 
// lib/orpc/client.ts

'use client'

import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { AppRouter } from './root'

/**
 * Lazy initialization to avoid SSR issues
 * Note: _client is typed as any to avoid type errors with proxies and mocks.
 */

let _client: any = null
let _orpc: any = null
let _initialized = false

function initializeClients() {
  if (_initialized) {
    return { client: _client!, orpc: _orpc! }
  }

  if (typeof window !== 'undefined') {
    // Browser environment - create real clients with proper URL
    try {
      const link = new RPCLink({
        url: `${window.location.origin}/api/rpc`,
      })
      
      // oRPC createORPCClient returns types incompatible with RouterClient, so use any
      _client = createORPCClient(link)
      _orpc = createTanstackQueryUtils(_client)
    } catch (error) {
      console.error('Failed to create oRPC client:', error)
      // Fallback to mock clients if creation fails
      const createDeepProxy = (path: string[] = []): unknown => {
        return new Proxy(() => {}, {
          get(target, prop) {
            if (typeof prop === 'string') {
              return createDeepProxy([...path, prop])
            }
            return undefined
          },
          apply() {
            throw new Error(`oRPC client failed to initialize: ${error}`)
          }
        })
      }

      _client = createDeepProxy(['client'])
      _orpc = createDeepProxy(['orpc'])
    }
  } else {
    // SSR environment - create deep mock objects
    const createDeepProxy = (path: string[] = []): unknown => {
      return new Proxy(() => {}, {
        get(target, prop) {
          if (typeof prop === 'string') {
            return createDeepProxy([...path, prop])
          }
          return undefined
        },
        apply() {
          throw new Error(`oRPC client method ${path.join('.')} can only be used in browser environment`)
        }
      })
    }

    _client = createDeepProxy(['client'])
    _orpc = createDeepProxy(['orpc'])
  }

  _initialized = true
  return { client: _client!, orpc: _orpc! }
}

/**
 * oRPC client for direct procedure calls
 * Note: Uses any to avoid type errors with proxy and mocks.
 * Cast to any to allow dynamic property access on the proxy.
 */
export const client: any = new Proxy({}, {
  get(_target, prop) {
    const { client } = initializeClients()
    return client[prop as string]
  }
})

/**
 * TanStack Query utilities for oRPC
 * Note: Uses any to avoid type errors with proxy and mocks.
 * Cast to any to allow dynamic property access on the proxy.
 */
export const orpc: any = new Proxy({}, {
  get(_target, prop) {
    const { orpc } = initializeClients()
    return orpc[prop as string]
  }
})

/**
 * Re-export types for convenience
 */
export type { AppRouter }
