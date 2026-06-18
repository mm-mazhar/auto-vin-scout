<p align="center">
  <img src="public/autovinscout-logo-dark-01.png" alt="Auto VIN Scout" width="280" />
</p>

<h3 align="center">AI Risk Intelligence for Used-Car Buyers</h3>

<p align="center">
  Enter a VIN. Get a probabilistic risk report that tells you what CARFAX won't.<br/>
  Odometer forensics · Flood exposure · Salvage detection · Engine failure prediction · Price valuation · Negotiation scripts.
</p>

<p align="center">
  <img src="public/HeroDark-05.png" alt="Auto VIN Scout — Landing Page" width="100%" />
</p>

---

## What is Auto VIN Scout?

Auto VIN Scout is an AI-powered vehicle risk intelligence platform. It replaces expensive, static history reports (CARFAX, Experian) with **probabilistic risk modeling** — a multi-agent system that cross-references federal safety data, marketplace listing timelines, climate exposure, and real-world failure patterns to produce a single 0–100 risk score for any used vehicle.

The core insight: the most valuable vehicle data (DMV registrations, insurance claims) is locked behind federal laws and expensive paywalls. Auto VIN Scout sidesteps this by inferring risk from publicly available signals — marketplace behavior, FEMA disaster declarations, NHTSA recalls, auction forensics, and owner community sentiment — then synthesizes it into actionable intelligence with AI-generated negotiation scripts.

**Who it's for:**
- Individual buyers who want to know what's wrong before they drive 3 hours to see a car
- Flippers and brokers triaging dozens of listings per week
- Small used-car lots scoring inventory risk at scale
- Franchise dealers running predictive depreciation and title verification

---

## How It Works

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────────────┐
│  User enters│───▶│  VIN Decode       │──▶ │  Inngest Durable Pipeline       │
│  a VIN      │     │  (NHTSA + MCK)   │     │                                 │
└─────────────┘     └──────────────────┘     │  1. Verify Vehicle              │
                                             │  2. Fetch NHTSA Recalls         │
                                             │  3. Fetch Market History (MCK)  │
                                             │  4. Fetch Safety Ratings (NCAP) │
                                             │  5. Fetch Flood/Weather Data    │
                                             │  6. Fetch OSINT Signals         │
                                             │  7. Fetch Price Prediction Data │
                                             │  8. Run Risk Orchestrator       │
                                             │     ├─ 8 Risk Agents (parallel) │
                                             │     └─ Master LLM Synthesis     │
                                             └────────────────┬────────────────┘
                                                              │
                                                              ▼
                                             ┌─────────────────────────────────┐
                                             │  Risk Report (0–100)            │
                                             │  • Executive Summary            │
                                             │  • 8-Vector Breakdown           │
                                             │  • AI Negotiation Script        │
                                             └─────────────────────────────────┘
```

1. **VIN Decode** — Decodes the 17-character VIN via NHTSA vPIC (free tier) or MarketCheck (paid tier) to extract make, model, year, engine code, drivetrain, and manufacturing plant.

2. **Durable Pipeline** — An Inngest function orchestrates the data collection steps with retry logic, concurrency limits (1 per org), and graceful degradation if any external API fails.

3. **Multi-Agent Risk Scoring** — Eight specialized AI agents each score a risk vector (0–100), then a Master LLM synthesizes the results into a human-readable executive summary and a seller negotiation script.

---

## VINs to Try

```
5NPE24AFXJH673456
1N4AL3AP2FC260308
2C4RDGCG4GR169421
5YFBPRBE3LP067431  
5J6RM4H52EL066598
```

---

## Risk Vectors

Each report scores the vehicle across 8 independent risk dimensions. Mileage acts as the "Exposure Duration" multiplier across all factors.

| # | Vector | What It Detects | Weight |
|---|--------|-----------------|--------|
| 0 | **Baseline Health & Market Anomalies** | Odometer rollbacks, fire-sale pricing, mileage velocity, open recalls | 0.25 |
| 1 | **Safety Ratings & Crash Survivability** | NHTSA 5-star ratings, IIHS scores, ADAS features | 0.05 |
| 2 | **Geospatial Flood Forensics** | FEMA disaster overlap, listing-timeline intersection, submersion probability with Open Meteo | 0.15 |
| 3 | **Powertrain Complexity** | Engine architecture vs. mileage lifecycle ("The Hump" detection) | 0.10 |
| 4 | **Environmental Corrosion** | Salt Belt / Sun Belt / Coastal cumulative stress | 0.05 |
| 5 | **Theft & Vandalism Sentiment** | Model vulnerability + real-time regional OSINT from Reddit/Nextdoor | 0.05 |
| 6 | **Visual & Auction Forensics** | Salvage yard photos, Copart/IAAI watermarks, "Parts Only" listings | 0.20 |
| 7 | **Reliability & Social Proof** | Recurring mechanical failures from enthusiast communities, Mostly Reddit | 0.15 |

**Composite Score** = Σ (Score × Weight), capped at 100.

| Range | Label | Meaning |
|-------|-------|---------|
| 🟢 0–30 | Low | Standard wear. Mileage matches age. No disaster overlap. |
| 🟡 31–70 | Medium | High usage intensity. Noted concerns. Buyer caution advised. |
| 🔴 71–100 | High | Major red flag. Odometer discrepancy. Probable hidden damage. |

---

## Dashboard Features

<p align="center">
  <img src="public/dashboard-01.png" alt="Dashboard — Risk Report Overview" width="100%" />
</p>

### VIN Decode & Report Creation
Enter a VIN from the dashboard. Free-tier users get an instant NHTSA decode preview (make, model, year, engine specs). Paid users trigger the full risk pipeline.

### Executive Overview
The report landing tab shows the composite risk score, risk label badge, and an AI-generated executive summary that explains the findings in plain language.

### Market Behavior Analysis
- **Odometer Chart** — Chronological mileage snapshots from marketplace listings. Detects rollbacks (newer listing with fewer miles) and calculates miles/year velocity.
- **Price Chart** — Historical asking prices vs. MSRP. Flags "fire sales" (sudden drops >25% below market).
- **Listing History Table** — Every marketplace appearance with seller type, location, days-on-market, and certification status.

### Price Prediction & Valuation
AI-powered market valuation using real-time Bright Data SERP API (AI Overviews, Featured Snippets, and organic results). The raw data is formatted by an LLM into a professional Markdown report with expected price ranges, factors affecting value, and a summary — rendered in a dedicated "Valuation" tab.

### NHTSA Safety Tab
5-star crash test ratings (frontal, side, rollover), ADAS feature availability, and complaint/investigation counts pulled from the NCAP database.

### Recalls Section
Active and historical recalls with component, consequence, remedy, and Park-It/Park-Outside urgency flags.

### Powertrain Badge
Visual indicator of engine complexity (NA, Turbo, Hybrid, EV) with a maintenance liability assessment based on current mileage vs. known failure windows.

### Seller Location Map
US state-level visualization of where the vehicle has been listed over its lifetime. Highlights Salt Belt, Sun Belt, and flood-prone regions.

### Buyer Guidance & Negotiation Script
AI-generated talking points tailored to the specific risks found. Designed to be copy-pasted into a text message to the seller.

<p align="center">
  <img src="public/dashboard-03.png" alt="Dashboard — Market Behavior & Negotiation" width="100%" />
</p>

<p align="center">
  <img src="public/dashboard-04.png" alt="Dashboard — Market Behavior & Negotiation" width="100%" />
</p>

### Organization & Team Management
Multi-tenant workspace with projects, team invites, and role-based access (Owner → Admin → Member). Each org has its own credit balance and billing.

### Billing & Credits
Credit-based system. Each full report costs 1 credit. Manage subscriptions, view usage, and purchase additional credits through the Stripe-powered billing portal.

---

## Pricing (These are just random, but payment backed by `Stripe`)

To run **probabilistic risk modeling** consumer must have credits and buy credits you can use globally know test card. Everything from stripe is running in SandBox, so no charges will be applied

```
Card: 4242 4242 4242 4242
For other fields you can enter anything
e.g. Month/Year: 02/30, CCV: 123, Name on Card: John Doe 
```

| Plan | Price | Credits | Target User |
|------|-------|---------|-------------|
| **Free** | $0 | 0 | Account creation, search history |
| **Basic Report** | $29.99 one-time | 3 | Individual buyers doing a few checks |
| **Pro** | $59.99/mo | 10 | Power buyers and flippers |
| **Core** | $199.99/mo | 100 | Small used-car lots |
| **Core Plus** | $499.99/mo | 200 | Franchise dealers, full predictive engine |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript (strict) |
| Auth | Supabase Auth (magic links + Google OAuth) |
| Database | Supabase PostgreSQL + Prisma ORM |
| API | oRPC (type-safe RPC with auto-generated OpenAPI spec) |
| Background Jobs | Inngest (durable, retryable step functions) |
| AI / LLM | OpenRouter (primary) + Google GenAI (fallback) |
| Payments | Stripe (subscriptions + one-time purchases) |
| Email | Resend (transactional) |
| UI | Tailwind CSS 4 + shadcn/ui + Radix primitives |
| Charts | Recharts |
| Animations | Framer Motion |
| Data Fetching | TanStack Query + oRPC React Query integration |
| Testing | Vitest + fast-check (property-based) |
| Deployment | Vercel (with CRON jobs) |

### External Data Sources

| Source | Purpose | Tier |
|--------|---------|------|
| NHTSA vPIC | VIN decode (make, model, engine specs) | Free |
| NHTSA Recalls API | Open recall campaigns | Free |
| NHTSA NCAP | 5-star safety ratings, crash test data | Free |
| MarketCheck | Premium VIN decode + listing history | Paid |
| FEMA Open Data | Disaster declarations for flood risk | Free |
| Open-Meteo | Historical precipitation verification | Free |
| Bright Data SERP API | Theft sentiment, regional crime OSINT, price prediction, auction/marketplace forensics | Paid |
| Bright Data Social Scrapers ("Reddit- Posts" API ) | Reddit/forum reliability sentiment | Paid |
| Bright Data SERP API | Auction/marketplace forensics | Paid |
| Bright Data SERP API w/ Multimodal LLM | Visual salvage yard / wreck detection | Paid |

---

## Architecture

### Multi-Agent Risk Engine

The risk scoring system uses a **multi-agent architecture** where each agent is a stateless function that receives vehicle data and returns a scored vector:

```
RiskEngineOrchestrator.run(reportId)
  │
  ├── BaselineAgent       → Odometer anomalies, price volatility, recall severity
  ├── SafetyAgent         → NHTSA NCAP ratings, ADAS features, complaints/investigations
  ├── EngineAgent         → Powertrain complexity vs. mileage lifecycle ("The Hump" detection)
  ├── CorrosionAgent      → Salt Belt / Sun Belt / Coastal cumulative stress
  ├── FloodAgent          → FEMA disaster matching + Open-Meteo precipitation intersection
  ├── TheftAgent          → SERP-based regional theft OSINT (Bright Data SERP API)
  ├── ForensicsAgent      → Multimodal visual salvage detection + auction URL forensics (Bright Data SERP + LLM vision)
  ├── ValuationAgent      → (orchestrator method, not a standalone agent) → Real-time price prediction via Bright Data SERP + LLM
  ├── ReliabilityAgent    → Reddit failure sentiment (Bright Data, Reddit-Comments API)
  │
  └── Master LLM Synthesis
        ├── Executive Summary (plain-language risk explanation)
        └── Negotiation Script (seller-facing talking points)
```

Each agent produces a `RiskVectorResult` with a score (0–100), label, weight, narrative, and metadata. The orchestrator computes the weighted composite, then invokes a Master LLM (OpenRouter → Google GenAI fallback) to synthesize all narratives into a cohesive report.

If the LLM fails, a rules-based fallback generates the summary from agent findings — the report always completes.

### Visual & Auction Forensics Agent

The Forensics Agent detects **title washing** and unreported total-loss events by searching Google for the exact VIN and analyzing what comes back — both textually and visually.

**Flow:**

1. **SERP Fetch** — `SerpService.fetchVinSearch(vin)` queries Bright Data for the exact VIN (excluding social media noise). Returns organic URLs, text snippets, and up to 2 image/thumbnail URLs from the results.

2. **Heuristic Scoring** — A deterministic URL + text matrix runs first (no LLM cost):
   - *Severe URLs* (score 100): If any organic link contains a known salvage auction domain (copart.com, iaai.com, bidfax.info, bid.cars, etc.)
   - *Moderate Text* (score 55): If snippets contain keywords like "salvage", "rebuilt", "as-is", "parts only", "mechanic special"
   - *Clean* (score 15): No matches

3. **Image Fetching** — Up to 2 image URLs are fetched in parallel with a strict 3-second timeout each, converted to base64. Dead links are silently skipped.

4. **Multimodal LLM Analysis** — The text prompt (URLs, snippets, heuristic score) plus any fetched images are sent to the LLM. Both the primary (OpenRouter/Gemini) and fallback (Google GenAI) providers receive images as inline data, enabling visual wreck detection (crushed panels, salvage yard backgrounds, auction watermarks).

5. **Fallback** — If all LLMs fail, a deterministic narrative is returned based on the heuristic tier. The pipeline never crashes.

**Caveat:** Image availability depends entirely on what Google returns in the SERP thumbnails for that VIN. Many results won't have images — in that case the agent operates text-only and still provides value from URL/snippet analysis.

### Inngest Pipeline

The analysis runs as a durable Inngest function (analyze-report) with checkpointed steps. Each agent gets its own Vercel invocation and timeout budget.

```
verify-vehicle → fetch-recalls → upsert-recalls → fetch-market-history
→ fetch-safety-ratings → load-agent-input → fetch-agent-deps
→ [agents in parallel] → persist-results → [synthesis + price-prediction in parallel] → finalize-report
```

1. `verify-vehicle` — Confirms the vehicle record exists (retries with exponential backoff for transaction isolation)
2. `fetch-recalls` — Pulls NHTSA recall data
3. `upsert-recalls` — Persists recalls to DB (skipped if none found)
4. `fetch-market-history` — Fetches MarketCheck listing history (graceful degradation — logs warning and continues with empty history on failure)
5. `fetch-safety-ratings` — Fetches NHTSA NCAP data
6. `load-agent-input` — Loads full AgentInput from DB (vehicle + recalls + listings + safety ratings persisted in prior steps)
7. `fetch-agent-deps` — Fetches external dependencies in parallel: Open-Meteo weather, SERP theft snippets, SERP VIN search
8. **Agents (parallel)** — All 8 agents execute concurrently as separate steps: `agent-baseline`, `agent-safety`, `agent-engine`, `agent-corrosion`, `agent-flood`, `agent-theft`, `agent-forensics`, `agent-reliability`
9. `persist-results` — Writes all RiskVectorResults to DB
10. **Synthesis + Valuation (parallel)** — `master-synthesis` (weighted composite + Master LLM) and `price-prediction` (SERP + LLM formatting) run concurrently
11. `finalize-report` — Updates the Report record with final score, label, narratives, and price prediction; sets status to `COMPLETED`

Concurrency is limited to 1 per organization (`concurrency: { limit: 1, key: 'event.data.orgId' }`) to prevent credit race conditions. Retries are set to 0 — each agent handles primary → fallback LLM internally.

### Multi-Tenancy

- **User** → identified by Supabase Auth UUID
- **Organization** → owns billing (Stripe customer), credits, projects, and reports
- **OrganizationMember** → junction with role (OWNER / ADMIN / MEMBER)
- **Project** → logical grouping of reports within an org
- **Report** → one VIN analysis, linked to a Vehicle record

Row Level Security (RLS) policies enforce tenant isolation at the database level.

### RBAC

| Role | Capabilities |
|------|-------------|
| **OWNER** | Full control. Delete org, transfer ownership, manage billing. |
| **ADMIN** | Manage members, create/delete projects, invite users. |
| **MEMBER** | Create reports, view project data. Cannot manage org settings. |

Enforced server-side via `requireOrgRole()` guards and client-side via `can(role, action)` permission checks.

### Super Admin Dashboard

A separate, email-gated admin area (`/admin`) provides system-wide operational visibility — completely isolated from tenant dashboards.

<p align="center">
  <img src="public/HeroDark-04.png" alt="Super Admin Dashboard — System Analytics" width="100%" />
</p>

Access is controlled via the `SUPER_ADMIN_EMAILS` environment variable. Non-admin users are redirected to `/dashboard`.

**Capabilities:**
- **Overview cards** — Total users, organizations, active subscriptions, MRR at a glance
- **Revenue analytics** — Aggregated monthly recurring revenue, breakdown by plan tier, growth trends
- **User analytics** — Signup velocity, retention curves, active user counts over time
- **System status** — Database connectivity, latency monitoring, health checks
- **Entity management** — Browse all users, organizations, and subscriptions across the platform
- **CSV export** — Download snapshots of system-wide statistics for offline analysis

This is designed for operators who need to monitor the business without touching tenant data directly.

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Supabase project (Auth + PostgreSQL)
- Stripe account (test mode)

### Quick Start

```bash
git clone <your-repo-url> autovinscout
cd autovinscout
pnpm install

# Copy environment template
cp .env.example .env
# Fill in Supabase, Stripe, and API keys

# Database setup
pnpm prisma migrate dev --name init
pnpm prisma generate

# Run
pnpm run dev
```

Visit `http://localhost:3000`.

### Environment Variables

See `.env.example` for the full list. Key groups:

- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`
- **Stripe**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_*`, `STRIPE_WEBHOOK_SECRET`
- **AI**: `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`
- **Data**: `PREMIUM_VIN_PROVIDER`, `PREMIUM_VIN_API_KEY`
- **App**: `NEXT_PUBLIC_APP_URL`, `SUPER_ADMIN_EMAILS`, `CRON_SECRET`

---

## Development

```bash
pnpm run dev          # Start dev server (Turbopack)
pnpm run build        # Production build
pnpm run lint         # ESLint
pnpm run type-check   # TypeScript strict check
pnpm test             # Run all tests
pnpm test tests/orpc  # Run oRPC API tests only
```

### Stripe Local Webhooks

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

### Prisma

```bash
pnpm prisma migrate dev --name <name>   # New migration
pnpm prisma generate                     # Regenerate client
pnpm prisma studio                       # Visual DB browser
```

### Inngest Dev Server

The Inngest dev server runs alongside `pnpm run dev` for local function testing and debugging.

---

## API

The oRPC layer provides a type-safe API with auto-generated OpenAPI documentation:

- **OpenAPI Spec**: `/api/openapi.json`
- **API Docs** (Scalar): `/docs/api`

### Routers

| Router | Endpoints | Auth |
|--------|-----------|------|
| `organization.*` | list, create, update, delete, getMembers, inviteMember, updateMemberRole, removeMember | Authenticated |
| `project.*` | list, create, update, delete | Org member |
| `user.*` | profile, updateProfile, preferences, updatePreferences | Authenticated |
| `billing.*` | getSubscription, createCheckoutSession, getUsage | Org member |
| `vin.*` | decode, createReport, getReport | Org member + credits |
| `admin.*` | getStats, getUsers, getOrganizations, getRevenue | Super Admin |

---

## Deployment

Recommended: **Vercel**.

1. Push to GitHub
2. Import into Vercel
3. Set all environment variables
4. Deploy

CRON jobs are configured in `vercel.json`:
- `/api/cron/daily-maintenance` — midnight daily (credit refills, soft-delete cleanup)
- `/api/cron/notify` — 9 AM daily (renewal reminders, credit exhaustion alerts)

Post-deploy: run `pnpm prisma migrate deploy` against production.

---

## Project Structure

```
app/
├── (marketing)/          # Landing page, pricing, public pages
├── (dashboard)/          # Authenticated tenant dashboard
│   └── dashboard/
│       ├── reports/      # VIN reports list and detail views
│       ├── billing/      # Subscription and credit management
│       └── settings/     # Org settings, members, invites
├── (super-admin)/        # System-wide analytics (email-gated)
├── api/
│   ├── rpc/              # oRPC HTTP handler
│   ├── webhook/stripe/   # Stripe webhook endpoint
│   ├── cron/             # Scheduled maintenance jobs
│   └── inngest/          # Inngest function handler
lib/
├── services/
│   ├── risk-engine/      # Multi-agent orchestrator + individual agents
│   ├── vin-decoder.ts    # NHTSA + MarketCheck decode logic
│   ├── nhtsa-recalls.ts  # Recall fetching and persistence
│   ├── marketcheck-*     # MarketCheck API integration
│   └── nhtsa-ncap-*      # Safety rating service
├── orpc/                 # oRPC routers, procedures, client config
├── inngest/              # Inngest client + durable functions
├── auth/                 # Guards, permissions, RBAC helpers
└── constants.ts          # Branding, pricing, limits, config
prisma/
└── schema.prisma         # Full data model
```

---

## The Competitive Edge

Traditional VIN reports (CARFAX, AutoCheck) are **static lookups** against insurance/DMV databases. They cost $40+ per report and miss anything unreported.

Auto VIN Scout is different:

| | CARFAX | Auto VIN Scout |
|---|--------|---------------|
| Data source | Insurance claims, DMV records | Marketplace behavior, federal APIs, OSINT, AI inference |
| Odometer fraud | Only if reported to DMV | Detected via listing timeline forensics |
| Flood damage | Only if insurance claim filed | Inferred from FEMA + Open-Meteo precipitation + listing geography |
| Salvage/wreck | Only if title branded | Multimodal AI visual detection (auction photos, watermarks) |
| Engine risk | Not assessed | Predicted from powertrain architecture + mileage |
| Corrosion | Not assessed | Calculated from lifetime location trail (using listings)|
| Theft risk | Not assessed | Real-time OSINT from Reddit/Nextdoor sentiment (via Bright Data SERP) |
| Reliability | Not assessed | Extracted from enthusiast community failure patterns (via Bright Data Datasets API — Reddit) |
| Price prediction | Static book value | Real-time SERP-powered AI valuation with market context |
| Output | Static PDF | Interactive report + AI negotiation script |
| Cost (to be revised) | $40–$100/report | From $10/report (Basic tier) | 

The system doesn't claim certainty — it reports **probability**. This is both more honest and more legally defensible than binary "clean/dirty" labels.

---

## TO DO:
  - Logging
  - PDF Print
  - Super Admin Dashboard:
    - Agents Monitoring and Evaluation
    - Agents and other services costs
    - Stripe's remaining integration
  - Improvements to be made:
    - Introduce Checker Agent to check the output of each agent. Or get feedback from other agents e.g. Flood Agent might miss, but if vehicle appears in via "Water/Flood" damage via "Visual & Auction Forensics" agent then we need to update the flood agent based on findings of other agent/s, or owners complains over reddit not backed by powertrain and engine complexity agent.
  - API First Platform

## License

Proprietary. All rights reserved.
