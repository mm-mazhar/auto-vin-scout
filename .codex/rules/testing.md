---
description: Standards for Unit and E2E testing.
globs: "**/*.{test,spec}.ts, **/__tests__/**"
---

# Testing Standards

## 1. E2E & Browser Automation
**Trigger Skill or Powers:** `/webapp-testing`

*   **Tool:** Playwright (via Python scripts in `skills/webapp-testing` or `\powers\installed\webapp-testing\POWER.md`).
*   **Rule:** Do not manually write complex Playwright boilerplate. Invoke the `/webapp-testing` skill or `\powers\installed\webapp-testing\POWER.md` to scaffold and run browser automation.
*   **Scope:** User flows, authentication, payment handling, critical UI paths.

## 2. Unit & Integration Testing
*   **Tool:** Vitest (running via `npm test`).
*   **Scope:** Business logic, utility functions, oRPC procedures.
*   **Structure:**
    *   Use BDD-style comments: `#given`, `#when`, `#then`.
    *   One logical assertion per test.
    *   Mock external dependencies (Stripe, Supabase) using existing mocks in `tests/integration/setup.ts`.

## 3. Mocking Strategy
*   **Database:** Use the test database container (Docker); minimize mocking Prisma where possible to ensure integration validity.
*   **External APIs:** Mock all HTTP calls (Stripe, Resend) to prevent network flakes and costs.