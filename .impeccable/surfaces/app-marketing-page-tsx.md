---
version: 1
slug: "app-marketing-page-tsx"
primary_target: "app/(marketing)/page.tsx"
related_targets: []
---

# Landing page (marketing home)

Scope: the marketing home at `/`, then the other marketing pages (about, contact, faqs, get-started, privacy, terms) inherit the same world. Report and dashboard are out of scope for now.
Visitor mode: Persuade.
Audience: individual used-car buyers and flippers/brokers, usually holding one listing and its VIN, often on a phone.
Action: paste a VIN in the first viewport. No public decode endpoint exists, so the VIN is validated locally (length, characters, check digit) and carried into sign-up / get-started.
Proof and content that must stay: real testimonials, product screenshots (`public/dashboard-0*.png`, `public/HeroDark-0*.png`), upcoming features + API teaser (marked upcoming), pricing plans from `lib/constants.ts` on the page.
Constraints: real 3D (WebGL) is required by the owner. Contact details and socials in constants are placeholders; do not display them.

## Direction contract

THESIS: The pre-purchase inspection every smart buyer wants, a car up on a lift with a work lamp on its underside, run from a VIN before you drive out. Refuses the category default: dark SaaS hero, centred headline, glass cards, neon accent (the current site), and the glossy turntable car reveal.

OWN-WORLD: A working shop bay. Sealed concrete mid-grey ground, fluorescent-tube light, lift-arm safety yellow as the committed colour that carries structure (bands, arms, rails, primary controls), paint-pen white and safety-orange hand marks for findings, stencilled condensed labels, carbonless work-order paper for forms and plans. Controls are work-order fields and heavy push buttons.

STORY: The visitor understands AutoVINScout inspects a car's hidden history from public signals across eight vectors, believes it finds what a listing hides, and pastes a VIN.

FIRST VIEWPORT: Full-bleed live WebGL scene looking up at a car's underbody on a two-post lift, yellow arms in frame. The cursor (scroll or auto-sweep on touch) steers a work-lamp cone; where it lands, paint-pen risk marks appear on the frame, from a labelled sample VIN. A work-order card sits lower-left with the headline, the VIN field and the primary button. Navigation runs as a stencilled strip on a yellow band.

FORM: Under the Lift, position 1 on my ordered list (my pick, chosen by the owner over the assigned position 3, The Window Sticker). seed:253dc1d6310e4d34

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
