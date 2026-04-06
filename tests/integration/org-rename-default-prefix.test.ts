// tests/integration/org-rename-default-prefix.test.ts

import { describe, it, expect, afterEach } from 'vitest'
import { TestUtils, testDb } from './setup'
import { OrganizationService } from '@/lib/services/organization-service'
import { ROLES, CREDITS_FREE } from '@/lib/constants'

describe('First-Run Rename: Default Organization Prefix', () => {
  let testUserId: string | null = null
  let createdOrgIds: string[] = []

  afterEach(async () => {
    if (createdOrgIds.length) {
      for (const id of createdOrgIds) {
        try {
          await TestUtils.cleanupOrganization(id)
        } catch {}
      }
      createdOrgIds = []
    }
    if (testUserId) {
      try {
        await TestUtils.cleanupUser(testUserId)
      } catch {}
      testUserId = null
    }
  })

  it('renames only the slug prefix and preserves suffix without timestamp', async () => {
    const user = await TestUtils.createTestUser()
    testUserId = user.id
    const id8 = user.id.substring(0, 8)
    const slug = `default-organization-${id8}`

    const org = await testDb.organization.create({
      data: {
        name: 'Default Organization',
        slug,
        isPrimary: true,
        credits: CREDITS_FREE,
        members: {
          create: {
            userId: user.id,
            role: ROLES.OWNER,
          },
        },
      },
    })
    createdOrgIds.push(org.id)

    const updated = await OrganizationService.renameDefaultPrefix(org.id, user.id, 'Acme Co')
    expect(updated.name).toBe('Acme Co')
    expect(updated.isPrimary).toBe(true)
    expect(updated.slug).toBe(`acme-co-${id8}`)
  })

  it('renames only the slug prefix and preserves suffix with timestamp', async () => {
    const user = await TestUtils.createTestUser()
    testUserId = user.id
    const id8 = user.id.substring(0, 8)
    const ts = Date.now()
    const slug = `default-organization-${id8}-${ts}`

    const org = await testDb.organization.create({
      data: {
        name: 'Default Organization',
        slug,
        isPrimary: true,
        credits: CREDITS_FREE,
        members: {
          create: {
            userId: user.id,
            role: ROLES.OWNER,
          },
        },
      },
    })
    createdOrgIds.push(org.id)

    const updated = await OrganizationService.renameDefaultPrefix(org.id, user.id, 'Beta Ltd')
    expect(updated.name).toBe('Beta Ltd')
    expect(updated.isPrimary).toBe(true)
    expect(updated.slug).toBe(`beta-ltd-${id8}-${ts}`)
  })

  it('rejects rename when org is not primary', async () => {
    const user = await TestUtils.createTestUser()
    testUserId = user.id
    const id8 = user.id.substring(0, 8)
    const slug = `default-organization-${id8}`

    const org = await testDb.organization.create({
      data: {
        name: 'Default Organization',
        slug,
        isPrimary: false,
        credits: 0,
        members: {
          create: {
            userId: user.id,
            role: ROLES.OWNER,
          },
        },
      },
    })
    createdOrgIds.push(org.id)

    await expect(
      OrganizationService.renameDefaultPrefix(org.id, user.id, 'Gamma')
    ).rejects.toThrow('Only primary organization')
  })

  it('enforces prefix length guard at 11 slugified chars', async () => {
    const user = await TestUtils.createTestUser()
    testUserId = user.id
    const id8 = user.id.substring(0, 8)
    const slug = `default-organization-${id8}`

    const org = await testDb.organization.create({
      data: {
        name: 'Default Organization',
        slug,
        isPrimary: true,
        credits: CREDITS_FREE,
        members: {
          create: {
            userId: user.id,
            role: ROLES.OWNER,
          },
        },
      },
    })
    createdOrgIds.push(org.id)

    const longName = 'this name will be slugified to exceed limit'
    const result = OrganizationService.renameDefaultPrefix(org.id, user.id, longName)
    await expect(result).rejects.toThrow()
  })
})

