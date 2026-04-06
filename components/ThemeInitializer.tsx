// components/ThemeInitializer.tsx

'use client'

import { DEFAULT_COLOR_SCHEME } from '@/lib/constants'
import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

type ThemeSettings = {
  colorScheme: string | null
  themePreference: 'light' | 'dark' | 'system' | null
}

export function ThemeInitializer({
  settings,
  forceFromServer,
}: {
  settings: ThemeSettings | null
  forceFromServer?: boolean
}) {
  const { setTheme } = useTheme()
  const appliedRef = useRef(false)

  useEffect(() => {
    const body = document.body
    const desired = settings?.colorScheme ?? DEFAULT_COLOR_SCHEME
    const existing = Array.from(body.classList).find((c) => c.startsWith('theme-'))
    if (existing !== desired) {
      if (existing) body.classList.remove(existing)
      body.classList.add(desired)
    }

    if (!appliedRef.current && forceFromServer && settings?.themePreference) {
      const pref = settings.themePreference
      setTheme(pref)
      appliedRef.current = true
    }
  }, [settings, forceFromServer, setTheme])

  return null
}
