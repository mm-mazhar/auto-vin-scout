// tests/integration/setup.test.ts

import { describe, it, expect } from 'vitest'
import { testDb, TestUtils } from './setup'

describe('Test Setup Verification', () => {
  it('should connect to database successfully', async () => {
    // Simple connection test
    const result = await testDb.$queryRaw`SELECT 1 as test`
    expect(result).toBeDefined()
  })

  it('should create and cleanup test user successfully', async () => {
    // Test the utility functions
    const testUser = await TestUtils.createTestUser()
    expect(testUser.id).toBeDefined()
    expect(testUser.email).toContain('@example.com')
    
    // Verify user exists in database
    const foundUser = await testDb.user.findUnique({
      where: { id: testUser.id }
    })
    expect(foundUser).toBeDefined()
    expect(foundUser?.email).toBe(testUser.email)
    
    // Cleanup
    await TestUtils.cleanupUser(testUser.id)
    
    // Verify user is deleted
    const deletedUser = await testDb.user.findUnique({
      where: { id: testUser.id }
    })
    expect(deletedUser).toBeNull()
  })

  it('should generate unique identifiers', () => {
    const slug1 = TestUtils.generateUniqueSlug('test')
    const slug2 = TestUtils.generateUniqueSlug('test')
    const email1 = TestUtils.generateUniqueEmail('test')
    const email2 = TestUtils.generateUniqueEmail('test')
    
    expect(slug1).not.toBe(slug2)
    expect(email1).not.toBe(email2)
    expect(slug1).toContain('test')
    expect(email1).toContain('test')
  })
})