// app/lib/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPER_ADMINS = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

// Routes that require super admin access
const SUPER_ADMIN_ROUTES = ['/admin', '/docs/api', '/api/openapi.json']

function isSuperAdminRoute(pathname: string): boolean {
  return SUPER_ADMIN_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isApiRoute = pathname.startsWith('/api/') || pathname.startsWith('/docs/api')
  const requiresSuperAdmin = isSuperAdminRoute(pathname)

  // Not authenticated
  if (!user) {
    if (isApiRoute) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/get-started'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Super admin routes - check if user is super admin
  if (requiresSuperAdmin) {
    const isSuperAdmin = user.email && SUPER_ADMINS.includes(user.email)
    if (!isSuperAdmin) {
      if (isApiRoute) {
        return new NextResponse('Administrative access required', { status: 403 })
      }
      // Redirect non-super-admins to dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
