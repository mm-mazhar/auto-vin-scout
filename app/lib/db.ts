// app/lib/db.ts

import { CREDITS_SIGNUP_BONUS, DEFAULT_COLOR_SCHEME, DEFAULT_THEME_MODE } from '@/lib/constants'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

const prismaClientSingleton = () => {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  })

  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

// --- Your existing helper functions remain unchanged below ---

// Helper function for getting/creating user data
interface UserData {
  email: string
  firstName: string
  id: string
  lastName: string
  profileImage?: string
}

export type DbUser = {
  id: string
  email: string
  name: string | null
  createdAt?: Date
  colorScheme?: string
  themePreference?: string
}

export async function getData(userData?: UserData | string): Promise<DbUser | null> {
  // If string is passed, it's just the user ID for fetching
  if (typeof userData === 'string') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userData },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          colorScheme: true,
          themePreference: true,
        },
      })
      return user
    } catch {
      return null
    }
  }

  // If UserData object is passed, ensure user exists or create
  if (userData) {
      const selection = {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        colorScheme: true,
        themePreference: true,
      } as const

    // 1. Try to find by ID first (Best match)
    try {
      const foundById = await prisma.user.findUnique({
        where: { id: userData.id },
        select: selection,
      })
      if (foundById) return foundById
    } catch {}

    // 2. If not found by ID, try finding by Email
    try {
      const found = await prisma.user.findUnique({
        where: { email: userData.email },
        select: selection,
      })
      
      if (found) {
        // Zombie Record Check: Email matches, but ID might not match.
        // If the IDs don't match, we need to sync the DB ID to match the current Supabase ID (userData.id)
        // to avoid Foreign Key violations when creating related records (like OrganizationMember).
        if (found.id !== userData.id) {
            console.log(`[DB] Syncing user ID for ${userData.email}: ${found.id} -> ${userData.id}`)
            try {
                const fullName = `${userData.firstName} ${userData.lastName}`.trim()
                const updated = await prisma.user.update({
                    where: { email: userData.email },
                    data: { 
                        id: userData.id, 
                        name: fullName || found.name // Update name if provided
                    },
                    select: selection
                })
                return updated
            } catch (updateError) {
                 console.error('[DB] Failed to update user ID (Zombie Record):', updateError)
                 // If update fails (e.g. strict FK constraints), we return the found user.
                 // The caller might fail later, but we've done our best.
                 return found
            }
        }
        return found
      }
    } catch {
      // swallow and attempt create path below (may also fail)
    }

    {
      const fullName = `${userData.firstName} ${userData.lastName}`.trim()
      const rawEmailPrefix = userData.email?.split('@')[0] ?? ''
      // VarChar(20): "Org " = 4 chars → max 16 for prefix; "Project " = 8 chars → max 12 for prefix
      const orgPrefix = rawEmailPrefix.slice(0, 16)
      const projectPrefix = rawEmailPrefix.slice(0, 12)
      const defaultOrgName = orgPrefix ? `Org ${orgPrefix}` : 'Default Organization'
      const defaultProjectName = projectPrefix ? `Project ${projectPrefix}` : 'Default Project'
      const orgSlugBase = orgPrefix
        ? orgPrefix.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : 'default-organization'
      const projectSlugBase = projectPrefix
        ? projectPrefix.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : 'default-project'
      const idSuffix = `${userData.id.substring(0, 8)}-${Date.now()}`
      try {
        const created = await prisma.user.create({
          data: {
            id: userData.id,
            email: userData.email,
            name: fullName || null,
            colorScheme: DEFAULT_COLOR_SCHEME,
            themePreference: DEFAULT_THEME_MODE,
            memberships: {
              create: {
                role: 'OWNER',
                organization: {
                  create: {
                    name: defaultOrgName,
                    slug: `${orgSlugBase}-${idSuffix}`,
                    isPrimary: true,
                    credits: CREDITS_SIGNUP_BONUS,
                    projects: {
                      create: {
                        name: defaultProjectName,
                        slug: `${projectSlugBase}-${idSuffix}`,
                      },
                    },
                  },
                },
              },
            },
          },
          select: selection,
        })
        return created
      } catch (error) {
        console.error('[DB] Failed to create user:', error)
        // if create fails (db down), return minimal object for UI
        return {
          id: userData.id,
          email: userData.email,
          name: fullName || null,
          createdAt: undefined,
          colorScheme: undefined,
          themePreference: undefined,
          // Subscription: undefined, // Removed
        }
      }
    }
    return null
  }

  return null
}
