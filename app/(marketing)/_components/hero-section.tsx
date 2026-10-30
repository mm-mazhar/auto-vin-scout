// app/(marketing)/_components/hero-section.tsx
//
// The landing page, laid out as a visit to the shop: the car goes up on the
// lift, the inspection sheet, what the marks mean, how a work order runs, the
// hand-back, what customers said at the counter, what is on the bench next,
// and the price tags.

import { LiftHero } from '@/app/(marketing)/_components/lift/lift-hero'
import { VinWorkOrder } from '@/app/(marketing)/_components/vin-work-order'
import prisma from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import {
  CREDITS_SIGNUP_BONUS,
  formatPrice,
  PLAN_IDS,
  PRICING_PLANS,
  TESTIMONIALS,
  type PlanId,
  type PricingPlan,
} from '@/lib/constants'
import { marketingPlanCta } from '@/lib/pricing-cta'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

const INSPECTORS = [
  { name: 'Baseline health and market anomalies', looksFor: 'Odometer rollbacks, fire-sale pricing, mileage velocity, open recalls', weight: 25 },
  { name: 'Visual and auction forensics', looksFor: 'Salvage-yard photos, Copart and IAAI listings, “parts only” listings', weight: 20 },
  { name: 'Geospatial flood forensics', looksFor: 'FEMA disasters that overlap the listing timeline, checked against rainfall records', weight: 15 },
  { name: 'Reliability and social proof', looksFor: 'Recurring failures reported by owner communities, mostly Reddit', weight: 15 },
  { name: 'Powertrain complexity', looksFor: 'Engine architecture against mileage, and where its known failure window starts', weight: 10 },
  { name: 'Safety ratings', looksFor: 'NHTSA crash ratings, driver-assist features, complaints and investigations', weight: 5 },
  { name: 'Environmental corrosion', looksFor: 'Salt Belt, Sun Belt and coastal exposure, built up over the years', weight: 5 },
  { name: 'Theft and vandalism', looksFor: 'How often the model is stolen, and recent reports where it was listed', weight: 5 },
] as const

const EVIDENCE = [
  {
    src: '/landing/evidence-flood.jpg',
    alt: 'Dried silt line on the carpet under a car seat, lit by a work light',
    mark: 'Flood risk',
    look: 'Pull the seat-rail trim and check the carpet for a silt line.',
  },
  {
    src: '/landing/evidence-rust.jpg',
    alt: 'Rusted rocker panel and pinch weld seen from below on a lift',
    mark: 'Corrosion risk',
    look: 'Get it on a lift and look at the pinch welds and rockers.',
  },
  {
    src: '/landing/evidence-auction.jpg',
    alt: 'Salvage auction yard at night with a lot number written on a windshield',
    mark: 'Salvage risk',
    look: 'Ask for the title history, and why the car went through an auction yard.',
  },
] as const

const STEPS = [
  {
    stage: 'Write-up',
    title: 'Paste the VIN',
    lines: [
      'We decode it against NHTSA records: make, model, engine, plant.',
      'The decode is free with an account, so you know the listing describes the right car.',
    ],
  },
  {
    stage: 'On the lift',
    title: 'Eight inspectors run at once',
    lines: [
      'One credit runs the full inspection.',
      'Each inspector pulls its own sources and scores its vector. If a source is down, the report says so instead of guessing.',
    ],
  },
  {
    stage: 'Hand-back',
    title: 'A score and what to say',
    lines: [
      'A 0–100 risk score with a plain-language summary of why.',
      'A negotiation script you can text the seller, built only from what was found.',
    ],
  },
] as const

const HAND_BACK = [
  {
    src: '/dashboard-03.png',
    width: 1090,
    height: 750,
    alt: 'Report overview with an overall risk index of 12 out of 100 and an executive summary',
    note: 'One score, and why',
  },
  {
    src: '/HeroDark-05.png',
    width: 919,
    height: 904,
    alt: 'Market behavior tab with odometer and price history charts and a map of seller locations',
    note: 'Every listing, mile and price drop',
  },
  {
    src: '/dashboard-04.png',
    width: 1088,
    height: 809,
    alt: 'Buyer guidance tab with an AI negotiation script',
    note: 'Text this to the seller',
  },
] as const

const BENCH = [
  {
    title: 'Market forecasting and dealer tools',
    lines: [
      'Depreciation analytics from how the model has held value, and how it sells locally.',
      'White-label workflows for dealers evaluating inventory or sharing transparency reports.',
    ],
  },
  {
    title: 'An API for the whole inspection',
    lines: [
      'Decode a VIN and get the structured risk data back in one request, as JSON.',
      'Tiers from single developers to high-volume dealer integrations.',
      'Embed scores, flood signals and recall data in your own product, white-label ready.',
    ],
  },
] as const

export default async function HeroSection() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let currentPlanId: PlanId | null = null
  if (user) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: { include: { subscription: true } } },
      orderBy: { createdAt: 'asc' },
    })
    const org = membership?.organization
    const subStatus = org?.subscription?.status ?? null
    const rawPlanId = org?.subscription?.planId ?? null
    if (subStatus === 'active') {
      currentPlanId =
        !rawPlanId || rawPlanId === PLAN_IDS.free
          ? PLAN_IDS.free
          : (PRICING_PLANS.find((p: PricingPlan) => p.stripePriceId === rawPlanId)?.id ?? PLAN_IDS.free)
    } else if ((org?.credits ?? 0) > 0) {
      currentPlanId = PLAN_IDS.basic
    }
  }

  const isAuthenticated = !!user
  const plans = PRICING_PLANS.filter((p) => p.id !== PLAN_IDS.free && !p.hidden)
  const basic = PRICING_PLANS.find((p) => p.id === PLAN_IDS.basic)
  const offer = isAuthenticated
    ? 'The report opens in your dashboard with this VIN filled in.'
    : `${
        CREDITS_SIGNUP_BONUS === 1 ? 'Your first full report is' : `Your first ${CREDITS_SIGNUP_BONUS} full reports are`
      } free when you create an account.${
        basic ? ` After that, ${basic.credits} reports are ${formatPrice(basic.price)}.` : ''
      }`

  return (
    <>
      <div id='inspect' className='scroll-mt-16'>
        <LiftHero isAuthenticated={isAuthenticated} offer={offer} />
      </div>

      {/* ---------------------------------------------------- inspection sheet */}
      <section id='inspection' aria-labelledby='inspection-title' className='scroll-mt-16 px-4 pb-24 pt-28 sm:px-8 lg:pt-36'>
        <div className='mx-auto max-w-[76rem]'>
          <div className='grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end'>
            <h2 id='inspection-title' className='shop-h2 max-w-[14ch]'>
              Eight inspectors. One score out of 100.
            </h2>
            <p className='shop-lede lg:max-w-[40ch] lg:pb-2'>
              Each inspector scores one risk vector from 0 to 100. The report weights them into a
              single score, and mileage scales every factor: the longer the car has been driven, the
              more each risk counts.
            </p>
          </div>

          <div className='shop-paper mt-12 overflow-hidden'>
            <div className='shop-paper-rule shop-paper-print flex items-center justify-between border-b-2 px-5 py-3 sm:px-8'>
              <span className='shop-stencil-label'>Inspection sheet</span>
              <span className='shop-stencil-label'>Weight in score</span>
            </div>
            <ol>
              {INSPECTORS.map((row, i) => (
                <li
                  key={row.name}
                  className='shop-paper-rule grid grid-cols-[2.2rem_1fr] gap-x-4 gap-y-2 border-b px-5 py-4 last:border-b-0 sm:grid-cols-[2.6rem_minmax(0,17rem)_1fr_11rem] sm:items-center sm:px-8'
                >
                  <span className='shop-display shop-paper-print text-[1.9rem] tabular-nums'>{i + 1}</span>
                  <span className='font-bold leading-tight [font-variation-settings:"wdth"_88]'>{row.name}</span>
                  <span className='col-start-2 text-[0.95rem] leading-snug text-[#33363b] sm:col-start-auto'>
                    {row.looksFor}
                  </span>
                  <span className='col-start-2 flex items-center gap-3 sm:col-start-auto'>
                    <span className='relative h-3.5 flex-1 rounded-sm bg-[color-mix(in_oklab,var(--paper-print)_14%,transparent)]'>
                      <span
                        className='absolute inset-y-0 left-0 rounded-sm bg-[var(--lift)] shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)]'
                        style={{ width: `${(row.weight / 25) * 100}%` }}
                      />
                    </span>
                    <span className='w-10 text-right font-bold tabular-nums'>{row.weight}%</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className='shop-paper-rule shop-paper-print grid gap-3 border-t-2 px-5 py-4 text-[0.9rem] sm:grid-cols-3 sm:px-8'>
              <p>
                <b className='text-[var(--paper-ink)]'>0–30 Low.</b> Standard wear. Mileage matches age.
              </p>
              <p>
                <b className='text-[var(--paper-ink)]'>31–70 Medium.</b> Real concerns. Inspect before you pay.
              </p>
              <p>
                <b className='text-[var(--paper-ink)]'>71–100 High.</b> A major red flag. Probable hidden damage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- where to look */}
      <section aria-labelledby='evidence-title' className='bg-[var(--shop-floor-deep)] px-4 py-24 sm:px-8 lg:py-32'>
        <div className='mx-auto max-w-[92rem]'>
          <div className='mx-auto max-w-[76rem]'>
            <h2 id='evidence-title' className='shop-h2 max-w-[18ch]'>
              It tells you where to point the flashlight.
            </h2>
            <p className='shop-lede mt-6'>
              AutoVINScout never sees the car. It reads the record around it, and sends your mechanic,
              or your own flashlight, to the places that record makes suspicious.
            </p>
          </div>
          <ul className='mt-14 grid gap-5 md:grid-cols-3 md:gap-4'>
            {EVIDENCE.map((e, i) => (
              <li key={e.src} className={cn('relative overflow-hidden rounded-[3px]', i === 1 && 'md:translate-y-12')}>
                <Image
                  src={e.src}
                  alt={e.alt}
                  width={1600}
                  height={1200}
                  sizes='(min-width: 768px) 33vw, 100vw'
                  className='aspect-[4/5] h-auto w-full object-cover'
                />
                <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-5 pt-20'>
                  <p className='shop-hand text-[2.1rem]'>{e.mark}</p>
                  <p className='mt-1 max-w-[30ch] text-[0.98rem] leading-snug text-[var(--pen-white)]'>{e.look}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className='mx-auto mt-20 max-w-[76rem] text-[0.82rem] text-[var(--shop-text-dim)] md:mt-24'>
            Illustrative photos.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------- how a work order runs */}
      <section id='how-it-works' aria-labelledby='how-title' className='scroll-mt-16 px-4 py-24 sm:px-8 lg:py-32'>
        <div className='mx-auto max-w-[76rem]'>
          <h2 id='how-title' className='shop-h2 max-w-[16ch]'>
            How a work order runs
          </h2>
          <ol className='shop-paper mt-12 grid md:grid-cols-3'>
            {STEPS.map((step, i) => (
              <li
                key={step.stage}
                className={cn(
                  'relative p-6 sm:p-8',
                  i > 0 &&
                    'border-t-2 border-dashed border-[color-mix(in_oklab,var(--paper-print)_45%,transparent)] md:border-l-2 md:border-t-0',
                )}
              >
                <div className='flex items-baseline gap-3'>
                  <span className='shop-display shop-paper-print text-[3.4rem] leading-none tabular-nums'>{i + 1}</span>
                  <span className='shop-stencil-label shop-paper-print'>{step.stage}</span>
                </div>
                <h3 className='shop-h3 mt-4 text-[var(--paper-ink)]'>{step.title}</h3>
                <ul className='mt-3 space-y-2 text-[0.98rem] leading-snug text-[#2f3237]'>
                  {step.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------- the hand-back */}
      <section aria-labelledby='handback-title' className='px-4 pb-24 sm:px-8 lg:pb-32'>
        <div className='mx-auto max-w-[92rem]'>
          <div className='mx-auto grid max-w-[76rem] gap-6 lg:grid-cols-[1fr_auto] lg:items-end'>
            <h2 id='handback-title' className='shop-h2 max-w-[14ch]'>
              The hand-back
            </h2>
            <p className='shop-lede lg:max-w-[42ch] lg:pb-2'>
              What you get when the car comes down. These are screens from real reports in the
              dashboard.
            </p>
          </div>
          <ul className='mt-12 grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-6'>
            {HAND_BACK.map((shot, i) => (
              <li key={shot.src} className={cn(i === 0 && 'lg:row-span-2')}>
                <figure>
                  <div className='overflow-hidden rounded-[4px] border-2 border-[#3a4046] bg-black shadow-[0_24px_50px_-20px_rgb(0_0_0/0.8)]'>
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      width={shot.width}
                      height={shot.height}
                      sizes='(min-width: 1024px) 50vw, 100vw'
                      className='h-auto w-full'
                    />
                  </div>
                  <figcaption className='shop-hand mt-3 text-[1.9rem]'>{shot.note}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------- at the counter */}
      <section aria-labelledby='counter-title' className='bg-[var(--shop-floor-deep)] px-4 py-24 sm:px-8 lg:py-32'>
        <div className='mx-auto max-w-[76rem]'>
          <h2 id='counter-title' className='shop-h2 max-w-[16ch]'>
            What buyers told us they need
          </h2>
          <p className='shop-lede mt-6'>
            Hidden damage, bad pricing, and not knowing what to check next. The product is shaped
            around those three worries.
          </p>
          <ul className='mt-14 columns-1 gap-6 sm:columns-2 lg:columns-3'>
            {TESTIMONIALS.map((t, i) => (
              <li
                key={t.name}
                className='shop-paper mb-6 break-inside-avoid p-6'
                style={{ rotate: `${[-1.2, 0.8, -0.4, 1.1, -0.9, 0.5][i % 6]}deg` }}
              >
                <blockquote className='text-[1.02rem] leading-relaxed text-[#26282c]'>
                  {t.quote.replace(/^“|”$/g, '')}
                </blockquote>
                <p className='shop-paper-rule mt-4 border-t pt-3'>
                  <span className='font-bold'>{t.name}</span>
                  <span className='shop-paper-print'> · {t.title}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------- on the bench */}
      <section aria-labelledby='bench-title' className='px-4 py-24 sm:px-8 lg:py-32'>
        <div className='mx-auto max-w-[76rem]'>
          <div className='grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end'>
            <h2 id='bench-title' className='shop-h2 max-w-[14ch]'>
              On the bench, not shipped yet
            </h2>
            <p className='shop-lede lg:max-w-[40ch] lg:pb-2'>
              Once the public-data inspection has proven itself, these come next. None of this is
              available today.
            </p>
          </div>
          <div className='mt-12 grid gap-px overflow-hidden rounded-[3px] bg-[var(--shop-rule)] md:grid-cols-2'>
            {BENCH.map((item) => (
              <div key={item.title} className='bg-[var(--shop-floor-raised)] p-7 sm:p-9'>
                <span className='shop-stencil-label inline-block bg-[var(--lift)] px-2 py-1 text-[var(--lift-ink)]'>
                  Upcoming
                </span>
                <h3 className='shop-h3 mt-5'>{item.title}</h3>
                <ul className='mt-4 space-y-3 text-[var(--shop-text-dim)]'>
                  {item.lines.map((line) => (
                    <li key={line} className='flex gap-3'>
                      <span aria-hidden className='mt-[0.6em] h-0.5 w-3 shrink-0 bg-[var(--lift)]' />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- price tags */}
      <section id='pricing' aria-labelledby='pricing-title' className='scroll-mt-16 bg-[var(--shop-floor-deep)] px-4 py-24 sm:px-8 lg:py-32'>
        <div className='mx-auto max-w-[76rem]'>
          <h2 id='pricing-title' className='shop-h2 max-w-[16ch]'>
            Pay per car, or by the month
          </h2>
          <p className='shop-lede mt-6'>
            One credit runs one full inspection. Prices in USD.
          </p>
          <ul className={cn('mt-14 grid gap-6', plans.length >= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
            {plans.map((plan) => {
              const cta = marketingPlanCta(plan, currentPlanId, isAuthenticated)
              const popular = plan.id === PLAN_IDS.pro
              return (
                <li key={plan.id} className='shop-paper shop-tag flex flex-col p-7 pt-12'>
                  {popular ? (
                    <span className='shop-stencil-label absolute right-5 top-5 bg-[var(--lift-ink)] px-2 py-1 text-[var(--lift)]'>
                      Popular
                    </span>
                  ) : null}
                  <h3 className='shop-h3 text-[2rem]'>{plan.title}</h3>
                  <p className='mt-1 text-[0.95rem] text-[#3a3d42]'>
                    {plan.credits} {plan.credits === 1 ? 'report' : 'reports'}
                    {plan.priceSuffix.includes('mo') ? ' every month' : ', one-time'}
                  </p>
                  <p className='mt-6 flex items-baseline gap-1'>
                    <span className='shop-display text-[3.6rem] tabular-nums'>{formatPrice(plan.price)}</span>
                    <span className='font-bold text-[#3a3d42]'>{plan.priceSuffix.trim()}</span>
                  </p>
                  <ul className='shop-paper-rule mt-6 flex-1 space-y-2 border-t pt-5 text-[0.95rem] text-[#2f3237]'>
                    {plan.features.map((f) => (
                      <li key={f} className='flex gap-2.5'>
                        <span aria-hidden className='mt-[0.55em] size-1.5 shrink-0 rounded-full bg-[var(--paper-print)]' />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={cta.href} className='shop-button mt-7 w-full'>
                    {cta.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------- close */}
      <section aria-labelledby='close-title' className='relative isolate overflow-hidden'>
        <Image
          src='/landing/shop-bay.jpg'
          alt=''
          fill
          sizes='100vw'
          className='-z-10 object-cover object-[50%_60%]'
        />
        <div aria-hidden className='absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/40 to-black/10' />
        <div className='mx-auto grid max-w-[92rem] gap-10 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_32rem] lg:items-center lg:py-36'>
          <h2 id='close-title' className='shop-h2 max-w-[13ch]'>
            Run the VIN before you trust the listing.
          </h2>
          <div className='shop-paper p-6 sm:p-7'>
            <VinWorkOrder isAuthenticated={isAuthenticated} />
          </div>
        </div>
      </section>
    </>
  )
}
