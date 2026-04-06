 
// components/Themetoggle.tsx

'use client'

import { useToast } from '@/components/ToastProvider'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'

interface ThemeToggleProps {
  isAuthenticated?: boolean
}

export function Themetoggle({ isAuthenticated = false }: ThemeToggleProps) {
  const { setTheme } = useTheme()
  const { show, update } = useToast()
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
    console.log('[ThemeToggle] Mounted with isAuthenticated:', isAuthenticated)
  }, [isAuthenticated])

  const { mutate } = useORPCMutation(() => 
    orpc.user.updateTheme.mutationOptions({
      onSuccess: () => {
        // Theme update succeeded - toast is handled in persistTheme
      },
      onError: (_err: Error) => {
        // Error handling is done in persistTheme
      }
    })
  )

  const applyImmediateTheme = (value: 'light' | 'dark' | 'system') => {
    const el = document.documentElement
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const target = value === 'system' ? (sysDark ? 'dark' : 'light') : value
    el.classList.remove('light', 'dark')
    el.classList.add(target)
  }

  // This function now calls the oRPC mutation only if user is authenticated
  const persistTheme = (value: 'light' | 'dark' | 'system') => {
    // Only persist to server if user is authenticated
    if (!isAuthenticated) {
      // Silently skip server persistence for unauthenticated users
      console.log('[ThemeToggle] Skipping server persistence - user not authenticated')
      return
    }

    const id = show({ title: 'Saving theme…', variant: 'info', duration: 4000 })
    
    mutate(
      { theme: value },
      {
        onSuccess: () => {
          update(id, {
            title: 'Theme updated',
            description: value === 'system' ? 'System theme saved' : `${value} theme saved`,
            variant: 'success',
            duration: 2000,
          })
        },
        onError: (err: unknown) => {
          // Gracefully handle authentication errors
          const errorMessage = err instanceof Error ? err.message : String(err)
          const isAuthError = errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')
          update(id, { 
            title: isAuthError ? 'Theme changed locally' : 'Failed to save theme', 
            description: isAuthError ? 'Sign in to save your preference' : undefined,
            variant: isAuthError ? 'info' : 'error', 
            duration: 2500 
          })
        }
      }
    )
  }

  return (
    <div className='flex items-center' suppressHydrationWarning>
      {mounted ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant='default'
              size='icon-sm'
            >
              <Sun className='h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
              <Moon className='absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
              <span className='sr-only'>Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align='end'
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuItem
              onClick={() => {
                setTheme('light')
                applyImmediateTheme('light')
                persistTheme('light')
              }}
            >
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setTheme('dark')
                applyImmediateTheme('dark')
                persistTheme('dark')
              }}
            >
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setTheme('system')
                applyImmediateTheme('system')
                persistTheme('system')
              }}
            >
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
