// app/(dashboard)/_components/ThemeHydrator.tsx

'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

export default function ThemeHydrator({
  value,
}: {
  value?: 'light' | 'dark' | 'system'
}) {
  const { setTheme } = useTheme()
  useEffect(() => {
    if (value && value !== 'system') {
      setTheme(value)
    }
  }, [value, setTheme])
  return null
}
