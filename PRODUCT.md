# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary today: **individual used-car buyers** and **flippers / brokers**.

- Individual buyers check one or a few specific listings before committing time or money, typically before driving out to see a car or before talking price with a seller.
- Flippers and brokers triage many listings a week and need a fast read on which ones are worth pursuing.

Growth path: **small used-car lots, then franchise dealers**, scoring inventory risk at volume. Design for buyers now; keep the account model (organizations, projects, team roles, high-credit plans) ready for dealers later, without letting dealer needs lead current decisions.

## Product Purpose

AutoVINScout turns a 17-character VIN into a probabilistic used-car risk report: a single 0–100 composite score, an eight-vector breakdown, a plain-language executive summary, and a negotiation script the buyer can text or say to the seller.

It exists because the most valuable vehicle records (DMV registrations, insurance claims) are locked behind law and expensive paywalls, while static history reports leave buyers guessing. Success means a buyer knows what to worry about, and what to say, before they spend a trip or a deposit on the wrong car.

## Positioning

AutoVINScout infers risk from public and marketplace signals rather than reselling official records. Eight specialized agents score separate risk vectors in parallel, and a synthesis step explains the result and turns it into negotiation leverage:

| Vector | Weight |
|---|---|
| Baseline health and market anomalies (odometer rollback, fire-sale pricing, mileage velocity, open recalls) | 0.25 |
| Visual and auction forensics (salvage auction hits, wreck imagery, "parts only" listings) | 0.20 |
| Geospatial flood forensics (FEMA disasters intersected with listing timeline and precipitation) | 0.15 |
| Reliability and social proof (recurring failures from owner communities) | 0.15 |
| Powertrain complexity vs. mileage lifecycle | 0.10 |
| Safety ratings and crash survivability | 0.05 |
| Environmental corrosion (Salt Belt, Sun Belt, coastal) | 0.05 |
| Theft and vandalism sentiment | 0.05 |

Score bands: 0–30 Low, 31–70 Medium, 71–100 High.

The claim is "what to suspect and why", with evidence attached. It is **not** an official title or odometer record.

## Operating Context

- The buyer usually arrives holding a specific listing and its VIN, often on a phone.
- Free accounts get an instant NHTSA decode preview; a full report costs one credit and runs as a background pipeline that takes time to complete, so the report has a pending state.
- The finished report is read in tabs: executive overview, market behavior (odometer and price charts, listing history), valuation, NHTSA safety, recalls, powertrain, seller-location map, buyer guidance and negotiation script.
- The negotiation script is meant to be copied into a text message to the seller.
- Accounts are multi-tenant: organizations own credits and billing, contain projects, and group reports. Roles are Owner, Admin, Member.

## Capabilities and Constraints

- Data sources: NHTSA vPIC, Recalls and NCAP; MarketCheck (decode and listing history); FEMA Open Data; Open-Meteo; Bright Data SERP and social scrapers; LLM synthesis via OpenRouter with Google GenAI fallback.
- Every report completes. When an external source or LLM fails, the pipeline degrades to rules-based output rather than erroring, so surfaces must handle partial or fallback data honestly.
- Image-based forensics depends on what search results return; many reports run text-only.
- Pricing (current, from `lib/constants.ts`): Free $0 (account and search history), Basic $9.99 one-time (3 credits), Pro $19.99/mo (10 credits), Core $199.99/mo (100 credits). Core Plus ($499.99/mo, 200 credits) exists but is hidden from all UI. New signups get 1 free report. The README pricing table is outdated.
- Stripe currently runs in sandbox; the product is heading to a real commercial launch.
- Limits: up to 5 projects and 5 members per organization, 3 pending invites.
- US-only market (US states, NHTSA, FEMA, USD, en_US).
- Undecided / roadmap only, not shipped: NMVTIS official title brands, NICB-style theft confirmation, verified odometer readings, depreciation forecasts, dealer white-label workflows, public API.

## Brand Commitments

- Name: **AutoVINScout** (also written "Auto VIN Scout"). Logo files in `public/` (`autovinscout-logo-light*.png`, `autovinscout-logo-dark*.png`) and favicons.
- Tagline: "AI Risk Intelligence for smarter used-car buying."
- Voice: plain language for buyers; specific, citing real data points; negotiation advice is conversational and non-confrontational. Never invent risks the data does not support.

## Evidence on Hand

- Customer testimonials in `lib/constants.ts` (`TESTIMONIALS`): confirmed real by the owner.
- Product screenshots: `public/dashboard-01..04.png`, `public/HeroDark-02..05.png`.
- Sample VINs that produce reports: listed in `README.md` under "VINs to Try".
- Contact details and social handles: the owner confirms real ones exist, but the values currently in `lib/constants.ts` are placeholders (`mail@example.com`, `@yourdomain`, `+1 xxx xxxx`, a museum street address). Do not display these until the real values replace them.
- Absent, must not be fabricated: customer or report counts, accuracy or benchmark figures, press mentions, partner logos, and any claim of official title, DMV or insurance-record access.

## Product Principles

1. **Evidence before verdict.** Every score shows the signals behind it, so a buyer can judge the claim, not just trust the number.
2. **Honest about what it is.** Probabilistic inference from public signals, never presented as an official history report; fallback and missing data are labeled, not hidden.
3. **Decision in one sitting.** A buyer standing at a listing should get to "skip it", "go see it" or "here is what to ask" without reading everything.
4. **Leverage, not alarm.** Findings turn into calm, specific talking points the buyer can use with a seller.
5. **Buyers first, dealer-ready.** Build for the individual and the flipper; keep organizations, volume and team features working without letting them complicate the buyer path.
