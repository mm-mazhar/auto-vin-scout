// tests/integration/primary-org-bootstrap-slug.test.ts

import { getData } from '@/app/lib/db'
import { afterEach, describe, expect, it } from 'vitest'
import { testDb } from './setup'

describe('Primary Org Bootstrap Slug', () => {
  let createdUserId: string | null = null

  afterEach(async () => {
    if (createdUserId) {
      try {
        const memberships = await testDb.organizationMember.findMany({
          where: { userId: createdUserId },
        })

        for (const membership of memberships) {
          await testDb.organization.delete({ where: { id: membership.organizationId } })
        }

        await testDb.user.delete({ where: { id: createdUserId } })
      } catch {}

      createdUserId = null
    }
  })

  it('creates primary organization with timestamped slug', async () => {
    const uniqueId = `test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    const email = `${uniqueId}@example.com`
    const firstName = 'Test'
    const lastName = 'User'

    const user = await getData({
      id: uniqueId,
      email,
      firstName,
      lastName,
    })

    createdUserId = user?.id ?? null

    const orgs = await testDb.organization.findMany({
      where: {
        members: {
          some: { userId: uniqueId },
        },
      },
    })

    expect(orgs.length).toBeGreaterThan(0)

    const primary = orgs.find((org) => org.isPrimary)
    expect(primary).toBeTruthy()

    const slug = primary!.slug
    const id8 = uniqueId.substring(0, 8)
    const pattern = new RegExp(`^default-organization-${id8}-\\d{13}$`)

    expect(pattern.test(slug)).toBe(true)
  })
})

