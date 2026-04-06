import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod'
import { appRouter } from '@/lib/orpc/root'
import { createClient } from '@/app/lib/supabase/server'

/**
 * OpenAPI specification generator for the oRPC API
 * Generates a JSON schema from the app router
 */
const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
})

const SUPER_ADMINS = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

/**
 * Generate OpenAPI spec from the app router
 */
async function generateOpenAPISpec() {
  return await generator.generate(appRouter, {
    info: {
      title: 'SaaS Kit API',
      version: '1.0.0',
      description: 'Type-safe API for the Next.js SaaS Kit',
    },
    servers: [
      {
        url: '/api/rpc',
        description: 'RPC endpoint',
      },
    ],
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Require authentication
  if (!user) {
    return new Response('Unauthorized: Please log in to access this resource', {
      status: 401,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // Require super admin access
  if (!user.email || !SUPER_ADMINS.includes(user.email)) {
    return new Response('Administrative access required', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  const spec = await generateOpenAPISpec()
  
  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
