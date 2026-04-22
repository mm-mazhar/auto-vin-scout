// tests/setup/next-server-mock.ts
/**
 * Mock Next.js server functions for test environment
 * 
 * This file mocks Next.js 16 server functions that require request context,
 * allowing tests to run without a full Next.js server environment.
 * 
 * Specifically mocks:
 * - after(): Background task scheduling function that requires request scope
 * - RiskEngineService: AI-powered risk assessment service (to avoid real API calls)
 */

import { vi } from 'vitest'

/**
 * Mock the 'next/server' module
 * 
 * The after() function in Next.js 16 requires a request context to schedule
 * background tasks. In test environments, we don't have this context, so we
 * mock it to be a no-op (does nothing).
 */
vi.mock('next/server', () => ({
  /**
   * Mock after() function
   * 
   * In production: Schedules a callback to run after the response is sent
   * In tests: No-op to prevent "after() called outside request scope" errors
   * 
   * @param callback - The function to execute (ignored in tests)
   */
  after: vi.fn(() => {
    // No-op: Do nothing in test environment
    // This prevents the background task from running during tests
    // Tests can verify the analyze procedure without waiting for risk assessment
  }),
}))

/**
 * Mock the Risk Engine Service
 * 
 * The Risk Engine makes real API calls to AI providers (OpenRouter, Google AI).
 * In test environments, we mock it to prevent:
 * - Real API calls that cost money
 * - Network timeouts and flakiness
 * - Rate limiting issues
 * - Test slowness
 */
vi.mock('@/lib/services/risk-engine', () => ({
  RiskEngineService: {
    /**
     * Mock generateRiskAssessment() function
     * 
     * In production: Makes AI API calls and updates report with risk assessment
     * In tests: No-op to prevent real API calls
     * 
     * @param reportId - The report ID (ignored in tests)
     */
    generateRiskAssessment: vi.fn(async () => {
      // No-op: Do nothing in test environment
      // Tests focus on the analyze procedure logic, not risk assessment
    }),
  },
}))
