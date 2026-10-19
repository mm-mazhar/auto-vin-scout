---
name: Auto VIN Scout
description: The car's instrument cluster at ignition. A VIN turns the key, the dash runs its lamp test, and only what is really wrong stays lit.
colors:
  ground: "oklch(0.135 0.008 175)"
  cowl: "oklch(0.165 0.01 175)"
  panel: "oklch(0.195 0.011 175)"
  panel-raised: "oklch(0.23 0.012 175)"
  screen-well: "oklch(0.1 0.012 170)"
  rule: "oklch(0.93 0.01 160 / 0.1)"
  rule-strong: "oklch(0.93 0.01 160 / 0.2)"
  print: "oklch(0.94 0.008 150)"
  print-2: "oklch(0.78 0.014 165)"
  print-3: "oklch(0.64 0.014 165)"
  vfd: "oklch(0.88 0.14 168)"
  vfd-dim: "oklch(0.7 0.11 168)"
  vfd-ghost: "oklch(0.88 0.14 168 / 0.09)"
  vfd-unlit: "oklch(0.88 0.14 168 / 0.16)"
  emerald: "oklch(0.696 0.17 162.48)"
  emerald-hover: "oklch(0.76 0.16 162.48)"
  emerald-ink: "oklch(0.2 0.05 165)"
  amber: "oklch(0.8 0.16 75)"
  red: "oklch(0.68 0.2 27)"
typography:
  display:
    fontFamily: "Barlow Condensed, ui-sans-serif, sans-serif"
    fontSize: "4.1rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Barlow Condensed, ui-sans-serif, sans-serif"
    fontSize: "3.4rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.012em"
  title:
    fontFamily: "Barlow Condensed, ui-sans-serif, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.012em"
  body-lead:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Barlow Semi Condensed, ui-sans-serif, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.14em"
  vfd-numeral:
    fontFamily: "DSEG7 Classic, ui-monospace, monospace"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  vfd-text:
    fontFamily: "Barlow Semi Condensed, ui-sans-serif, sans-serif"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.07em"
  vin-entry:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "1.25rem"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  key: "7px"
  lens: "7.7px"
  frame: "14px"
  bezel-frame: "15.4px"
spacing:
  gutter: "14px"
  gutter-sm: "21px"
  section: "84px"
  section-lg: "112px"
  heading-to-body: "49px"
components:
  button-primary:
    backgroundColor: "{colors.emerald}"
    textColor: "{colors.emerald-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.key}"
    height: "42px"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.emerald-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.print}"
    typography: "{typography.label}"
    rounded: "{rounded.key}"
    height: "42px"
    padding: "0 14px"
  input-vin:
    backgroundColor: "{colors.screen-well}"
    textColor: "{colors.vfd}"
    typography: "{typography.vin-entry}"
    rounded: "{rounded.key}"
    height: "49px"
    padding: "0 14px"
  chip-demo-vin:
    backgroundColor: "transparent"
    textColor: "{colors.print-2}"
    rounded: "{rounded.key}"
    padding: "5.25px 10.5px"
  nav-link:
    textColor: "{colors.print-2}"
    typography: "{typography.label}"
  vfd-readout:
    backgroundColor: "{colors.screen-well}"
    textColor: "{colors.vfd}"
    typography: "{typography.vfd-numeral}"
  card-frame:
    backgroundColor: "{colors.cowl}"
    textColor: "{colors.print}"
    rounded: "{rounded.frame}"
---

# Design System: Auto VIN Scout

## Overview

**Creative North Star: "Night Dash"**

The product is read like a car's instrument cluster at night: smoked-acrylic near-black with a cool green tint, brushed and spun chrome around the instruments, printed dial numerals, and vacuum-fluorescent readouts that light over their own unlit segments. A VIN turns the key, the dash runs its lamp test, and only what is really wrong stays lit. Everything else on the page borrows the cluster's grammar: legends are instrument legends, numbers are readouts, risk states are telltale lamps.

Density is calm and editorial between instruments. Sections are wide, rule-separated bands with condensed display headlines and short paragraphs. The density lives in the instruments themselves. Light is scarce on purpose: one brand light (emerald), one readout light (VFD green), and amber and red appear only when a risk state has earned them, always next to a word.

Night Dash is night-only. The marketing layout forces `.dark` and the world sets `color-scheme: dark`; there is no light variant (still an open product question, see Layout).

**Key Characteristics:**
- Green-tinted near-black grounds (hue 175), never pure black.
- Barlow family throughout: Condensed for display, Semi Condensed for legends and readout letters, regular Barlow for reading text.
- Seven-segment DSEG7 numerals with ghost segments; no glow.
- Authored ISO-style telltale glyphs, 1.6 stroke, round caps and joins.
- A real-time 3D cluster (React Three Fiber, orthographic) as the hero, with an SVG fallback.
- Hairline rules (10% and 20% print alpha) do the structural work; shadows are almost absent.

### Migration status

Rollout is staged. Night Dash currently renders only on the marketing home page (`app/(marketing)/page.tsx`) and the shared marketing header and footer. The other marketing pages (about, FAQs, contact, legal, get-started) and the authenticated app (dashboard, report, settings, admin) still render the legacy shadcn theme from `app/globals.css`. That legacy theme is outgoing and is not the system: new or reworked surfaces extend Night Dash. Its tokens are scoped to the `.nd` wrapper (`app/(marketing)/night-dash.css`, inside `@layer components`) with fonts from `app/(marketing)/fonts.ts`; extending to another route means wrapping it in `.dark` > `.nd` with `NIGHT_DASH_FONT_VARIABLES`.

## Colors

A cool, green-tinted night palette with two lights (brand emerald, readout VFD green) and two earned warnings.

### Primary
- **Ignition Emerald** (`emerald`): the single brand light. Primary action fills (Decode, Full report, Dashboard, the Basic rate card key), the LOW risk band and score-band swatch, the needle on the wordmark's dial mark, "Your plan" and "Sample report" tags, bullet dashes in the drivers lists, selection tint (at 35% alpha) and `accent-color`. Hovers lift to **Emerald Hover** (`emerald-hover`).
- **Emerald Ink** (`emerald-ink`): text on emerald fills. Never use white or print on emerald.

### Secondary
- **VFD Green** (`vfd`): lit readout segments, VIN text as it is typed, the caret, the focus ring, the current step in the trip log, and driver-card headlines. It is the "instrument is on" colour.
- **VFD Dim** (`vfd-dim`): readouts powered but idle (unpowered vehicle readout, finished trip-log steps, the `$` before a price), and the hover border on every outlined control.
- **VFD Ghost** (`vfd-ghost`): the unlit `8` segments drawn behind every seven-segment numeral, and the unlit cells of the weight gauge.
- **VFD Unlit** (`vfd-unlit`): the dash row shown in an empty text readout.

### Tertiary (earned states only)
- **Telltale Amber** (`amber`): MEDIUM risk (31–70), the ignition lamp test, the trip computer's error state ("No signal", invalid-VIN lines and input border). Always paired with a word.
- **Telltale Red** (`red`): HIGH risk (71–100) only. Always paired with a word.

### Neutral
- **Ground** (`ground`): page background, header and footer bars.
- **Cowl** (`cowl`): alternate section bands (trip log, ignition) and the rate card body.
- **Panel / Panel Raised** (`panel`, `panel-raised`): declared world steps for raised surfaces; no shipped surface consumes them yet.
- **Screen Well** (`screen-well`): the recessed black of instrument screens: VIN inputs, the compact-layout trip computer and vehicle pods, the screenshot frame. Used as a literal in the build, not yet a CSS variable.
- **Print** (`print`): primary text and headlines, the dial's major ticks.
- **Print 2** (`print-2`): body copy, nav links, secondary labels.
- **Print 3** (`print-3`): tertiary text, legends at rest, captions, footer meta, unlit telltale glyphs (at 40%).
- **Rule / Rule Strong** (`rule`, `rule-strong`): hairline dividers; strong for control borders, frames and the trip-log track.

In the 3D scene and dial print, colours are hex literals that approximate these tokens (band LOW `#00bc7d`, MED and lamp amber `#f2ab3c`, HIGH and lamp red `#ef5a4c`, dial print `#e8eee9`, dial dim print `#99a5a0`).

### Named Rules
**The Earned Lamp Rule.** Amber and red are risk states, not decoration. They appear only when a score, a lamp test or an error has earned them, and always beside a word (LOW / MED / HIGH, Medium, High, "No signal").

**The One Brand Light Rule.** Emerald is the only brand colour. Readout green (VFD) means "instrument on", not "brand"; keep the two roles apart.

**The Never Black Rule.** Grounds carry hue 175 and a trace of chroma. `#000` appears only inside the 3D scene's shadow and screen materials.

## Typography

**Display Font:** Barlow Condensed (500/600/700; fallback ui-sans-serif)
**Body Font:** Barlow (400/500/600; fallback ui-sans-serif, system-ui)
**Label Font:** Barlow Semi Condensed (500/600)
**Readout Font:** DSEG7 Classic Bold (self-hosted woff2, OFL)
**VIN Entry:** the system monospace stack

**Character:** Barlow was drawn from highway and plate lettering, so the whole family reads as printed on a dash: condensed numerals and headlines, semi-condensed spaced-out legends, and a plain Barlow for reading.

Root font-size is 14px, so 1rem = 14px. Sizes below are rem with px in parens.

### Hierarchy
- **Display** (600, 2.7rem / 3.5rem at sm / 4.1rem at lg = 37.8 / 49 / 57.4px, line-height 1, -0.012em, balanced wrap): the hero headline only. The closing "Turn the key." runs 3rem / 4.4rem (42 / 61.6px).
- **Headline** (600, 2.6rem / 3.4rem at sm = 36.4 / 47.6px, line-height 1): section headings, max width 14–18ch.
- **Title** (600, 1.45–2.3rem = 20.3–32.2px): lamp names (sized by vector weight, 2rem down to 1.3rem), trip-log steps (1.55rem), driver headlines (2–2.3rem), limits terms (1.45rem), plan names (2rem, uppercase, 0.04em).
- **Body Lead** (400, 1.125rem = 15.75px, relaxed leading): section intros, max 44–52ch. This is also the `.nd` root size (line-height 1.55).
- **Body** (400, 1rem = 14px, relaxed leading): list items, step and lamp descriptions, footer links.
- **Label / Legend** (500, 0.8125rem = 11.4px, 0.14em, uppercase, line-height 1.2): nav links, button labels, instrument legends, figure captions, footer column titles, data-source line. Buttons set it to 600.
- **VFD numeral** (DSEG7 700, tabular): scores, years, prices (3.4rem), step numbers (1.5rem), weights (1.6rem).
- **VFD text** (Semi Condensed 600, 0.07em, uppercase, single line with ellipsis): make, model and trip-computer status lines.
- **VIN entry** (monospace 600, 0.08em; 1.25rem in the ignition form, 13px min in the cluster): typed VINs and demo VIN chips (0.875rem).

### Named Rules
**The Segment Numerals Rule.** Numerals in readouts use DSEG7 with the unlit `8` of every cell ghosted behind; padded cells use DSEG's blank so columns stay aligned. Letters never use segment type (14-segment D reads as "]", V as "\/"); they use Semi Condensed in VFD green.

**The Unlit Row Rule.** An empty text readout is never blank: it shows a row of unlit en dashes (one per cell) in `vfd-unlit`. An empty numeral readout shows ghost segments only.

**The Legible VIN Rule.** Anything a person types or copies as a VIN is set in monospace, not in segment or condensed type. Placeholders switch to the uppercase Semi Condensed legend in `print-3`.

## Layout

- **Widths:** content sections max 1240px; header and footer max 1288px; the wide cluster max 1120px; hero headline max 62rem with lead max 46rem.
- **Gutters:** 14px (px-4), 21px from sm (px-6). Tailwind v4 spacing steps are 0.25rem = 3.5px here.
- **Section rhythm:** vertical padding 84px (py-24) rising to 112px (lg:py-32) or 98px (lg:py-28). Heading block to content: 49–56px (mt-14 / mt-16). Sections are separated by hairline `rule` borders, and the trip log and ignition sections switch to the `cowl` band.
- **Section head pattern:** a two-column grid at lg, headline left and lead paragraph right-aligned to the bottom (`items-end`, `justify-self-end`). Single column below lg.
- **Cluster:** the wide cluster renders from 900px up, in a 1240 x 560 design space (1 unit = 1px at full width) shared by the 3D scene and the HTML overlay, sized with container queries (`cqw`). Below 900px a compact layout takes over: a square dial (max 22rem), then stacked trip-computer and vehicle pods in `screen-well` frames, then a 4 x 2 lamp grid.
- **Sticky header:** 56px tall (h-16), 63px at lg (4.5rem).
- **Night only:** no light theme exists for Night Dash; whether one is ever offered is unresolved.

## Elevation & Depth

Depth comes from the instruments, not from the page. Page surfaces are flat and tonal (ground, cowl, screen-well) separated by hairlines. Physical depth is reserved for the 3D cluster and the lens wells that echo it.

### Shadow Vocabulary
- **Screenshot lift** (`box-shadow: 0 24px 60px -20px rgb(0 0 0 / 0.7)`): only under the full-size report screenshot frame.
- **Lens well** (`box-shadow: 0 0 0 3px oklch(0.12 0.008 175), 0 0 0 4px oklch(0.3 0.01 175), inset 0 1px 0 oklch(1 0 0 / 0.22), inset 0 -10px 18px oklch(0 0 0 / 0.6)`): a recessed glass telltale window with a dark gap and a thin chrome ring.

### The 3D cluster
- **Camera:** orthographic, fit so one design unit maps to one pixel of the container width; dpr capped at 1.75; frameloop pauses when the cluster leaves the viewport.
- **Materials:** matte cowl rim (`#131918`, roughness 0.74); clear-coated face (`#090d0c`); a **spun-metal bezel** around the dial (conic highlight sweep texture, metalness 0.85); **brushed-metal pod frames** (banded texture, metalness 0.85); clear-coated near-black pod screens (`#030706`); lamp wells (`#050807`) in dark frames (`#1c2322`); an off-white needle (`#efebe2`) with an offset drop shadow at 40%; a chrome hub with a dark cap.
- **Lighting:** an environment of soft rect lightformers (cool white and pale mint) plus thin vertical strips that streak the chrome rings; key light from upper left, a faint mint fill from lower right.
- **Dial print:** a canvas texture with 2-unit ticks (major every 10), Barlow Condensed numerals every 10, and three band arcs, each carrying its word (LOW, MED, HIGH) in the legend face.
- **Lamp light spill:** a lit lamp adds a soft additive radial glow on the lens behind its glyph (opacity eases to 0.55), in amber or red. This is light falling on the lens, not glow on type.
- **Lens glare:** one fixed reflection gradient across the cluster face (white at 5% fading out by 42%).
- **Fallback:** a flat SVG cluster (same geometry, chrome gradient strokes) renders until WebGL is ready and when it is unavailable.

### Named Rules
**The Instrument Depth Rule.** Only instruments are physical. Page sections, cards and frames stay flat; if something needs separation, use a rule or a tonal step, not a shadow.

**The No Neon Rule.** Readouts never glow. A lit segment is set against its own ghost segments; light spill belongs on the lens, never as text-shadow or blur on type.

## Shapes

Gently rounded, machined forms. Keys and inputs use a small radius (`key`, 7px from the theme's 0.65rem radius), lens wells slightly more (`lens`, 7.7px), and large frames (rate card, compact pods, planned-features aside) 14px, the screenshot bezel 15.4px with a 9.8px inner image radius. In the 3D cluster, pod frames have an 18-unit outer radius and 7-unit chrome thickness, screens 11, lamp wells 10. The cowl is a single silhouette with a raised shoulder over the dial. Small marks: weight-gauge cells and band swatches are 1px-radius bars; "planned" list markers are hollow 5.25px rings; the planned-features aside uses a dashed `rule-strong` border to mark it as not shipped.

## Components

### Buttons
Keys on a dash: short, labelled in the legend face, never decorated.
- **Shape:** small radius (`key`).
- **Primary:** `emerald` fill, `emerald-ink` label, legend type at 600. Heights: 35px in the header (h-10), 42px on rate cards (h-12), 49px in the ignition form (h-14); cluster keys scale with the container.
- **Hover / Focus:** fill lifts to `emerald-hover` via a colour transition. Focus everywhere is a 2px `vfd` outline at 3px offset. Disabled keys drop to 70% opacity with a progress cursor ("Decoding…").
- **Secondary:** transparent with a 1px `rule-strong` border and `print` label; hover moves the border to `vfd-dim`.
- **Text button:** `print-2` legend label, hover to `print` (Log out).

### Chips
- **Demo VIN chips:** transparent, 1px `rule` border, monospace 0.875rem (12.25px) VIN in `print-2`, optional emerald legend tag ("Sample report"). Hover: border `vfd-dim`, text `print`, tag `vfd`. Preceded by a `print-3` "Try" legend.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** `cowl` (rate card) or `screen-well` (instrument pods, screenshot frame) or transparent with a dashed border (planned list).
- **Shadow Strategy:** flat; see Elevation.
- **Border:** 1px `rule-strong`; internal divisions use `rule`.
- **Internal Padding:** 14px (compact pods), 28px (aside), 28–35px column padding on rate cards.

### Inputs / Fields
- **Style:** `screen-well` fill, 1px `rule-strong` border, `key` radius, monospace VIN in `vfd`, uppercase legend placeholder in `print-3`.
- **Focus:** border becomes `vfd`; hover border `vfd-dim`.
- **Error:** border becomes `amber`; the trip computer prints the reason in amber VFD lines ("17 CHARACTERS", "NO I, O OR Q") and an sr-only message is wired with `aria-describedby`.

### Navigation
- **Header:** sticky solid `ground` bar (no blur), wordmark left, legend links in `print-2` (hover `print`) centred, Sign in (secondary) or Dashboard (primary) right. The bottom border is transparent at the top of the page and becomes `rule` after 24px of scroll or when the menu is open.
- **Mobile:** below lg a 38.5px (size-11) menu toggle opens a full-width panel of display-face links (1.6rem) separated by `rule`, closed by Escape.
- **Footer:** `ground`, top `rule`, a 1.4fr / 1fr / 1fr / 1fr grid at lg: wordmark plus a two-sentence description, then Product, Company and Legal columns with `print-3` legend titles. A bottom bar carries the data-source line in legend type, social brand icons (18px, `print-3`, hover `print`) and the copyright.
- **Wordmark:** a dial mark (arc, ticks, emerald needle, which tilts -6deg on hover) beside "AUTOVINSCOUT" in uppercase Barlow Condensed 1.65rem with 0.04em tracking, "VIN" in `print-2`.

### VFD Readout (signature)
Lit segments over ghost segments, in tones lit (`vfd`), dim (`vfd-dim`), amber or red (each with a matching 9% ghost). Numeral cells are fixed-width and right- or left-aligned; text readouts truncate with an ellipsis and keep the full value in `title` and an sr-only label. Readouts sit in `screen-well` pods or directly on the page as numbers (prices, weights, step numbers).

### Telltale Glyphs (signature)
An authored set of eight ISO-style dash symbols on a 24-unit grid: baseline (gauge), safety (seated occupant and belt), flood (car over waves), powertrain (engine outline), corrosion (car with drips), theft (car and padlock), forensics (camera), reliability (wrench). Stroke 1.6, `currentColor`, round caps and joins, no fill. Unlit at `print-3` 40%; amber for test and medium, red for high. Each lamp carries a caption below: lamp name in `print-2` and a state word (Clear in emerald, Medium in amber, High in red, "In report" or "Not scored" in `print-3`).

### Lens Well
The page-level echo of a cluster lamp, used in the lamp list: a rounded square (7.7px) sized by vector weight (2.9–4.6rem), filled with a dark radial gradient (oklch 0.24 to 0.06), a fixed 172deg glare band across the top third, a 1px oklch(0.38) border, the lens-well shadow stack, and the telltale glyph at 55% in `print` at 90% opacity.

### Weight Gauge and Score Bands
A DSEG7 percentage above a five-cell bar (lit cells `vfd`, unlit `vfd-ghost`). Score bands are 21 x 5.25px swatches (emerald / amber / red) each followed by the range and word in legend type and a plain-language gloss in `print-3`.

### Trip Log
An eight-step horizontal pipeline on a 1px `rule-strong` track: DSEG7 step numbers, the current step lit in `vfd` with its title in `vfd`, finished steps dim, upcoming steps at 50% opacity. Progress follows scroll.

### Motion
- **nd-rise** (900ms, `cubic-bezier(0.16, 1, 0.3, 1)`): opacity 0 to 1, 14px rise and a 6px blur clearing; the hero headline block only.
- **nd-print-line** (260ms, `steps(12)`): a left-to-right clip reveal as each trip-computer line prints.
- **Intro:** the 3D cluster tilts up from -0.62 rad and lifts from -60 units, easing to rest; it then follows the pointer by a few hundredths of a radian.
- **Ignition lamp test:** on settle every lamp lights amber and the needle sweeps to 100, falls back to 0 at 900ms, and lamps settle one by one 110ms apart. Decoding repeats the test for at least 1300ms before results settle.
- **Needle spring:** a damped spring (stiffness 70, damping 12) on fixed 1/120s substeps.
- **Reduced motion:** CSS animations are removed, the needle jumps to its target, tilt, lift and pointer follow are disabled, sequence delays cap at 60ms and the minimum lamp test is skipped.

## Do's and Don'ts

### Do:
- **Do** set every readout number in DSEG7 with ghost segments, and every readout word in Semi Condensed VFD green.
- **Do** pair amber and red with a word every time (LOW / MED / HIGH, Medium, High, "No signal").
- **Do** fill empty text readouts with an unlit dash row instead of leaving them blank.
- **Do** set typed or listed VINs in monospace for legibility.
- **Do** separate sections with `rule` hairlines and the `cowl` band, and keep page surfaces flat.
- **Do** use the authored telltale set (24 grid, 1.6 stroke) for risk vectors; draw new glyphs to the same spec.
- **Do** keep emerald for the primary action and brand marks only; give every focusable element the 2px `vfd` outline.
- **Do** label unfinished things plainly: placeholder prices, planned features in a dashed frame with "None of these are available today."
- **Do** extend Night Dash, not the legacy shadcn theme, when a marketing page or app surface is reworked.

### Don't:
- **Don't** use amber or red as decoration or without a word.
- **Don't** add neon glow, text-shadow or blur to readouts; the ghost segments are the light.
- **Don't** use glass or backdrop-blur decoration; the header is a solid `ground` bar.
- **Don't** put eyebrow or kicker labels above headings. Legends belong on instruments, captions and footer columns, not over section headlines.
- **Don't** use segment type for letters or for VINs.
- **Don't** use pure black page grounds or a light theme.
- **Don't** invent testimonials, customer counts, metrics or shipped status; show real sample reports and mark placeholders.
