// tests/integration/env-setup.ts

// Load environment variables before any other imports

import { config } from 'dotenv'
import path from 'path'

// Load .env (DEV) only — never load .env.production for tests
config({ path: path.resolve(process.cwd(), '.env') })

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables')
  process.exit(1)
}

// Hard block: parse the PROD Supabase URL from .env.production and ensure
// the active DATABASE_URL does not point to the production project.
const prodEnv = config({ path: path.resolve(process.cwd(), '.env.production') })
const prodSupabaseUrl = prodEnv.parsed?.NEXT_PUBLIC_SUPABASE_URL ?? ''
const prodRef = prodSupabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

if (prodRef && process.env.DATABASE_URL.includes(prodRef)) {
  console.error('🚨 BLOCKED: DATABASE_URL points to the PRODUCTION Supabase project.')
  console.error('🚨 Ensure your .env points to the DEV project before running tests.')
  process.exit(1)
}

console.log('✅ Environment variables loaded successfully')
console.log('📊 DATABASE_URL:', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@'))