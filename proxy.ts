// proxy.ts

import { updateSession } from '@/app/lib/supabase/middleware'
import { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/docs/api/:path*',
    '/api/openapi.json',
  ],
}
