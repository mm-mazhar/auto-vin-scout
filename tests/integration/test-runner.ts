#!/usr/bin/env tsx

// tests/integration/test-runner.ts
/**
 * Integration Test Runner
 * 
 * This script helps verify that the integration test environment is properly set up
 * and can be used to run tests with proper database configuration.
 */

import { execSync } from 'child_process'
import prisma from '../../app/lib/db'

async function checkDatabaseConnection() {
  console.log('🔍 Checking database connection...')
  
  try {
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Check if tables exist
    const userCount = await prisma.user.count()
    const orgCount = await prisma.organization.count()
    
    console.log(`📊 Current database state:`)
    console.log(`   - Users: ${userCount}`)
    console.log(`   - Organizations: ${orgCount}`)
    
    await prisma.$disconnect()
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    await prisma.$disconnect()
    return false
  }
}

async function runTests() {
  console.log('🧪 Running integration tests...')
  
  try {
    execSync('npm run test:integration', { stdio: 'inherit' })
    console.log('✅ All tests passed!')
  } catch {
    console.error('❌ Tests failed')
    process.exit(1)
  }
}

async function main() {
  console.log('🚀 Integration Test Runner')
  console.log('==========================')
  
  // Check environment
  const dbUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL
  if (!dbUrl) {
    console.error('❌ No DATABASE_URL or TEST_DATABASE_URL found in environment')
    process.exit(1)
  }
  
  console.log(`🔗 Using database: ${dbUrl.replace(/\/\/.*@/, '//***@')}`)
  
  // Check database connection
  const dbConnected = await checkDatabaseConnection()
  if (!dbConnected) {
    console.log('\n💡 Troubleshooting tips:')
    console.log('   1. Make sure your database is running')
    console.log('   2. Check your DATABASE_URL in .env file')
    console.log('   3. Run: npx prisma migrate deploy')
    process.exit(1)
  }
  
  // Run tests
  await runTests()
  
  console.log('\n🎉 Integration tests completed successfully!')
}

if (require.main === module) {
  main().catch(console.error)
}