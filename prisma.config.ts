// prisma.config.ts
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    // For Supabase migrations, we use DIRECT_URL. 
    // If it's missing, we fallback to DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
})
