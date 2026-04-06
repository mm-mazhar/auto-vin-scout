// app/(dashboard)/_components/ClientAppSidebar.tsx

'use client'


import { AppSidebar } from '@/app/(dashboard)/_components/app-sidebar'
import * as React from 'react'

export function ClientAppSidebar(
  props: React.ComponentProps<typeof AppSidebar>
) {
  return <AppSidebar {...props} />
}

