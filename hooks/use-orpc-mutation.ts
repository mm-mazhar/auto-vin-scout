// hooks/use-orpc-mutation.ts

'use client'

import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

/**
 * Custom hook that wraps useMutation with oRPC client safety
 * Prevents SSR issues by only initializing mutations after component mounts
 */
export function useORPCMutation<TData, TError, TVariables, TContext>(
  getMutationOptions: () => UseMutationOptions<TData, TError, TVariables, TContext>
) {
  // This returns true only on the client, after hydration
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  )

  return useMutation(
    isMounted
      ? getMutationOptions()
      : ({
          mutationFn: () => Promise.reject(new Error('Component not mounted')),
        } as UseMutationOptions<TData, TError, TVariables, TContext>)
  )
}