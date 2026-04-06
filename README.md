# AUTO VIN SCOUT v1.0.0

Build a production-ready, multi-tenant SaaS with:

- Next.js 16 (App Router, Server Actions)
- Supabase Auth + Postgres
- Prisma ORM
- oRPC type-safe API layer with OpenAPI documentation
- Stripe subscriptions + usage-based credits
- Role Based Access Control (RBAC)
- Super Admin analytics dashboard
- Tailwind CSS + Shadcn UI

This README is a full, end‑to‑end setup and operations guide for this specific codebase.

---

## Table of Contents

- [Next.js SaaS Kit](#nextjs-saas-kit)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Architecture](#architecture)
    - [Multi-tenancy Model](#multi-tenancy-model)
    - [RBAC Model](#rbac-model)
    - [Super Admin Dashboard](#super-admin-dashboard)
  - [Getting Started](#getting-started)
    - [1. Clone \& Install](#1-clone--install)
    - [2. Environment Variables](#2-environment-variables)
    - [3. Database \& Prisma](#3-database--prisma)
      - [Optional: Seed Data](#optional-seed-data)
    - [4. Supabase Auth Setup](#4-supabase-auth-setup)
      - [4.1 API Keys](#41-api-keys)
      - [4.2 Email Provider](#42-email-provider)
      - [4.3 Google OAuth](#43-google-oauth)
      - [4.4 URL Configuration](#44-url-configuration)
      - [4.5 Email Templates](#45-email-templates)
    - [5. Row Level Security (RLS)](#5-row-level-security-rls)
    - [6. Stripe Setup](#6-stripe-setup)
      - [6.1 Local Webhook Setup](#61-local-webhook-setup)
      - [6.2  Webhook Setup in Stripe](#62--webhook-setup-in-stripe)
    - [7. oRPC API Setup](#7-orpc-api-setup)
      - [7.1 API Documentation](#71-api-documentation)
      - [7.2 Client Usage](#72-client-usage)
      - [7.3 Testing oRPC](#73-testing-orpc)
    - [8. CRON Jobs \& Maintenance](#8-cron-jobs--maintenance)
      - [8.1 Local Testing](#81-local-testing)
      - [8.2 Vercel CRON Configuration](#82-vercel-cron-configuration)
    - [9. Run the App](#9-run-the-app)
  - [Role Based Access Control (RBAC)](#role-based-access-control-rbac)
    - [Roles](#roles)
    - [High-level Rules](#high-level-rules)
    - [Enforcement Examples](#enforcement-examples)
    - [UI Behavior](#ui-behavior)
  - [Super Admin Mode](#super-admin-mode)
    - [Enabling Super Admin Access](#enabling-super-admin-access)
    - [Super Admin Dashboard Capabilities](#super-admin-dashboard-capabilities)
  - [Testing Checklist](#testing-checklist)
    - [Authentication \& Onboarding](#authentication--onboarding)
    - [Organizations, Projects \& RBAC](#organizations-projects--rbac)
    - [Billing \& Credits](#billing--credits)
    - [Super Admin Dashboard](#super-admin-dashboard-1)
    - [Security \& RLS](#security--rls)
    - [oRPC API \& Type Safety](#orpc-api--type-safety)
  - [Useful Commands](#useful-commands)
    - [General](#general)
    - [Testing](#testing)
    - [Prisma](#prisma)
    - [Stripe (Local)](#stripe-local)
    - [Supabase Quick Test](#supabase-quick-test)
    - [oRPC API Testing](#orpc-api-testing)
  - [Deployment](#deployment)
  - [Troubleshooting](#troubleshooting)
    - [Auth Issues](#auth-issues)
    - [RBAC / Permission Errors](#rbac--permission-errors)
    - [Super Admin](#super-admin)
    - [Database \& RLS](#database--rls)
    - [oRPC API Issues](#orpc-api-issues)

---

## Overview

This project is a multi-tenant SaaS starter built with Next.js 16 and Supabase. It supports:

- Authentication via Supabase (email magic links + Google OAuth)
- Multi-organization accounts with members and projects
- RBAC with `OWNER`, `ADMIN`, and `MEMBER` roles
- Type-safe API layer with oRPC and auto-generated OpenAPI documentation
- Billing via Stripe (subscriptions + credit refills)
- A Super Admin section to monitor system-wide stats (users, orgs, revenue)
- CRON-based background maintenance and email notifications

You can use it as a starting point for your own SaaS, or as a reference for:

- How to combine Supabase Auth with Prisma
- How to implement RBAC and multi-tenancy
- How to build a type-safe API with oRPC
- How to build a super admin area separate from tenant dashboards

---

## Features

- **Authentication**
  - Supabase magic links (passwordless)
  - Google OAuth
  - Email templates wired to `/auth/callback`

- **Multi-tenancy**
  - Each user can belong to multiple organizations
  - Each organization owns its own projects and billing
  - RLS policies to prevent cross‑org data leaks

- **RBAC**
  - Roles: `OWNER`, `ADMIN`, `MEMBER`
  - Fine-grained server-side checks via `requireOrgRole` and `permissions`
  - UI behavior matches role permissions (e.g., disabled buttons for low-privilege members)

- **Billing**
  - Stripe subscriptions (e.g. Pro plan)
  - Credits per organization
  - Daily maintenance job to refill/cleanup
  - Reminder emails for renewals and credit exhaustion

- **Super Admin**
  - Email-based super admin whitelisting
  - `/admin` area with analytics cards, charts, user/org lists, system status
  - CSV export of aggregated statistics

- **DX**
  - Tailwind CSS 4 + Shadcn UI components
  - ESLint + TypeScript strict
  - Prisma schema tuned for multi‑tenant SaaS
  - oRPC type-safe API with auto-generated OpenAPI docs

---

## Tech Stack

- `next` – Next.js 16 (App Router, RSC, Server Actions)
- `react`, `react-dom` – React 19
- `@supabase/supabase-js`, `@supabase/ssr` – Supabase Auth + SSR helpers
- `pg` – Postgres driver used with Prisma
- `@prisma/client`, `prisma` – ORM + migrations
- `@orpc/server`, `@orpc/client`, `@orpc/zod` – Type-safe RPC with Zod validation
- `@orpc/openapi` – Auto-generated OpenAPI documentation
- `@orpc/tanstack-query` – React Query integration for oRPC
- `stripe` – Stripe Billing / subscriptions
- `resend` – Transactional emails
- `tailwindcss` + `tailwindcss-animate` + Shadcn UI (`components.json`)
- `lucide-react` – Icons
- CRON via `vercel.json` scheduled functions

Config references:

- `package.json`: scripts and dependencies
- `prisma/schema.prisma`: data model
- `lib/constants.ts`: RBAC roles, limits, and configuration
- `lib/auth/guards.ts`: RBAC enforcement helpers
- `lib/orpc/`: oRPC API layer with routers and procedures
- `app/(dashboard)/**`: tenant dashboard
- `app/(super-admin)/**`: super admin area
- `app/api/rpc/`: oRPC HTTP handler
- `tests/orpc/`: comprehensive oRPC test suite

---

## Architecture

### Multi-tenancy Model

The core multi-tenant model is defined in `prisma/schema.prisma`:

- `User`
  - Identified by Supabase Auth user `id` (UUID string)
  - Stores profile preferences (`colorScheme`, `themePreference`)
  - Has many `OrganizationMember` rows (one per organization)

- `Organization`
  - Owns billing (`stripeCustomerId`, `credits`, `subscription`)
  - Has many `OrganizationMember` (users) and `Project` (resources)
  - Soft-delete via `deletedAt`

- `OrganizationMember`
  - Junction of `User` + `Organization`
  - Has `role` of type `OrganizationRole` (`OWNER`, `ADMIN`, `MEMBER`)
  - Enforced uniqueness on (`organizationId`, `userId`)

- `Project`
  - Belongs to exactly one `Organization`
  - Slug unique per organization

- `OrganizationInvite`
  - Used to invite users by email into organizations with a specific role
  - Includes `status` and expiration

All queries are made through Prisma and respect RLS enforced in Supabase.

### RBAC Model

RBAC types and limits live in `lib/constants.ts:158`:

- `ROLES` – `{ OWNER, ADMIN, MEMBER }`
- `OrganizationRole` – union of role keys
- `LIMITS` – per-user/org constraints (max orgs, projects, members, pending invites)

Server-side authorization helpers:

- `lib/auth/guards.ts:1`
  - `getCurrentOrgContext(orgId, userId)` returns the user’s role in the organization or `null`
  - `requireOrgRole(orgId, userId, minimumRole)` throws if user does not meet required role
  - `ROLE_HIERARCHY` enforces `OWNER > ADMIN > MEMBER`

- `lib/auth/permissions.ts:1`
  - Declares a simple permission map for actions:
    - Org‑level: `org:update`, `org:delete`, `org:transfer`
    - Member‑level: `member:invite`, `member:remove`, `member:update`
    - Project‑level: `project:create`, `project:update`, `project:delete`
  - `can(role, action)` returns a boolean used to control UI and business logic

Actions that enforce RBAC:

- `app/actions/organization.ts:68`
  - `updateMemberRoleAction` – only `ADMIN`+ can change roles, cannot downgrade `OWNER`, cannot set `OWNER` via this path
  - `inviteMember` – only `ADMIN`+ can invite, with rate limiting and pending-invite caps
  - `updateOrganizationNameAction` – requires at least `ADMIN`

- `app/actions/project.ts:76`
  - `deleteProject` – resolves `organizationId` and enforces `ADMIN`+ via `requireOrgRole`

### Super Admin Dashboard

The super admin area lives under `app/(super-admin)`:

- `app/(super-admin)/layout.tsx:1`
  - Server layout that:
    - Reads currently authenticated user via Supabase
    - Checks `SUPER_ADMIN_EMAILS` env var
    - Redirects non-super-admins to `/dashboard`
  - Wraps children with `SidebarProvider` and `AdminSidebar`, plus `DashboardHeader`

- `app/(super-admin)/_components/admin-sidebar.tsx:1`
  - Client sidebar for super admin navigation
  - Links to:
    - Overview dashboard (`/admin`)
    - Revenue analytics
    - User analytics
    - Users, organizations, subscriptions, settings

- `app/(super-admin)/_components/dashboard-actions.tsx:1`
  - Controls for refreshing dashboard, exporting CSV reports, etc.

- `app/(super-admin)/_components/system-status.tsx:1`
  - Receives system health data (`database` status + latency)
  - Renders cards with overall system status

The dashboard aggregates data across all organizations (e.g., total revenue, active orgs, growth), separate from tenant scoping.

---

## Getting Started

### 1. Clone & Install

Clone your own repository that contains this code and install dependencies:

```bash
git clone <your-repo-url> saas-kit
cd saas-kit

pnpm add -g pnpm

pnpm install
```

> This project uses `pnpm` as the package manager.

### 2. Environment Variables

Copy the example env file and fill it as you configure services:

```bash
cp .env.example .env
```

Key groups:

- Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL`
  - `DIRECT_URL`

- Stripe:
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PRICE_ID`
  - `STRIPE_WEBHOOK_SECRET` (per environment)

- App:
  - `NEXT_PUBLIC_APP_URL` / `PRODUCTION_URL`
  - `SUPPORT_EMAIL`, `APP_EMAIL`
  - `CRON_SECRET` – secret key for CRON endpoints
  - `SUPER_ADMIN_EMAILS` – comma-separated list of emails with super admin access

- Email (Resend / SMTP):
  - `RESEND_API_KEY` or SMTP credentials (depending on how you configure `sendBasicEmail`)

#### Multi‑Org Toggle (single vs multi‑organization mode)

Control how many organizations a single user can own. Set both vars for consistent server and UI behavior:

```bash
# Allow up to 3 organizations per user (multi‑org enabled)
NEXT_PUBLIC_MAX_ORGANIZATIONS_PER_USER=3
MAX_ORGANIZATIONS_PER_USER=3
```

Notes:
- If these are unset, 0, negative, or non‑numeric, the system defaults to 1 (single‑org).
- With a value > 1, secondary organization creation is enabled and multi‑org tests run.
- With a value of 1, secondary org creation is disabled and multi‑org tests auto‑skip.
- After changing `NEXT_PUBLIC_` vars, restart the dev server so the client bundle picks up the new value.

### 3. Database & Prisma

This project uses Supabase Postgres with Prisma as the ORM.

1. In Supabase, go to **Project Settings → Database → Connection String**.
2. Copy:
   - **Connection pooling** URL → `DATABASE_URL`
   - **Direct connection** URL → `DIRECT_URL`
3. Confirm `prisma/schema.prisma` matches the schema you want for your SaaS.
4. Run initial migration and generate the client:

```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

To inspect the DB:

```bash
pnpm prisma studio
```

#### Optional: Seed Data

The README previously included raw SQL seeding examples. You can adapt those to:

- Create sample users (including potential super admin emails)
- Create a few organizations, members, subscriptions, and projects

You can run SQL directly in the Supabase SQL editor using your Prisma model names (wrapped in quotes).

### 4. Supabase Auth Setup

In the Supabase dashboard:

#### 4.1 API Keys

- **Path**: `Project Settings → API`
- Set in `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
DIRECT_URL=...
```

#### 4.2 Email Provider

- **Path**: `Authentication → Providers → Email`
- Recommended config:

| Setting                     | Recommended                              |
| --------------------------- | ---------------------------------------- |
| Enable Email provider       | Enabled                                  |
| Confirm email               | Disabled (dev) / Enabled (prod)         |
| Secure email change         | Enabled                                  |
| Double confirm email change | Enabled                                  |

#### 4.3 Google OAuth

1. Go to Google Cloud Console → **APIs & Services → Credentials**.
2. Create an OAuth 2.0 client (Web application).
3. Authorized JavaScript origins:

```bash
http://localhost:3000
https://your-production-domain.com
```

4. Authorized redirect URIs:

```bash
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

5. Paste Client ID and Secret into:
   - Supabase → `Authentication → Providers → Google`

#### 4.4 URL Configuration

- **Path**: `Authentication → URL Configuration`

Set:

- Site URL (production):

```bash
https://your-production-domain.com
```

- For local dev, also use:

```bash
http://localhost:3000
```

Redirect URLs to add:

```bash
http://localhost:3000
http://localhost:3000/auth/callback
http://localhost:3000/dashboard
https://your-production-domain.com
https://your-production-domain.com/auth/callback
https://your-production-domain.com/dashboard
```

#### 4.5 Email Templates

Magic link (sign-in) template:

```html
<h2>Magic Link</h2>
<p>Click this link to sign in:</p>
<p>
  <a
    href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard"
  >
    Sign In
  </a>
</p>
```

Confirm signup template:

```html
<h2>Confirm your email</h2>
<p>Follow this link to confirm your email:</p>
<p>
  <a
    href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/dashboard"
  >
    Confirm Email
  </a>
</p>
```

### 5. Row Level Security (RLS)

RLS is required to ensure tenant isolation. The policies are tailored to the Prisma models in this repo.

High-level approach:

- Enable RLS on all tenant tables (`User`, `Organization`, `OrganizationMember`, `Project`, `Subscription`)
- Use policies so users only see data for organizations where they are members
- Use `OWNER`/`ADMIN` roles for mutating operations
- Use `auth.role() = 'service_role'` for server‑side maintenance and Stripe webhooks

For full, copy‑pastable SQL policies tailored to this schema, see [RLS-Public-Schema](docs/RLS-Public-Schema.md) file in the `doc` folder. That file contains the complete set of `ALTER TABLE` and `CREATE POLICY` statements you can run in the Supabase SQL editor.

When starting on a **new project** (no existing production users):

1. (Optional but recommended for clean local/dev) Truncate tenant tables:

```sql
BEGIN;

TRUNCATE TABLE
  public."OrganizationInvite",
  public."Project",
  public."OrganizationMember",
  public."Subscription",
  public."Organization",
  public."User"
RESTART IDENTITY CASCADE;

TRUNCATE TABLE auth.users CASCADE;

COMMIT;
```

2. Apply the RLS scripts from [RLS-Public-Schema](docs/RLS-Public-Schema.md) (or your own) to:
   - Enable RLS on each table
   - Create policies:
     - `Org: select by membership`
     - `Org: insert by authenticated`
     - `Org: update by owner_or_admin`
     - `Org: delete by owner`
     - `OrgMember: select in same org`, etc.
     - `Project: select by membership`, `Project: insert/update by owner_or_admin`

To verify RLS:

```sql
-- When logged in as a test user (via Supabase SQL editor)
SELECT * FROM "User" WHERE id::uuid = auth.uid();

-- Should be empty unless using service_role
SELECT * FROM "User" LIMIT 10;
```

### 6. Stripe Setup

1. Go to the Stripe dashboard and enable **Test mode**.
2. Create a **Product** and **Price** that matches your plan (e.g., Pro monthly).
3. Copy:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
   - Price IDs → `STRIPE_PRICE_ID` e.g `STRIPE_PRICE_ID_pro`, `STRIPE_PRICE_ID_proplus`, `STRIPE_PRICE_ID_3`

Set these in `.env`.

#### 6.1 Local Webhook Setup

Install Stripe CLI and log in:

```bash
stripe login
```

Forward webhooks to your dev server (with `pnpm run dev` running):

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Stripe CLI will print a `whsec_...` signing secret; set:
```bash
# For Local
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 6.2  Webhook Setup in Stripe

Steps in the Stripe Dashboard
- Navigate to Webhooks: Log in to your Stripe Dashboard, go to the Developers section, and click the Webhooks tab (or "Event destinations").
- Add Endpoint: Click + Add endpoint (or "Create an event destination").
- Select Events: Choose specific events rather than all events for better performance.
  - Checkout: 
        
        - checkout.session.async_payment_succeeded 
        - checkout.session.completed
        - checkout.session.expired
  - Customer:
        
        - customer.subscription.created
        - customer.subscription.deleted
        - customer.subscription.paused
        - customer.subscription.pending_update_applied
        - customer.subscription.pending_update_expired
        - customer.subscription.resumed
        - customer.subscription.trial_will_end
        - customer.subscription.updated
        
  - Invoice:
      
        - invoice.created
        - invoice.deleted
        - invoice.finalization_failed
        - invoice.finalized
        - invoice.marked_uncollectible
        - invoice.overdue
        - invoice.overpaid
        - invoice.paid
        - invoice.payment_action_required
        - invoice.payment_failed
        - invoice.payment_succeeded
        - invoice.sent
        - invoice.upcoming
        - invoice.updated
        - invoice.voided
        - invoice.will_be_due
  
  - Payment Intent:
      
        - payment_intent.amount_capturable_updated
        - payment_intent.canceled
        - payment_intent.created
        - payment_intent.partially_funded
        - payment_intent.payment_failed
        - payment_intent.processing
        - payment_intent.requires_action
        - payment_intent.succeeded
- Enter Endpoint URL: Input your server's HTTPS URL (e.g., https://your-domain.com/api/webhook/stripe) where Stripe will send events.
     
- Add Endpoint: Click to add the endpoint.
- Get the Secret: After creation, find your unique webhook signing secret (starts with whsec_) and set it as `STRIPE_WEBHOOK_SECRET` in your environment variables `.env` file. 
  ```bash
    # For Production
    STRIPE_WEBHOOK_SECRET=whsec_...
  ```


### 7. oRPC API Setup

This project includes a fully-featured oRPC (OpenRPC) implementation that provides type-safe API endpoints with automatic OpenAPI documentation generation.

#### 7.1 API Documentation

The oRPC API automatically generates OpenAPI documentation accessible at:

- **Development**: `http://localhost:3000/docs/api`
- **Production**: `https://your-domain.com/api/docs`

The API specification is available at:
- **JSON**: `/api/openapi.json`

#### 7.2 Client Usage

The oRPC client is configured for both server-side and client-side usage:

**Server-side (RSC):**
```typescript
import { rscClient } from '@/lib/orpc/rsc-client'

// In a Server Component
const organizations = await rscClient.organization.list()
```

**Client-side with React Query:**
```typescript
'use client'
import { client } from '@/lib/orpc/client'
import { useQuery } from '@tanstack/react-query'

// In a Client Component
function OrganizationList() {
  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => client.organization.list()
  })
  
  return <div>{/* render organizations */}</div>
}
```

#### 7.3 Testing oRPC

The project includes comprehensive tests for the oRPC implementation:

**Run all oRPC tests:**
```bash
- pnpm test tests/orpc
- pnpm tsc --noEmit
- pnpm run test
- pnpm vitest run --reporter=verbose 2>&1
```

**Run specific test suites:**
```bash
# Test context and authentication
pnpm test tests/orpc/context.test.ts

# Test RBAC authorization logic
pnpm test tests/orpc/rbac.test.ts

# Test individual routers
pnpm test tests/orpc/routers/organization.test.ts
pnpm test tests/orpc/routers/project.test.ts
pnpm test tests/orpc/routers/user.test.ts
pnpm test tests/orpc/routers/admin.test.ts

# Test server procedures and error handling
pnpm test tests/orpc/procedures.test.ts
pnpm test tests/orpc/server.test.ts
```

**Test with watch mode:**
```bash
pnpm run test:watch tests/orpc
```

**Available API Endpoints:**

The oRPC API provides the following router endpoints:

- **Organization Router** (`/api/rpc/organization.*`)
  - `list` - List user's organizations
  - `create` - Create new organization
  - `update` - Update organization details
  - `delete` - Delete organization
  - `getMembers` - List organization members
  - `inviteMember` - Invite new member
  - `updateMemberRole` - Update member role
  - `removeMember` - Remove member

- **Project Router** (`/api/rpc/project.*`)
  - `list` - List organization projects
  - `create` - Create new project
  - `update` - Update project details
  - `delete` - Delete project

- **User Router** (`/api/rpc/user.*`)
  - `profile` - Get user profile
  - `updateProfile` - Update user profile
  - `preferences` - Get user preferences
  - `updatePreferences` - Update preferences

- **Billing Router** (`/api/rpc/billing.*`)
  - `getSubscription` - Get subscription details
  - `createCheckoutSession` - Create Stripe checkout
  - `getUsage` - Get credit usage stats

- **Admin Router** (`/api/rpc/admin.*`) (Super Admin only)
  - `getStats` - System-wide statistics
  - `getUsers` - List all users
  - `getOrganizations` - List all organizations
  - `getRevenue` - Revenue analytics

**RBAC Integration:**

All oRPC procedures automatically enforce RBAC through:
- Context-based authentication via Supabase
- Role-based authorization using `requireOrgRole`
- Organization-scoped data access
- Super admin privilege checks

**Error Handling:**

oRPC procedures return structured errors with:
- HTTP status codes
- Error messages
- Validation details (for input errors)
- Proper error logging

### 8. CRON Jobs & Maintenance

The project uses HTTP‑based CRON endpoints protected by `CRON_SECRET`:

- `/api/cron/notify` – renewal and credit exhaustion reminders
- `/api/cron/daily-maintenance` – refill & cleanup tasks

Generate a strong CRON secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set:

```bash
CRON_SECRET=your-generated-secret
```

#### 8.1 Local Testing

Notifications:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  http://localhost:3000/api/cron/notify
```

Daily maintenance:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  http://localhost:3000/api/cron/daily-maintenance
```

Expected behavior (example):

- Renewal reminder when `currentPeriodEnd` is 2 days away
- Credit exhaustion reminder when credits fall below a threshold and no reminder was sent
- Daily refill of free credits and cleanup of deleted orgs

#### 8.2 Vercel CRON Configuration

`vercel.json:1` includes:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-maintenance",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/notify",
      "schedule": "0 9 * * *"
    }
  ]
}
```

You can adjust the schedules as needed:

- `0 0 * * *` – every day at midnight
- `0 9 * * *` – every day at 9:00

### 9. Run the App

```bash
- pnpm run build
- You might need to run:
  - pnpm install prisma@7.1.0 @prisma/client@7.1.0 @prisma/adapter-pg@7.1.0

- pnpm run dev
```

Visit:

- `http://localhost:3000` – landing page / marketing
- `http://localhost:3000/get-started` – onboarding
- `http://localhost:3000/dashboard` – tenant dashboard
- `http://localhost:3000/admin` – super admin dashboard (for super admin emails)

---

## Role Based Access Control (RBAC)

### Roles

Defined in `lib/constants.ts:158`:

- `OWNER`
- `ADMIN`
- `MEMBER`

### High-level Rules

- `OWNER`
  - Full control of the organization
  - Can delete the organization
  - Can invite/remove members
  - Can transfer ownership

- `ADMIN`
  - Manages most org settings
  - Can invite/remove/update members (excluding owner)
  - Can create/update/delete projects
  - Cannot promote anyone to `OWNER` (must use transfer flow)

- `MEMBER`
  - Limited access
  - Typically can create/update projects they are involved with
  - Cannot change org settings or manage membership

### Enforcement Examples

- `updateMemberRoleAction` (`app/actions/organization.ts:68`)
  - Checks the caller is at least `ADMIN` via `requireOrgRole`
  - Prevents changes to `OWNER`
  - Prevents setting a member to `OWNER`

- `inviteMember` (`app/actions/organization.ts:122`)
  - Requires `ADMIN`
  - Applies rate limiting and pending invite caps

- `updateOrganizationNameAction` (`app/actions/organization.ts:527`)
  - Requires `ADMIN`

- `deleteProject` (`app/actions/project.ts:76`)
  - Resolves the project’s org
  - Requires `ADMIN`

### UI Behavior

- `MemberRoleSelect` (`app/(dashboard)/_components/member-role-select.tsx:21`)
  - Displays `OWNER` as read‑only text
  - Prevents users from editing their own role
  - Only `OWNER`/`ADMIN` see editable role selectors

These patterns ensure that server‑side checks and client‑side behavior stay in sync.

---

## Super Admin Mode

Super admin access is gated by the `SUPER_ADMIN_EMAILS` environment variable.

### Enabling Super Admin Access

1. Set:

```bash
SUPER_ADMIN_EMAILS=alice@example.com,bob@example.com
```

2. Ensure those emails exist as Supabase users and are also present in the `User` table.
3. When such a user logs in and visits `/admin`, they are allowed into the super admin area.
4. Non‑super‑admins visiting `/admin` are redirected back to `/dashboard`.

Logic is implemented in `app/(super-admin)/layout.tsx:1`.

### Super Admin Dashboard Capabilities

Components under `app/(super-admin)/_components` provide:

- Overview cards: total users, total organizations, active subscriptions
- Revenue analytics: aggregated MRR, total revenue, breakdown by plan
- User analytics: growth over time
- System status: database connectivity, latency, basic health
- Lists: users, organizations, subscriptions
- Actions:
  - Refresh data on demand
  - Export CSV snapshot of stats

Use this area for operational visibility and, if needed, for additional admin tooling.

---

## Testing Checklist

This section is updated to reflect RBAC and the Super Admin dashboard.

### Authentication & Onboarding

- [ ] Email provider configured in Supabase
- [ ] Google OAuth configured (client ID/secret set, redirect URIs added)
- [ ] Magic link sign‑in works locally
- [ ] Signup + confirm email flow works (if enabled)
- [ ] `/get-started` onboarding completes and redirects to `/dashboard`
- [ ] Logout clears session and redirects correctly

### Organizations, Projects & RBAC

- [ ] New users get a default organization and project (if applicable)
- [ ] Users can create additional organizations until `MAX_ORGANIZATIONS_PER_USER` is hit
- [ ] Users can create projects until `MAX_PROJECTS_PER_ORGANIZATION` is hit
- [ ] Invites:
  - [ ] Owners/Admins can invite members with different roles
  - [ ] Pending invite limit per org enforced (`MAX_PENDING_INVITES_PER_ORG`)
  - [ ] Disposable emails are rejected when `CHECK_DISPOSABLE_EMAILS` is enabled
- [ ] Role changes:
  - [ ] Only `OWNER`/`ADMIN` can change member roles
  - [ ] Owners cannot be modified via the role dropdown
  - [ ] Users cannot change their own roles
  - [ ] No path allows setting someone directly to `OWNER` except via ownership transfer (if implemented)
- [ ] Authorization:
  - [ ] `MEMBER` cannot access organization settings page
  - [ ] `MEMBER` cannot invite or remove members
  - [ ] `ADMIN` cannot delete organization (if that is reserved for `OWNER`)
  - [ ] Unauthorized access attempts surface clear errors (and do not leak data)

### Billing & Credits

- [ ] Stripe product and price exist, and `STRIPE_PRICE_ID` is set
- [ ] New subscriptions can be created and show up in Stripe dashboard
- [ ] Webhook events correctly update `Subscription` and `Organization` records
- [ ] Credits:
  - [ ] Credits increment on successful payments (if implemented)
  - [ ] Credit‑gated actions fail gracefully when out of credits
  - [ ] Daily maintenance job refills free credits as designed
- [ ] Renewal & credit reminder emails:
  - [ ] 2‑day renewal reminder sent when criteria match
  - [ ] Credit exhaustion reminder sent once per threshold

### Super Admin Dashboard

- [ ] `SUPER_ADMIN_EMAILS` set and matches at least one user email
- [ ] Super admin user can access `/admin`
- [ ] Non‑super‑admin users are redirected away from `/admin`
- [ ] Overview cards show realistic counts (users, orgs, revenue)
- [ ] Revenue and user analytics charts render without errors
- [ ] System status panel shows database as online and reasonable latency
- [ ] CSV export downloads with correct columns and values

### Security & RLS

- [ ] RLS enabled on all tenant tables (`User`, `Organization`, `OrganizationMember`, `Project`, `Subscription`, `OrganizationInvite`)
- [ ] A user cannot query organizations they are not a member of (tested via Supabase SQL editor)
- [ ] Service role key is only used on server‑side (e.g. API routes, cron jobs, webhooks)
- [ ] Environment variables are set correctly for production and are **not** exposed accidentally
- [ ] Rate limiting and abuse protections:
  - [ ] Invite rate limit enforced (time‑based)
  - [ ] Pending invite max enforced

### oRPC API & Type Safety

- [ ] oRPC API endpoints respond correctly at `/api/rpc/*`
- [ ] OpenAPI documentation accessible at `/api/docs`
- [ ] JSON schema available at `/api/openapi.json`
- [ ] Client-side oRPC calls work with React Query integration
- [ ] Server-side RSC client functions properly
- [ ] RBAC authorization enforced in oRPC procedures:
  - [ ] Organization-scoped data access
  - [ ] Role-based procedure access (OWNER/ADMIN/MEMBER)
  - [ ] Super admin procedures restricted properly
- [ ] Error handling returns structured responses
- [ ] Type safety maintained across client/server boundary
- [ ] All oRPC test suites pass:
  - [ ] Context and authentication tests
  - [ ] RBAC authorization tests
  - [ ] Router-specific tests (organization, project, user, admin)
  - [ ] Procedure and server tests

---

## Useful Commands

### General

- `pnpm install`        - Install
- `pnpm install prisma@7.1.0 @prisma/client@7.1.0 @prisma/adapter-pg@7.1.0`
- `pnpm run build`      – Build production assets
- `pnpm run dev`        – Start development server (Next.js + API routes)
- `pnpm run start`      – Start production server
- `pnpm run lint`       – Run ESLint
- `pnpm run type-check` - Run Type Check
- `pnpm run format`     – Format code with Prettier
- `pnpm test`           – Run all tests once
- `pnpm run test:watch` – Run tests in watch mode


### Testing

- `pnpm test` – Run all tests (including oRPC)
- `pnpm run test:watch` – Run tests in watch mode
- `pnpm test tests/orpc` – Run only oRPC tests
- `pnpm test tests/orpc/context.test.ts` – Test oRPC context
- `pnpm test tests/orpc/rbac.test.ts` – Test RBAC authorization
- `pnpm test tests/orpc/routers/` – Test specific routers
- `pnpm vitest run tests/integration`
- `pnpm vitest run tests/integration/calculate-api.test.ts`

**Update snapshots (only when you intentionally changed the golden output)**
- `pnpm vitest run tests/integration/calculate-orpc.golden-shape.test.ts -u`

### Prisma

- `pnpm prisma migrate dev --name <name>` – Create & apply new migration locally
- `pnpm prisma migrate deploy` – Apply migrations in production
- `pnpm prisma generate` – Regenerate Prisma client
- `pnpm prisma studio` – Visual DB browser
- `pnpm prisma migrate reset` – Reset local DB (drops data)

### Stripe (Local)

- `stripe login` – Authenticate Stripe CLI
- `stripe listen --forward-to localhost:3000/api/webhook/stripe` – Forward events to dev

### Supabase Quick Test

```bash
node -e "require('dotenv').config(); const { createClient } = require('@supabase/supabase-js'); const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); s.auth.getSession().then(console.log);"
```

### oRPC API Testing

```bash
# Test oRPC endpoint directly
curl -X POST http://localhost:3000/api/rpc/user.profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-session-token>"

# Test OpenAPI documentation
curl http://localhost:3000/api/openapi.json

# Run comprehensive oRPC test suite
pnpm test tests/orpc

# Test specific oRPC functionality
pnpm test tests/orpc/routers/organization.test.ts
```

---

## Deployment

Recommended platform: **Vercel**.

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Import the repo into Vercel.
3. In Vercel → Project Settings:
   - Add all environment variables from `.env`
   - Ensure `DATABASE_URL` and `DIRECT_URL` point to the **production** Supabase project
   - Set `STRIPE_WEBHOOK_SECRET` from Stripe’s **production** webhook
   - Configure `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` for production
   - Set `PRODUCTION_URL` (or equivalent) to your Vercel domain
   - Set `CRON_SECRET` and `SUPER_ADMIN_EMAILS`
4. Deploy.

After deploy:

- Run `pnpm prisma migrate deploy` against your production database (e.g. via Vercel CLI or a separate step).
- Re-test critical flows using the [Testing Checklist](#testing-checklist).

---

## Troubleshooting

### Auth Issues

- **Invalid redirect URL**
  - Check Supabase `Authentication → URL Configuration`
  - Ensure exact matches including protocol and trailing slash

- **Google OAuth errors**
  - Verify client ID/secret
  - Confirm redirect URI matches exactly:
    - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

- **Emails not sending**
  - Check Resend / SMTP provider logs
  - Verify API keys
  - Ensure rate limits are not exceeded
  - Confirm Supabase email templates are enabled

### RBAC / Permission Errors

- “Unauthorized” errors when performing org/project actions:
  - Ensure the user is a member of the organization
  - Confirm their role is high enough for the action
  - Check `requireOrgRole` usage in the relevant action

- Members seeing options they cannot use:
  - Review `MemberRoleSelect` and related UI
  - Ensure `can(role, action)` is used to gate destructive actions

### Super Admin

- `/admin` redirects to `/dashboard` unexpectedly:
  - Ensure logged-in user’s email is listed in `SUPER_ADMIN_EMAILS`
  - Confirm the email matches exactly (case and whitespace)

### Database & RLS

- Queries returning no data unexpectedly:
  - Inspect RLS policies in Supabase
  - Temporarily test with `service_role` key (in a safe, non-client context) to isolate policy issues

### oRPC API Issues

- **oRPC endpoints returning 404**
  - Ensure the API route is properly configured at `app/api/rpc/[[...rest]]/route.ts`
  - Check that the oRPC handler is correctly set up with the app router
  - Verify the endpoint path matches the router structure

- **Type errors with oRPC client**
  - Run `pnpm run build` to regenerate types
  - Ensure oRPC client is properly imported (`@/lib/orpc/client` or `@/lib/orpc/rsc-client`)
  - Check that procedures are properly defined in routers

- **Authorization errors in oRPC procedures**
  - Verify user is authenticated and session is valid
  - Check organization membership for org-scoped procedures
  - Ensure user has required role (OWNER/ADMIN/MEMBER) for the action
  - Review RBAC test failures for specific authorization logic

- **OpenAPI documentation not loading**
  - Check that `@orpc/openapi` is properly configured
  - Verify the OpenAPI route at `/api/openapi.json` returns valid JSON
  - Ensure Scalar API documentation is set up correctly

- **oRPC tests failing**
  - Run tests individually to isolate issues: `pnpm test tests/orpc/context.test.ts`
  - Check mock implementations match actual oRPC context structure
  - Verify test database setup and RLS policies
  - Review property-based test failures for edge cases

If you customize the schema or flows heavily, update this README to match your new behavior so that future you—and your team—always have a single, accurate source of truth.
