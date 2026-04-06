// tests/integration/env-setup.ts

// Load environment variables before any other imports

import { config } from 'dotenv'
import path from 'path'

// Load .env file from the root directory
config({ path: path.resolve(process.cwd(), '.env') })

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables')
  console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE')))
  process.exit(1)
}

console.log('✅ Environment variables loaded successfully')
console.log('📊 DATABASE_URL:', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@'))