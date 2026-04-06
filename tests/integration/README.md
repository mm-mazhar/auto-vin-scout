# Integration Tests

This directory contains integration tests for the SaaS Kit's core functionality, focusing on multi-tenancy, onboarding, RBAC, and invitations.

## Test Structure

### Test 1: Onboarding & Multi-Tenancy (`onboarding-multi-tenancy.test.ts`)

These tests verify the core multi-tenant functionality:

#### Test 1.1: New User Default State
- ✅ Verifies new users get a "Personal" organization with default credits (5 or defined in `/lib/constants.ts file`)
- ✅ Ensures the organization is marked as primary (`isPrimary: true`)
- ✅ Confirms the user is assigned as OWNER role
- ✅ Prevents multiple primary organizations per user

#### Test 1.2: Data Isolation
- ✅ Verifies projects are isolated between organizations
- ✅ Ensures users can only access their own organization data
- ✅ Tests proper context switching between organizations
- ✅ Validates cross-organization access prevention

#### Additional Multi-Tenancy Tests
- ✅ Organization limits enforcement (max 5 per user or defined in `/lib/constants.ts file`)
- ✅ Soft deletion functionality
- ✅ Proper cleanup and data integrity

### Test 2: RBAC Permissions (`rbac-permissions.test.ts`)

These tests verify role-based access control:

#### Test 2.1: Member Restrictions
- ✅ Correctly identifies MEMBER role via `getCurrentOrgContext`
- ✅ Denies MEMBER access to admin-level actions via `requireOrgRole`
- ✅ Denies MEMBER permission to invite/remove members
- ✅ Denies MEMBER permission to update/delete organization
- ✅ Allows MEMBER to create and update projects
- ✅ Denies MEMBER permission to delete projects

#### Test 2.2: Admin Restrictions
- ✅ Correctly identifies ADMIN role via `getCurrentOrgContext`
- ✅ Allows ADMIN access when ADMIN role is required
- ✅ Denies ADMIN access when OWNER role is required
- ✅ Allows ADMIN to update organization
- ✅ Denies ADMIN permission to delete/transfer organization
- ✅ Allows ADMIN full member management (invite, remove, update roles)
- ✅ Allows ADMIN full project permissions

#### Test 2.3: Owner Permissions
- ✅ Correctly identifies OWNER role via `getCurrentOrgContext`
- ✅ Allows OWNER access for all role requirements
- ✅ Allows OWNER all organization permissions (update, delete, transfer)
- ✅ Allows OWNER all member permissions
- ✅ Allows OWNER all project permissions

#### Test 2.4: Role Change Restrictions
- ✅ Verifies OWNER role cannot be changed via business logic
- ✅ Allows ADMIN to change MEMBER role
- ✅ Allows ADMIN to demote another ADMIN to MEMBER
- ✅ Prevents setting role to OWNER via `updateMemberRole`

#### Test 2.5: Non-Member Access
- ✅ Returns null for non-member via `getCurrentOrgContext`
- ✅ Throws error for non-member via `requireOrgRole`

#### Test 2.6: Role Hierarchy
- ✅ Enforces OWNER > ADMIN > MEMBER hierarchy

### Test 3: Billing & Credits (`billing-credits.test.ts`)

These tests verify the billing system and credit management:

#### Test 3.1: Pro/Pro Plus Subscription
- ✅ Creates Pro subscription and adds credits to organization
- ✅ Creates Pro Plus subscription with correct credits (100)
- ✅ Allows subscription renewal when credits are low (< 20)
- ✅ Upgrades from Pro to Pro Plus

#### Test 3.2: Subscription Logic
- ✅ Populates subscription table with organizationId
- ✅ Links subscription to correct organization
- ✅ Handles multiple organizations with different subscriptions

#### Test 3.3: Zombie Subscription Prevention
- ✅ Cancels Stripe subscription when organization is deleted
- ✅ Handles subscription cancellation gracefully even if Stripe fails

#### Test 3.4: Credit Transfer
- ✅ Transfers credits when deleting organization with active subscription
- ✅ Handles credit transfer with zero credits
- ✅ Verifies user owns target organization for credit transfer

#### Test 3.5: Subscription Status Management
- ✅ Updates subscription status correctly
- ✅ Handles subscription period updates

#### Test 3.6: Credit Operations
- ✅ Increments credits correctly
- ✅ Handles credit reminder threshold reset

### Test 4: Invitations (`invitations.test.ts`)

These tests verify the invitation system:

#### Test 4.1: Invite Creation
- ✅ Creates pending invite with correct properties
- ✅ Creates invite with ADMIN role when specified
- ✅ Generates unique tokens for each invite
- ✅ Generates valid invite links

#### Test 4.2: Invite Limits
- ✅ Enforces pending invite limit per organization
- ✅ Allows new invites after revoking existing ones

#### Test 4.3: Invite Acceptance
- ✅ Accepts invite and adds user as member with correct role
- ✅ Rejects invite acceptance for wrong user
- ✅ Rejects invalid invite token
- ✅ Rejects already accepted invite
- ✅ Rejects revoked invite

#### Test 4.4: Existing Member Check
- ✅ Prevents inviting existing members

#### Test 4.5: Invite Management
- ✅ Lists all organization invites
- ✅ Revokes an invite
- ✅ Deletes an invite permanently
- ✅ Reinvites with new token and expiry

### Test 5: Abuse Prevention & Guardrails (`abuse-prevention.test.ts`)

These tests verify abuse prevention mechanisms and system limits:

#### Test 5.1: The "Infinite Credit" Loophole
- ✅ Prevents infinite credits by only giving credits to primary organization
- ✅ Enforces organization limit per user (max 5 or defined in `/lib/constants.ts file`)
- ✅ Only allows one primary organization per user

#### Test 5.2: Primary-Only Refill (Time Travel)
- ✅ Only refills credits for primary organizations
- ✅ Does not refill primary org if it already has 5+ credits (or defined in `/lib/constants.ts file`)
- ✅ Does not refill if less than 1 month has passed
- ✅ Does not refill organizations with active subscriptions

#### Test 5.3: Invite Spamming
- ✅ Enforces rate limit on invitations (tested at service layer)
- ✅ Enforces pending invite limit per organization
- ✅ Allows new invites after revoking existing ones
- ✅ Prevents inviting existing members

#### Test 5.4: Additional Abuse Prevention
- ✅ Enforces member limit per organization
- ✅ Enforces project limit per organization

### Test 6: Disposable Email Blocking (`disposable-email-blocking.test.ts`)

These tests verify the disposable email validation system:

#### Test 6.1: Client-Side Blocking (Sign Up)
- ✅ Detects disposable emails correctly using known domains
- ✅ Allows legitimate emails (Gmail, Outlook, Yahoo, etc.)
- ✅ Handles edge cases (empty strings, invalid formats, case sensitivity)
- ✅ Validates emails through server action with proper error messages

#### Test 6.2: Server-Side Blocking (Invites)
- ✅ Blocks disposable emails in invitation system at service layer
- ✅ Blocks various disposable email domains consistently
- ✅ Allows legitimate emails in invitation system
- ✅ Handles case-insensitive disposable email detection
- ✅ Provides appropriate error messages for disposable emails
- ✅ Blocks disposable emails regardless of role (MEMBER, ADMIN)
- ✅ Validates email before other business logic (disposable check before limits)

#### Test 6.3: Integration with Business Logic
- ✅ Works correctly with invite management operations
- ✅ Maintains disposable email blocking across different organizations

### Test 7: Transactional Emails (`transactional-emails.test.ts`)

These tests verify the transactional email system and content:

#### Test 7.1: Payment Confirmation Email
- ✅ Sends payment confirmation email with correct content for Pro plan
- ✅ Sends payment confirmation email with correct content for Pro Plus plan
- ✅ Includes organization name in subject
- ✅ Includes invoice URL for "View Invoice" button

#### Test 7.2: Cancellation Email (Final)
- ✅ Sends final cancellation email with credit transfer information
- ✅ Includes organization name in subject for final cancellation
- ✅ Does NOT include reactivation button for final cancellation
- ✅ Handles zero credits transfer
- ✅ Sends scheduled cancellation email with reactivation option

#### Test 7.3: Invitation Email
- ✅ Sends invitation email with correct organization name and role
- ✅ Includes correct invite link with token (/invite/[token])
- ✅ Mentions organization name in email body
- ✅ Includes inviter name in email
- ✅ Includes role information in email
- ✅ Includes expiration information

#### Test 7.4: Low Credits Email
- ✅ Sends low credits alert email
- ✅ Includes organization name in low credits email

#### Test 7.5: Renewal Reminder Email
- ✅ Sends renewal reminder email with correct details
- ✅ Includes organization name in renewal reminder

### Test 8: CRON Jobs & Automated Alerts (`cron-jobs.test.ts`)

These tests verify the automated CRON job functionality:

#### Test 8.1: Low Credits Alert
- ✅ Sends low credits email when credits are below threshold
- ✅ Does NOT send email if creditsReminderThresholdSent is already true
- ✅ Resets creditsReminderThresholdSent when credits go above threshold
- ✅ Does NOT send email for deleted organizations

#### Test 8.2: Renewal Reminder
- ✅ Sends renewal reminder email 3 days before subscription ends
- ✅ Does NOT send renewal reminder if already sent
- ✅ Does NOT send renewal reminder for inactive subscriptions

#### Test 8.3: Daily Maintenance (Refill & Cleanup)
- ✅ Refills credits for primary organization after 1 month
- ✅ Does NOT refill credits for secondary organization
- ✅ Does NOT refill credits for organizations with active subscriptions
- ✅ Hard deletes organizations deleted 30+ days ago
- ✅ Does NOT delete organizations deleted less than 30 days ago
- ✅ Does NOT refill credits if already at 5 (or defined in `/lib/constants.ts file`) or more

## Running the Tests

### Prerequisites

1. **Database Setup**: Ensure you have a test database configured
   ```bash
   # Set up test database URL in your .env file
   DATABASE_URL="postgresql://username:password@localhost:5432/saaskit_test"
   ```

2. **Database Migration**: Run Prisma migrations on test database
   ```bash
   npx prisma migrate deploy
   ```

### Running Tests

```bash
# Run all integration tests
npx vitest run tests/integration --config tests/integration/vitest.config.ts

# Run specific test file
npx vitest run tests/integration/onboarding-multi-tenancy.test.ts --config tests/integration/vitest.config.ts
npx vitest run tests/integration/rbac-permissions.test.ts --config tests/integration/vitest.config.ts
npx vitest run tests/integration/billing-credits.test.ts --config tests/integration/vitest.config.ts
npx vitest run tests/integration/invitations.test.ts --config tests/integration/vitest.config.ts
npx vitest run tests/integration/abuse-prevention.test.ts --config tests/integration/vitest.config.ts
npx vitest run tests/integration/disposable-email-blocking.test.ts --config tests/integration/vitest.config.ts
npx vitest run tests/integration/transactional-emails.test.ts --config tests/integration/vitest.config.ts
npx vitest run tests/integration/cron-jobs.test.ts --config tests/integration/vitest.config.ts

# Run setup verification test
npx vitest run tests/integration/setup.test.ts --config tests/integration/vitest.config.ts

# Run tests in watch mode
npx vitest tests/integration --config tests/integration/vitest.config.ts
```

### Test Environment Variables

The tests use the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string for test database
- Other environment variables from your `.env` file may be needed for full functionality

## Test Utilities

### `TestUtils` Class
- `createTestUser()`: Creates a test user with unique identifiers
- `cleanupUser()`: Properly cleans up user and related data
- `cleanupOrganization()`: Cleans up organization and related data
- `generateUniqueSlug()`: Generates unique slugs for organizations
- `generateUniqueEmail()`: Generates unique test emails

### `DatabaseHelpers` Class
- `getOrganizationWithMembers()`: Fetches organization with member details
- `getUserWithOrganizations()`: Fetches user with organization memberships
- `getProjectsByOrganization()`: Fetches projects for a specific organization
- `countUserOrganizations()`: Counts active organizations for a user
- `countOrganizationProjects()`: Counts projects in an organization

## Test Data Management

The tests automatically:
- Create unique test data for each test case
- Clean up all test data after each test
- Handle foreign key constraints properly
- Prevent test data pollution between test runs

## Debugging Tests

If tests fail:

1. **Check Database Connection**: Ensure your test database is running and accessible
2. **Verify Migrations**: Make sure all Prisma migrations are applied
3. **Check Environment Variables**: Ensure all required env vars are set
4. **Review Test Output**: Tests provide detailed error messages for debugging

## Adding New Tests

When adding new integration tests:

1. Use the existing `TestUtils` and `DatabaseHelpers` for consistency
2. Always clean up test data in `afterEach` hooks
3. Use unique identifiers to prevent test conflicts
4. Follow the existing naming conventions
5. Add appropriate documentation for new test scenarios

## Test Coverage

These tests cover:
- ✅ User onboarding flow
- ✅ Organization creation and management
- ✅ Multi-tenant data isolation
- ✅ Role-based access control (RBAC)
- ✅ Permission system (`can()` function)
- ✅ Role hierarchy enforcement
- ✅ Invitation system (create, accept, revoke, reinvite)
- ✅ Invite limits and validation
- ✅ Billing and subscription management
- ✅ Stripe integration (mocked for testing)
- ✅ Credit system operations
- ✅ Credit transfers between organizations
- ✅ Subscription status updates
- ✅ Zombie subscription prevention
- ✅ Abuse prevention and guardrails
- ✅ Primary organization credit refills
- ✅ Rate limiting (service layer)
- ✅ Organization, member, and project limits
- ✅ Disposable email validation (client and server-side)
- ✅ Email validation function with edge cases
- ✅ Transactional emails (payment, cancellation, invitation, low credits, renewal)
- ✅ Email content verification (subjects, organization names, buttons, links)
- ✅ Database constraints and limits
- ✅ Soft deletion functionality

Total: **118 tests** across **8 test files**

Future test additions could cover:
- [ ] Stripe webhook handling (end-to-end)
- [ ] Email notifications (end-to-end with actual email sending)
- [ ] API endpoint integration
- [ ] Super admin dashboard operations
- [ ] CRON job endpoints (end-to-end)
