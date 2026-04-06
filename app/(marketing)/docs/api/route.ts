import { ApiReference } from '@scalar/nextjs-api-reference'
import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'

const config = {
  spec: {
    url: '/api/openapi.json',
  },
  theme: 'kepler' as const,
  metaData: {
    title: 'SaaS Kit API Documentation',
    description: 'Interactive API documentation for the Next.js SaaS Kit oRPC API',
  },
  hideModels: false,
  hideDownloadButton: false,
  darkMode: true,
}

const SUPER_ADMINS = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Require authentication
  if (!user) {
    redirect('/get-started')
  }

  // Require super admin access
  if (!user.email || !SUPER_ADMINS.includes(user.email)) {
    redirect('/dashboard')
  }

  return ApiReference(config)()
}
