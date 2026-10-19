# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences, weighted equally:

- **Individual used-car buyers** vetting one specific listing before they commit time or money: before driving hours to see the car, paying for delivery, or booking a third-party inspection. They use the product occasionally, often under time pressure and with real money at stake, and they need plain language rather than raw data.
- **Flippers and brokers** triaging dozens of listings a week. They return often and need to screen out bad listings fast, compare signals across vehicles, and decide where to spend inspection time.

Secondary audiences (supported, not the design target today): small used-car lots scoring inventory risk, and franchise dealers. These map to the higher Core / Core Plus tiers and the API / white-label roadmap.

## Product Purpose

Auto VIN Scout turns a 17-character VIN into a probabilistic 0–100 risk report for a used vehicle. It tells a buyer what is likely wrong before they spend thousands on the wrong car. Each report states a composite score, a risk label, and the drivers behind it, and ends in concrete next steps: what to have a mechanic check, and what to say to the seller.

Success means the buyer either walks away from a bad car early or goes into the inspection and the negotiation knowing exactly what to probe.

## Positioning

Traditional history reports are static lookups against insurance and DMV records, so they miss anything never reported. Auto VIN Scout infers risk from publicly available signals instead: marketplace listing timelines, FEMA disaster declarations, NHTSA recalls and safety data, climate exposure, auction and salvage forensics, and owner-community failure patterns. Eight specialized risk agents score these signals and a synthesis step combines them. The product reports probability, not a binary clean/dirty verdict.

## Operating Context

- **Core flow:** enter a VIN → free NHTSA decode preview (make, model, year, engine, recall counts) → spend 1 credit to run the full pipeline → open the report.
- **Report surfaces:** Executive Overview (composite score, label, AI summary), Market Behavior (odometer chart, price chart, listing history), Valuation (AI price prediction), NHTSA Safety, Recalls, Powertrain badge, Seller Location Map, and Buyer Guidance with a copy-pasteable negotiation script.
- **Pipeline:** reports run asynchronously as a durable background job (Inngest), so the UI has pending, in-progress, completed, and degraded states. When an external source fails, the report still completes and keeps the missing data visible.
- **Workspace model:** organizations own credits, billing, projects, and reports. Members have OWNER / ADMIN / MEMBER roles. Reports are grouped into projects.
- **Account:** Supabase auth via magic link and Google OAuth. Stripe handles subscriptions and one-time credit packs.
- **Internal:** a super-admin area for organizations, users, subscriptions, and system status.

## Capabilities and Constraints

- **Risk vectors (8):** Baseline health & market anomalies (0.25), Safety ratings (0.05), Geospatial flood forensics (0.15), Powertrain complexity (0.10), Environmental corrosion (0.05), Theft & vandalism sentiment (0.05), Visual & auction forensics (0.20), Reliability & social proof (0.15). Composite = Σ score × weight, capped at 100.
- **Score bands:** 0–30 Low, 31–70 Medium, 71–100 High. This terminology is canonical.
- **Credits:** one full report costs one credit. A new account's first organization receives 1 signup credit (`CREDITS_SIGNUP_BONUS`); beyond that, the free tier gets the decode preview and search history.
- **Public decode:** signed-out visitors can decode a VIN on the marketing home page (`vin.preview`: NHTSA vPIC identity plus the model-year recall count, rate-limited per IP). No risk score is shown without a full report.
- **Surfaces:** marketing site (home, about, FAQs, contact, get-started, legal), authenticated dashboard, super-admin.
- **Themes:** light and dark are both supported.
- **Stage:** pre-launch, heading to paying customers. Stripe runs in sandbox.
- **Open / undecided:**
  - Pricing tiers and amounts are placeholders. Do not present them as final.
  - PDF export is in progress.
- **Roadmap, not shipped:** NMVTIS title brands, NICB theft and salvage signals, verified odometer readings, depreciation analytics, a public API, and white-label dealer workflows. Never present these as current capabilities.

## Brand Commitments

- **Name:** Auto VIN Scout.
- **Logos:** `public/autovinscout-logo-light*.png` and `public/autovinscout-logo-dark*.png`.
- **Tagline in use:** "AI Risk Intelligence for Used-Car Buyers."
- **Voice:** plain-language and honest about uncertainty. The product says "likely" and "probable", never "guaranteed". It keeps missing data visible rather than implying completeness.

## Evidence on Hand

- **Real sample reports** may be shown as product demonstrations. The demo VINs are listed in README.md ("VINs to Try").
- **Dashboard screenshots:** `public/dashboard-01.png` through `public/dashboard-04.png`.
- **Landing captures:** `public/HeroDark-*.png` and `public/HeroLight-*`.
- **Absent, must not be fabricated:** testimonials, customer names or logos, usage or accuracy metrics, and report counts. `public/companies/` holds tech-stack logos (Next.js, Supabase, Prisma, …), not customers. Never present them as social proof.
- **Not cleared for public use:** naming competitors (CARFAX, AutoCheck) in comparisons. Ask before using them in public-facing copy.

## Product Principles

1. **Probability, not verdicts.** Every score explains its drivers and confidence. The product never implies a car is certified clean.
2. **Show the gaps.** When a source fails or data is thin, say so in the report instead of hiding it. Trust comes from honesty about what is unknown.
3. **Value before commitment.** The buyer should learn something useful before spending a credit, a drive, or an inspection fee. The free preview has to earn the paid report.
4. **Every risk ends in an action.** Findings turn into inspection questions and negotiation lines, not just numbers.
5. **Readable once, scannable at volume.** The same report must reassure a first-time buyer and let a flipper triage a dozen VINs quickly.
