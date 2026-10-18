---
name: Auto VIN Scout
description: AI risk intelligence for used-car buyers, laid out like a well-lit inspection bay.
colors:
  bay-light-emerald: "oklch(0.696 0.17 162.48)"
  mint-white: "oklch(0.982 0.018 155.826)"
  focus-emerald: "oklch(0.527 0.154 150.069)"
  shop-floor: "oklch(0.141 0.005 285.823)"
  bench: "oklch(0.21 0.006 285.885)"
  toolbox: "oklch(0.274 0.006 286.033)"
  work-light-white: "oklch(0.985 0 0)"
  stencil-gray: "oklch(0.705 0.015 286.067)"
  bay-hairline: "oklch(1 0 0 / 10%)"
  field-edge: "oklch(1 0 0 / 15%)"
  fault-red: "oklch(0.704 0.191 22.216)"
  risk-low: "oklch(0.696 0.17 162.48)"
  risk-medium: "oklch(0.6 0.189 55)"
  risk-high: "oklch(0.577 0.245 27.325)"
  chart-blue: "oklch(0.488 0.243 264.376)"
  chart-emerald: "oklch(0.696 0.17 162.48)"
  chart-amber: "oklch(0.769 0.188 70.08)"
  chart-violet: "oklch(0.627 0.265 303.9)"
  chart-rose: "oklch(0.645 0.246 16.439)"
  bay-light-emerald-day: "oklch(72.887% 0.21192 147.841)"
  emerald-ink-day: "oklch(0.393 0.095 152.535)"
  shop-floor-day: "oklch(1 0 0)"
  toolbox-day: "oklch(0.967 0.001 286.375)"
  ink-day: "oklch(14.077% 0.0044 285.776)"
  stencil-gray-day: "oklch(0.552 0.016 285.938)"
  bay-hairline-day: "oklch(0.92 0.004 286.32)"
  fault-red-day: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  body-marketing:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "0.05em"
  button:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
rounded:
  sm: "calc(0.65rem - 4px)"
  md: "calc(0.65rem - 2px)"
  lg: "0.65rem"
  xl: "calc(0.65rem + 4px)"
  2xl: "calc(0.65rem + 8px)"
  full: "9999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "6": "1.5rem"
  "8": "2rem"
components:
  button-primary:
    backgroundColor: "{colors.bay-light-emerald}"
    textColor: "{colors.mint-white}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-primary-hover:
    backgroundColor: "oklch(0.696 0.17 162.48 / 0.9)"
  button-outline:
    backgroundColor: "oklch(1 0 0 / 4.5%)"
    textColor: "{colors.work-light-white}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-outline-hover:
    backgroundColor: "oklch(1 0 0 / 7.5%)"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.work-light-white}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-ghost-hover:
    backgroundColor: "oklch(0.274 0.006 286.033 / 0.5)"
  card:
    backgroundColor: "{colors.bench}"
    textColor: "{colors.work-light-white}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  kpi-tile:
    backgroundColor: "{colors.bench}"
    textColor: "{colors.work-light-white}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  input:
    backgroundColor: "oklch(1 0 0 / 4.5%)"
    textColor: "{colors.work-light-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.75rem"
    height: "2.25rem"
  tabs-list:
    backgroundColor: "{colors.toolbox}"
    textColor: "{colors.stencil-gray}"
    rounded: "{rounded.lg}"
    padding: "3px"
    height: "2.25rem"
  tabs-trigger-active:
    backgroundColor: "oklch(1 0 0 / 4.5%)"
    textColor: "{colors.work-light-white}"
    rounded: "{rounded.md}"
  badge:
    backgroundColor: "{colors.bay-light-emerald}"
    textColor: "{colors.mint-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.125rem 0.5rem"
  risk-pill-low:
    backgroundColor: "{colors.risk-low}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.5rem"
  risk-pill-medium:
    backgroundColor: "{colors.risk-medium}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.5rem"
  risk-pill-high:
    backgroundColor: "{colors.risk-high}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.5rem"
  chip-glass:
    backgroundColor: "oklch(0.141 0.005 285.823 / 0.7)"
    textColor: "{colors.stencil-gray}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0.5rem 0.75rem"
---

# Design System: Auto VIN Scout

## Overview

**Creative North Star: "The Inspection Bay"**

Auto VIN Scout looks like a well-lit, methodical workshop. Every finding is laid out, labeled, and inspected under good light. The bay itself is dark and quiet: cool near-black floors, benches one tonal step up, and hairline edges instead of heavy frames. That keeps attention on what sits on the bench: a score, a reading, a flagged anomaly. The one work-light color, Bay Light Emerald, marks the active and the cleared. Amber and red show up only when a risk earns them.

The system is dense by design. The root font size is 14px, so every rem-based measure (type, spacing, control height) comes out about 12% smaller than stock Tailwind. That lets a flipper scan a full report without scrolling through padding, while uppercase micro-labels and big bold readings keep it legible for a first-time buyer. Dark mode with the Green theme is the default and canonical expression. The light ("day") mode is a supported counterpart built from the same roles.

The system has two depth registers. The app (dashboard, report, settings, admin) is flat and border-defined: the inspection bay. Marketing pages are allowed to lift: frosted glass chips, soft blurred color glows, radial spotlights, and large shadows that draw a visitor in from the street.

**Key Characteristics:**
- Dark-first; cool zinc-tinted near-black surfaces, never pure black.
- One brand hue (Bay Light Emerald); status hue appears only as the Low/Medium/High risk trio.
- Dense 14px base; uppercase tracked micro-labels over bold readings.
- Flat, hairline-bordered panels in the app; glass and glow reserved for marketing.
- Inter throughout; monospace only for machine strings (VINs, IDs).

## Colors

A near-monochrome cool-graphite bay lit by a single emerald work light, with a strict three-step risk scale for findings.

### Primary
- **Bay Light Emerald** (`bay-light-emerald`): primary buttons, active states, default badges, chart lines and dots, the left rule on executive-summary pull quotes, and highlighted states on the seller-location map. In day mode it becomes the brighter, yellower **Bay Light Emerald (Day)** (`bay-light-emerald-day`), with **Emerald Ink (Day)** text on it.
- **Mint White** (`mint-white`): label color on emerald fills in dark mode.
- **Focus Emerald** (`focus-emerald`): the focus ring (applied at 50% opacity, 3px).

### Risk Scale
The only sanctioned status hues. They are bound to the product's canonical score bands.
- **Risk Low** (`risk-low`, 0–30): the same value as Bay Light Emerald, so "cleared" and "brand" read as one signal.
- **Risk Medium** (`risk-medium`, 31–70): a deepened amber, tuned to carry white text.
- **Risk High** (`risk-high`, 71–100): inspection-fail red. It is also the day-mode destructive color.

### Neutral
- **Shop Floor** (`shop-floor`): page background. The darkest surface; a cool, faintly violet-tinted near-black.
- **Bench** (`bench`): cards, KPI tiles, popovers, sidebar. One step up from the floor.
- **Toolbox** (`toolbox`): muted fills, tab tracks, secondary buttons, hover wash.
- **Work-Light White** (`work-light-white`): primary text and readings.
- **Stencil Gray** (`stencil-gray`): secondary text, micro-labels, axis ticks, descriptions.
- **Bay Hairline** (`bay-hairline`): every border and divider (white at 10%).
- **Field Edge** (`field-edge`): input borders and the active-tab edge (white at 15%).
- **Fault Red** (`fault-red`): destructive actions and form errors in dark mode.
- Day-mode counterparts: **Shop Floor (Day)**, **Toolbox (Day)**, **Ink (Day)**, **Stencil Gray (Day)**, **Bay Hairline (Day)**, **Fault Red (Day)**.

### Data Series
Multi-series charts use, in order, `chart-blue`, `chart-emerald`, `chart-amber`, `chart-violet`, `chart-rose`. Single-series report charts (odometer, price) use Bay Light Emerald alone.

### Named Rules
**The One Work Light Rule.** Bay Light Emerald is the only brand hue. If something needs emphasis and isn't a risk finding, use weight, size, or Work-Light White, not a new color.

**The Earned Alarm Rule.** Amber and red belong to the risk scale. Use `risk-medium` / `risk-high` (or `fault-red` for destructive UI), never raw palette classes like `amber-400`, `red-500`, or `emerald-400`. Existing raw usages are drift to migrate onto these tokens.

**The Off-Black Rule.** Surfaces are tinted graphite (hue ≈286, chroma ≈0.005). Never `#000` and never neutral gray.

## Typography

**Display Font:** Inter (with ui-sans-serif, system-ui)
**Body Font:** Inter
**Label/Mono Font:** system monospace (ui-monospace, SFMono-Regular, Menlo) for VINs and identifiers only

**Character:** a single workhorse grotesk carries everything; hierarchy comes from weight and case, not font contrast. It reads like a well-labeled parts bin: small tracked caps naming each drawer, bold figures inside.

All sizes are rem on a 14px root (1rem = 14px).

### Hierarchy
- **Display** (700, `3rem` → `4.5rem` at md → `5.25rem` at xl, line-height 1, `text-wrap: balance`): marketing hero headline only. Centered, max width about 56rem.
- **Headline** (700, `1.875rem`, tracking −0.025em): app page titles ("Dashboard", report vehicle name).
- **Metric** (700, `1.5rem`): KPI readings: mileage, listing counts, prices, day counts. May take a risk color when the reading itself is the finding.
- **Title** (600, `1rem`, line-height 1): card titles, usually paired with a 16px Lucide icon.
- **Body** (400, `0.875rem`, line-height 1.625): app prose, narratives, table cells. Keep narratives under about 75ch.
- **Body Marketing** (400, `1.125rem`, Stencil Gray, balanced): hero and section sub-copy.
- **Label** (500, `0.75rem`, tracking 0.05em, UPPERCASE, Stencil Gray): KPI tile headers, section eyebrows, column group heads. Marketing eyebrows widen to 0.2em tracking.
- **Mono** (400, `0.75rem`): VIN strings and IDs, never prose.

### Named Rules
**The Parts-Bin Rule.** Every reading gets a tracked uppercase label above it and the bold figure below. Never a bold figure without its label.

**The Machine String Rule.** Monospace is reserved for strings a machine generated (VINs, IDs). Names, numbers, and prose stay in Inter.

## Layout

App surfaces use a fixed left sidebar (collapsible, with icon rail) and a content column with a slim top bar for breadcrumbs and the theme toggle. Report content stacks full-width cards with a `1.5rem` (21px) vertical gap. Inside cards, data sits in responsive grids: identity rows go to 5 columns, configuration to 3, and KPI rows step 1 → 2 → 3 → 6 columns (sm / lg / xl) with a `1rem` gap. Charts pair two-up at lg and stack below.

Report navigation is a full-width segmented tab bar under the vehicle header. In print, tabs collapse and every panel prints in sequence with an emerald-ruled section title. Print styles live in `globals.css` and must keep working.

Marketing pages center on a narrow column for copy (max about 56rem) and widen to about 64rem for product imagery. Generous vertical rhythm there contrasts with the app's density.

Spacing runs on the Tailwind 0.25rem step (3.5px at this root). The most-used steps are `0.5rem`, `1rem`, and `1.5rem`.

## Elevation & Depth

The app is flat. Depth comes from tonal stepping (Shop Floor → Bench → Toolbox) and Bay Hairline borders, with at most a barely-there `shadow-sm` on cards and `shadow-xs` on outline controls. Marketing is the one place depth is staged: glass chips (`backdrop-filter: blur`) over the hero, large soft color glows (emerald, sky, and primary at about 10% opacity, `blur-3xl`), radial spotlights, and `shadow-lg` floating preview cards.

### Shadow Vocabulary
- **Resting card** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): app cards. Effectively invisible on dark; it gives a faint edge in day mode.
- **Control** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): outline buttons and inputs.
- **Marketing float** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): glass preview cards on the hero.

### Named Rules
**The Split Bay Rule.** In the app, a surface separates from its neighbor by a tonal step or a hairline, never by blur or a heavy shadow. Glass, glow, and lift are marketing-only.

## Shapes

The shapes are gently machined: a single base radius of `0.65rem` (about 9px) generates the scale. Controls (buttons, inputs, badges, tab triggers) use the smaller `md` step. Tab tracks use `lg`. Cards and KPI tiles use the softer `xl`. Marketing preview cards use `2xl`. Fully round forms are reserved for things that act as a marker or token: risk pills, status dots, avatars, marketing chips, and the circular risk gauge. Borders are always 1px hairlines.

## Components

### Buttons
Practical and quiet. A button looks like a labeled switch on the bench, not a call to arms.
- **Shape:** gently rounded (`rounded.md`), height `2.25rem`, 16px icon slot with 0.5rem gap.
- **Primary:** Bay Light Emerald fill, Mint White label, 500 weight.
- **Hover / Focus:** fill drops to 90% opacity. Focus shows a 3px Focus Emerald ring at 50%. Disabled is 50% opacity with no pointer events.
- **Outline:** a faint white wash with a Field Edge border, which brightens on hover.
- **Ghost:** no fill; a Toolbox wash on hover. Used in toolbars and the sidebar.
- **Destructive:** Fault Red at 60% fill in dark mode, white label.
- **Known issue:** Mint White on Bay Light Emerald is low-contrast in dark mode. Check new primary-button text against WCAG AA before adding more.

### Cards / Containers
- **Corner Style:** `rounded.xl`.
- **Background:** Bench on the Shop Floor.
- **Shadow Strategy:** resting card only (see Elevation & Depth).
- **Border:** Bay Hairline.
- **Internal Padding:** `1.5rem` sides and vertical, with a `1.5rem` gap between header and content. The header pairs a Title with an optional Stencil Gray description.

### KPI Tile (signature)
The instrument reading. An uppercase Label with a 14px tinted icon sits on top, a Metric figure below, and a one-line Stencil Gray context line under that ("avg across 80 listings"). An optional warning line uses Risk Medium or Risk High with a ⚠ glyph. Tiles sit in tight 1rem-gap grids, `rounded.xl`, `1rem` padding.

### Risk Gauge & Pills (signature)
The report's verdict. A 128px circular SVG ring shows the composite score: a Toolbox track with the arc stroked in the band color, animating along its dash offset over about 1s with ease-out. The center holds the number in bold `1.875rem` above a Stencil Gray "/ 100". Below it is a fully round pill in the band color ("Medium Risk"), then a legend of three dots labeled 0–30 Low, 31–70 Medium, 71–100 High. Per-vector rows repeat the pill small ("Medium (45/100)").

### Inputs / Fields
- **Style:** height `2.25rem`, `rounded.md`, Field Edge border, faint white wash fill in dark, transparent in day.
- **Focus:** border shifts to Focus Emerald plus a 3px ring at 50%.
- **Error / Disabled:** Fault Red border and a soft red ring. Disabled is 50% opacity.

### Tabs
Segmented control: a Toolbox track (`rounded.lg`, 3px inset). Inactive triggers are Stencil Gray. The active trigger gets the faint white wash, a Field Edge border, and Work-Light White text. Each trigger leads with a 16px Lucide icon. The report uses it full-width.

### Badges
Small (`0.75rem`, 500) and `rounded.md`. The default is an emerald fill. Source badges ("MarketCheck Enhanced") take a leading icon. Outline badges use only a Bay Hairline border.

### Navigation
- **App:** left sidebar on Bench with a Bay Hairline edge. Groups are introduced by small Stencil Gray labels. Items are 16px icon plus `0.875rem` label. Hover and active use a Toolbox wash. The account block sits at the bottom. It collapses to an icon rail; on mobile it becomes a sheet.
- **Marketing:** top header with the logo (light and dark variants), centered links, and an auth action.

### Glass Chip (marketing)
A rounded-full pill on Shop Floor at 70% with a backdrop blur, Bay Hairline border at 60%, bold `0.75rem` Stencil Gray text. Used to tag hero claims. Marketing only.

## Do's and Don'ts

### Do:
- **Do** build every surface from the Shop Floor → Bench → Toolbox steps and Bay Hairline borders.
- **Do** express risk only through `risk-low` / `risk-medium` / `risk-high`, bound to the 0–30 / 31–70 / 71–100 bands.
- **Do** pair every reading with a tracked uppercase Label (the Parts-Bin Rule).
- **Do** size everything in rem so the 14px root keeps the system dense and consistent.
- **Do** design dark mode first, then confirm the day-mode counterpart and the print stylesheet still read correctly.
- **Do** set VINs and identifiers in monospace.

### Don't:
- **Don't** introduce raw Tailwind palette colors (`amber-400`, `red-500`, `emerald-400`, `blue-400`) for status or emphasis; map them to tokens.
- **Don't** add a second brand hue; Bay Light Emerald is the only work light.
- **Don't** use glass, backdrop blur, color glows, or `shadow-lg` inside the app; they belong to marketing.
- **Don't** use pure black (`#000`) or neutral gray surfaces; stay on the cool graphite tint.
- **Don't** design for or document the Neutral theme; Green is the system.
- **Don't** use monospace for prose, labels, or prices.
