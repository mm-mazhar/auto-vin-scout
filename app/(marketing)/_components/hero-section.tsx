// app/(marketing)/_components/hero-section.tsx

import { AnimatedGroup } from '@/app/(marketing)/_components/ui/animated-group'
import AnimatedShinyText from '@/app/(marketing)/_components/ui/animated-shiny-text'
import { HyperText } from '@/app/(marketing)/_components/ui/hyper-text'
import TextEffect from '@/app/(marketing)/_components/ui/text-effect'
import { MARKETING_SURFACE_MAX_WIDTH, PageSection } from '@/components/page-section'
import PricingComponent from '@/components/PricingComponent'
import { Button } from '@/components/ui/button'
import { ShineBorder } from '@/components/ui/shine-border'
import {
    Briefcase,
    Building2,
    Code,
    FlaskConical,
    Lightbulb,
    Microscope,
    Rocket,
    ShieldCheck,
    Wrench,
    Zap
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import prisma from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import {
    APP_DESCRIPTION,
    APP_DESCRIPTION_LONG,
    APP_SLOGAN,
    GLASS_CARD,
    PLAN_IDS,
    PRICE_HEADING,
    PRICING_PLANS,
    TESTIMONIALS,
    TESTIMONIAL_TICKER_ENABLED,
    type PlanId,
    type PricingPlan,
} from '@/lib/constants'
import { cn } from '@/lib/utils'

// const HERO_LIGHT_IMAGE_PATH = '/HeroDark-02.png'
// const HERO_DARK_IMAGE_PATH = '/HeroDark-03.png'

const HERO_LIGHT_IMAGE_PATH = '/HeroDark-05.png'
const HERO_DARK_IMAGE_PATH = '/HeroDark-05.png'

const transitionVariants = {
  item: {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 12 },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: { type: 'spring' as const, bounce: 0.3, duration: 1.5 },
    },
  },
}

// Card base styles that play nicely with GLASS_CARD constant from lib/constants.ts

export default async function HeroSection() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get Organization Billing Data
  let orgBilling = null
  if (user) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          include: { subscription: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    orgBilling = membership?.organization
  }

  const subStatus = orgBilling?.subscription?.status ?? null
  const rawPlanId = orgBilling?.subscription?.planId ?? null
  const creditsUsed = orgBilling?.credits ?? 0
  const currentPlanId: PlanId | null = (() => {
    if (subStatus === 'active') {
      if (!rawPlanId) return PLAN_IDS.free
      if (rawPlanId === PLAN_IDS.free) return PLAN_IDS.free
      const matched = PRICING_PLANS.find(
        (p: PricingPlan) => p.stripePriceId === rawPlanId
      )
      return matched?.id ?? PLAN_IDS.free
    }
    if ((orgBilling?.credits ?? 0) > 0) {
      return PLAN_IDS.basic
    }
    return null
  })()

  const proCredits =
    PRICING_PLANS.find((p) => p.id === PLAN_IDS.dealerplus)?.credits ?? 0
  const proExhausted =
    subStatus === 'active' && currentPlanId === PLAN_IDS.dealerplus
      ? creditsUsed >= proCredits
      : false

  const glassCardBase = 'flex flex-col rounded-2xl p-5 text-left shadow-sm'
  const glassCardFlexBetween =
    'flex h-full flex-col justify-between rounded-2xl p-6 text-left shadow-sm'
  const alignedSurfaceWidth = MARKETING_SURFACE_MAX_WIDTH

  return (
    <>
      <main className='relative overflow-hidden'>
        {/* --- BACKGROUND LAYER --- */}
        <div
          aria-hidden
          className='absolute inset-0 isolate hidden opacity-65 contain-strict lg:block'
        >
          <div className='absolute left-0 top-0 h-320 w-140 -translate-y-87.5 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]' />
          <div className='absolute left-0 top-0 h-320 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]' />
          <div className='absolute left-0 top-0 h-320 w-60 -translate-y-87.5 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]' />
        </div>

        {/* Background image removed for cleaner glassmorphism effect */}

        <div
          aria-hidden
          className='absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]'
        />

        {/* --- CONTENT LAYER --- */}
        <div className='relative z-10'>
          {/* HERO SECTION - Slogan */}
          <PageSection className='pt-32 pb-6 md:pt-40 md:pb-10'>
            <div className='font-bold mx-auto flex max-w-4xl flex-col items-center text-center'>
              <AnimatedGroup variants={transitionVariants}>
                <Link
                  href='/get-started'
                  className='group relative mx-auto flex w-fit items-center gap-4 overflow-hidden rounded-full border bg-muted px-4 py-1 shadow-md shadow-zinc-950/5 transition-colors duration-300 hover:bg-background dark:border-t-white/5 dark:shadow-zinc-950 dark:hover:border-t-border'
                >
                  <ShineBorder
                    borderWidth={1}
                    duration={20}
                    shineColor={['var(--primary)']}
                  />
                  <AnimatedShinyText className='inline-flex items-center justify-center px-1 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400'>
                    <span className='text-primary text-sm'>{APP_SLOGAN}</span>
                  </AnimatedShinyText>
                </Link>
              </AnimatedGroup>
            </div>
          </PageSection>

          {/* HERO SECTION - Main Heading */}
          <PageSection className='py-6 md:py-10'>
            <div className='mx-auto flex max-w-4xl flex-col items-center text-center'>
              <TextEffect
                preset='fade-in-blur'
                speedSegment={0.3}
                as='h1'
                className='mx-auto max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl xl:text-[5.25rem]'
              >
                {APP_DESCRIPTION}
              </TextEffect>
            </div>
          </PageSection>

          {/* HERO SECTION - Description */}
          <PageSection className='py-6 md:py-10'>
            <div className='mx-auto flex max-w-4xl flex-col items-center text-center'>
              <HyperText className='max-w-2xl text-balance text-lg text-muted-foreground'>
                {APP_DESCRIPTION_LONG}
              </HyperText>
            </div>
          </PageSection>

          {/* HERO SECTION - CTA Button */}
          <PageSection className='py-6 md:py-10'>
            <div className='mx-auto flex max-w-4xl flex-col items-center text-center'>
              <AnimatedGroup
                variants={{
                  container: {
                    visible: {
                      transition: { staggerChildren: 0.05, delayChildren: 0.75 },
                    },
                  },
                  ...transitionVariants,
                }}
                className='flex flex-col items-center justify-center gap-6 md:flex-row'
              >
                {user ? (
                  <Button asChild size='lg' variant='default' className='font-bold px-5'>
                    <Link href='/dashboard'>
                      <span className='text-nowrap'>Dashboard</span>
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size='lg' variant='default' className='font-bold px-5'>
                    <Link href='/get-started'>
                      <span className='text-nowrap'>Start VIN Check</span>
                    </Link>
                  </Button>
                )}
              </AnimatedGroup>
            </div>
          </PageSection>

          {/* HERO SECTION - App Screenshot */}
          <PageSection className='py-6 md:py-10'>
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: { staggerChildren: 0.05, delayChildren: 0.75 },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className='mask-b-from-55% relative overflow-hidden px-2 pt-5 md:pt-7'>
                <div className='absolute inset-x-8 top-10 -z-10 h-56 rounded-full bg-primary/10 blur-3xl' />
                <div className='absolute left-12 top-28 -z-10 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl' />
                <div className='absolute bottom-12 right-14 -z-10 h-52 w-52 rounded-full bg-sky-500/10 blur-3xl' />

                <div className='mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-center gap-3 text-xs font-medium text-muted-foreground'>
                  <div className='font-bold rounded-full border border-border/60 bg-background/70 px-3 py-2 backdrop-blur'>
                    NHTSA decode
                  </div>
                  <div className='font-bold rounded-full border border-border/60 bg-background/70 px-3 py-2 backdrop-blur'>
                    Recall context
                  </div>
                  <div className='font-bold rounded-full border border-border/60 bg-background/70 px-3 py-2 backdrop-blur'>
                    Market timeline
                  </div>
                  <div className='font-bold rounded-full border border-border/60 bg-background/70 px-3 py-2 backdrop-blur'>
                    Flood exposure signals
                  </div>
                </div>

                <div className={cn('relative mx-auto flex flex-col gap-4 lg:gap-6', alignedSurfaceWidth)}>
                  <div className='hidden gap-4 md:grid md:grid-cols-2 xl:gap-6'>
                    <div className='pointer-events-none rounded-2xl border border-border/60 bg-background/78 p-4 shadow-lg shadow-black/10 backdrop-blur'>
                      <div className='flex items-center gap-3'>
                        <ShieldCheck className='h-5 w-5 text-primary' />
                        <div>
                          <div className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                            Flood exposure
                          </div>
                          <div className='mt-1 text-sm font-semibold text-foreground'>
                            Review recent storm history
                          </div>
                        </div>
                      </div>
                      <p className='mt-3 text-xs leading-5 text-muted-foreground'>
                        Location and timing signals make this one worth a closer underbody inspection.
                      </p>
                    </div>

                    <div className='pointer-events-none rounded-2xl border border-border/60 bg-background/78 p-4 shadow-lg shadow-black/10 backdrop-blur'>
                      <div className='flex items-center gap-3'>
                        <Building2 className='h-5 w-5 text-primary' />
                        <div>
                          <div className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                            Market movement
                          </div>
                          <div className='mt-1 text-sm font-semibold text-foreground'>
                            3 relists and a price drop
                          </div>
                        </div>
                      </div>
                      <p className='mt-3 text-xs leading-5 text-muted-foreground'>
                        Listing behavior suggests the seller has been adjusting to find the right buyer.
                      </p>
                    </div>
                  </div>

                  <div className='hidden justify-center lg:flex'>
                    <div className='pointer-events-none w-full max-w-sm rounded-2xl border border-border/60 bg-background/82 p-4 shadow-lg shadow-black/10 backdrop-blur'>
                      <div className='flex items-center justify-between gap-4'>
                        <div>
                          <div className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                            Buyer checklist
                          </div>
                          <div className='mt-1 text-sm font-semibold text-foreground'>
                            Ready before you call the seller
                          </div>
                        </div>
                        <Wrench className='h-5 w-5 shrink-0 text-primary' />
                      </div>
                    </div>
                  </div>

                  <div className='inset-shadow-2xs ring-background dark:inset-shadow-white/20 relative overflow-hidden rounded-[2rem] border bg-background/85 p-4 shadow-lg shadow-zinc-950/15 ring-1'>
                    <ShineBorder
                      borderWidth={1}
                      duration={20}
                      shineColor={['var(--primary)']}
                    />
                    <Image
                      className='bg-background relative hidden aspect-15/8 rounded-2xl object-contain object-top dark:block'
                      src={HERO_DARK_IMAGE_PATH}
                      alt='app screen'
                      width='2700'
                      height='1440'
                      priority
                    />
                    <Image
                      className='border-border/25 relative z-2 aspect-15/8 rounded-2xl border object-contain object-top dark:hidden'
                      src={HERO_LIGHT_IMAGE_PATH}
                      alt='app screen'
                      width='2700'
                      height='1440'
                    />
                  </div>
                </div>
              </div>
            </AnimatedGroup>
          </PageSection>

          {/* <PageSection className='pt-0 -mt-20 md:-mt-32 relative z-10 pb-8 md:pb-12'>
            <div className='flex flex-wrap items-center justify-center gap-6 px-6 text-base text-muted-foreground'>
              <span className='uppercase tracking-wide text-[0.8rem] font-semibold text-muted-foreground/85'>
                Built on
              </span>
              <div className='flex flex-wrap items-center gap-4'>
                <div className='rounded-full border border-border/60 bg-background/80 px-4 py-2'>
                  <span className='text-[0.9rem] font-semibold text-foreground'>Next.js</span>
                </div>
                <div className='rounded-full border border-border/60 bg-background/80 px-4 py-2'>
                  <span className='text-[0.9rem] font-semibold text-foreground'>Supabase</span>
                </div>
                <div className='rounded-full border border-border/60 bg-background/80 px-4 py-2'>
                  <span className='text-[0.9rem] font-semibold text-foreground'>Prisma</span>
                </div>
                <div className='rounded-full border border-border/60 bg-background/80 px-4 py-2'>
                  <span className='text-[0.9rem] font-semibold text-foreground'>oRPC</span>
                </div>
                <div className='rounded-full border border-border/60 bg-background/80 px-4 py-2'>
                  <span className='text-[0.9rem] font-semibold text-foreground'>Stripe</span>
                </div>
              </div>
            </div>
          </PageSection> */}

          {/* SECTION 1: Features */}
          <PageSection id='features' className='bg-background py-6 md:py-10 relative overflow-hidden'>
            {/* Enhanced gradient backdrop for glassmorphism */}
            <div 
              aria-hidden 
              className='absolute inset-0 pointer-events-none opacity-40'
              style={{
                background: 'radial-gradient(ellipse 100% 60% at 50% 40%, rgba(255,255,255,0.06), transparent 70%)'                
              }}              
            />
            
            <div className='mx-auto max-w-3xl text-center relative z-10'>
              <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                AI VIN intelligence for smarter used-car decisions
              </h2>
              <p className='mt-4 text-muted-foreground'>
                Auto VIN Scout starts with public data, marketplace signals, and transparent scoring so buyers can spot risk before they commit to the wrong car.
              </p>
            </div>

            <div className={cn('relative z-10 mx-auto mt-10 grid w-full gap-8 md:mt-12 md:grid-cols-2', alignedSurfaceWidth)}>
              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Rocket className='h-6 w-6 shrink-0 text-primary' />
                  <h2 className='text-sm font-semibold tracking-tight'>
                    VIN decode and first-pass risk
                  </h2>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Decode make, model, trim, engine, and core specs using NHTSA data.</li>
                  <li>Show a quick risk teaser before a buyer spends money on a deeper report.</li>
                </ul>
            </div>


              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Building2 className='h-6 w-6 shrink-0 text-primary' />
                  <h2 className='text-sm font-semibold tracking-tight'>
                    Marketplace history that adds context
                  </h2>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>
                    Track price changes, relists, and time-on-market across major listing sources.
                  </li>
                  <li>Spot asking prices that do not match local market behavior.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <ShieldCheck className='h-6 w-6 shrink-0 text-primary' />
                  <h2 className='text-sm font-semibold tracking-tight'>
                    Flood and recall exposure signals
                  </h2>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Blend FEMA hazard proximity with recent disaster data for exposure scoring.</li>
                  <li>Surface model-level recall density so buyers know what to inspect first.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Wrench className='h-6 w-6 shrink-0 text-primary' />
                  <h2 className='text-sm font-semibold tracking-tight'>
                    Buyer guidance you can actually use
                  </h2>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Turn detected risks into inspection questions and seller negotiation prompts.</li>
                  <li>Keep missing data visible so the report stays honest and trustworthy.</li>
                </ul>
              </div>
            </div>
          </PageSection>

          {/* SECTION 2: Who this is for */}
          <PageSection className='bg-background py-6 md:py-10 relative overflow-hidden'>
            {/* Enhanced gradient backdrop for glassmorphism */}
            <div 
              aria-hidden 
              className='absolute inset-0 pointer-events-none opacity-40'
              style={{
                background: 'radial-gradient(ellipse 100% 60% at 50% 40%, rgba(255,255,255,0.06), transparent 70%)'
              }}
            />
           <div className='mx-auto max-w-3xl text-center relative z-10'>
              <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                Who this is for
              </h2>
              <p className='mt-4 text-muted-foreground'>
                Built for people making real used-car decisions, especially when the seller has more information than the buyer.
              </p>
            </div>

            <div className={cn('relative z-10 mx-auto mt-10 grid w-full gap-8 md:mt-12 md:grid-cols-2', alignedSurfaceWidth)}>
              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Lightbulb className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    First-time used-car buyers
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Get plain-language risk signals before spending thousands on the wrong vehicle.</li>
                  <li>Know which issues deserve a mechanic follow-up and which are mostly noise.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Briefcase className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Remote shoppers and marketplace hunters
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Screen out risky listings before booking travel, delivery, or a third-party inspection.</li>
                  <li>See whether listing behavior and price movement feel consistent over time.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <FlaskConical className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Families buying on a budget
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Reduce the odds of inheriting flood, recall, or overpriced inventory problems.</li>
                  <li>Focus limited inspection time on the areas most likely to hide costly surprises.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Microscope className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Independent inspectors and small dealers
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>
                    Use the report as a structured starting point for client conversations.
                  </li>
                  <li>Bring faster context into sourcing, trade-in, and pre-purchase decisions.</li>
                </ul>
              </div>
            </div>
          </PageSection>

          {/* SECTION 3: How it works */}
          <PageSection id='how-it-works' className='bg-background py-6 md:py-10 relative overflow-hidden'>
            {/* Enhanced gradient backdrop for glassmorphism */}
            <div 
              aria-hidden 
              className='absolute inset-0 pointer-events-none opacity-40'
              style={{
                background: 'radial-gradient(ellipse 100% 60% at 50% 40%, rgba(255,255,255,0.06), transparent 70%)'
              }}
            />
            
            <div className='mx-auto max-w-3xl text-center relative z-10'>
              <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                How it works
              </h2>
              <p className='mt-4 text-muted-foreground'>
                Start with a VIN lookup, review the signals, and only go deeper when the vehicle earns a closer look.
              </p>
            </div>

            <div className={cn('relative z-10 mx-auto mt-10 grid w-full gap-8 md:mt-12 md:grid-cols-3', alignedSurfaceWidth)}>
              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
                    1
                  </div>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Start with a VIN lookup
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Enter a VIN to decode the vehicle identity and key factory specs.</li>
                  <li>Normalize the record with cached NHTSA vPIC data.</li>
                  <li>See model-level recall counts immediately.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
                    2
                  </div>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Review the risk teaser
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Compare the asking price and listing behavior against marketplace history.</li>
                  <li>Flag flood exposure probability using FEMA and disaster signals.</li>
                  <li>Surface a quick buy-with-caution versus investigate-further view.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
                    3
                  </div>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Unlock the full intelligence report
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Spend a credit to generate deeper scoring and report drivers.</li>
                  <li>Inspect the market timeline, pricing context, recall details, and risk breakdown.</li>
                  <li>Use the buyer guidance checklist to prepare for calls, inspections, and negotiations.</li>
                </ul>
              </div>
            </div>

            <div className='mt-12 font-bold flex justify-center md:mt-16'>
              <Button asChild size='lg'>
                <Link href={user ? '/dashboard' : '/get-started'}>
                  <span>{user ? 'Dashboard' : 'Start VIN Check'}</span>
                </Link>
              </Button>
            </div>
          </PageSection>

          {/* SECTION 4: Testimonials */}
          <PageSection className='bg-background py-6 md:py-10 relative overflow-hidden'>
            <div className='mx-auto max-w-3xl text-center'>
              <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                What buyers told us they need
              </h2>
              <p className='mt-4 text-muted-foreground'>
                The product is shaped around the real purchase anxiety behind used cars: hidden damage, bad pricing, and not knowing what to verify next.
              </p>
            </div>

            {TESTIMONIAL_TICKER_ENABLED ? (
              <div className={cn('mx-auto mt-10 w-full md:mt-12', alignedSurfaceWidth)}>
                <div className='testimonial-ticker relative overflow-hidden'>
                  {/* MOBILE: swipe carousel */}
                  <div className='md:hidden'>
                    <div
                      className='flex gap-4 overflow-x-auto px-4 py-6
                                 snap-x snap-mandatory
                                 [-webkit-overflow-scrolling:touch]
                                 [scrollbar-width:none]
                                 [&::-webkit-scrollbar]:hidden
                                 md:cursor-grab active:cursor-grabbing'
                    >
                      {TESTIMONIALS.map((t, idx) => (
                        <div
                          key={`m-${idx}`}
                          className={cn(
                            'w-[280px] flex-none snap-start rounded-2xl p-6 shadow-sm',
                            GLASS_CARD
                          )}
                        >
                          <p className='text-sm text-muted-foreground'>{t.quote}</p>
                          <div className='mt-4'>
                            <div className='text-sm font-semibold'>{t.name}</div>
                            <div className='text-xs text-muted-foreground'>{t.title}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className='pb-4 text-center text-xs text-muted-foreground'>
                      Swipe to read more →
                    </p>
                  </div>

                  {/* DESKTOP: auto marquee */}
                  <div className='hidden md:block'>
                    <div className='ticker-track flex gap-6 py-6 will-change-transform'>
                      <div className='flex gap-6 animate-marquee'>
                        {TESTIMONIALS.map((t, idx) => (
                          <div
                            key={`d1-${idx}`}
                            className={cn(
                              'w-[360px] flex-none rounded-2xl p-6 shadow-sm',
                              GLASS_CARD
                            )}
                          >
                            <p className='text-sm text-muted-foreground'>{t.quote}</p>
                            <div className='mt-4'>
                              <div className='text-sm font-semibold'>{t.name}</div>
                              <div className='text-xs text-muted-foreground'>{t.title}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Duplicate for seamless loop */}
                      <div className='flex gap-6 animate-marquee' aria-hidden='true'>
                        {TESTIMONIALS.map((t, idx) => (
                          <div
                            key={`d2-${idx}`}
                            className={cn(
                              'w-[360px] flex-none rounded-2xl p-6 shadow-sm',
                              GLASS_CARD
                            )}
                          >
                            <p className='text-sm text-muted-foreground'>{t.quote}</p>
                            <div className='mt-4'>
                              <div className='text-sm font-semibold'>{t.name}</div>
                              <div className='text-xs text-muted-foreground'>{t.title}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <p className='mt-3 hidden text-center text-xs text-muted-foreground md:block'>
                  Tip: Hover to pause.
                </p>
              </div>
            ) : (
              <div className='mx-auto mt-10 grid w-full max-w-5xl gap-8 md:mt-12 md:grid-cols-3'>
                {TESTIMONIALS.slice(0, 6).map((t, idx) => (
                  <div key={idx} className={cn(glassCardFlexBetween, GLASS_CARD)}>
                    <p className='text-sm text-muted-foreground'>{t.quote}</p>
                    <div className='mt-4'>
                      <div className='text-sm font-semibold'>{t.name}</div>
                      <div className='text-xs text-muted-foreground'>{t.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageSection>

          <PageSection className='bg-background py-6 md:py-10 relative overflow-hidden'>
            <div
              aria-hidden
              className='absolute inset-0 pointer-events-none opacity-40'
              style={{
                background: 'radial-gradient(ellipse 100% 60% at 50% 40%, rgba(255,255,255,0.06), transparent 70%)'
              }}
            />

            <div className='mx-auto max-w-3xl text-center relative z-10'>
              <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                Upcoming features
              </h2>
              <p className='mt-4 text-muted-foreground'>
                Once the public-data foundation is proven, the next release expands into official history, stronger verification, and dealer-grade tooling.
              </p>
            </div>

            <div className={cn('relative z-10 mx-auto mt-10 flex w-full justify-center md:mt-12', alignedSurfaceWidth)}>
              <div className={cn(glassCardBase, 'max-w-md', GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Briefcase className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Market forecasting and dealer tools
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Add depreciation analytics based on historical model performance and local market behavior.</li>
                  <li>Expand into white-label workflows for dealerships evaluating inventory or sharing transparency reports.</li>
                </ul>
              </div>

              {/* Hidden upcoming feature cards — uncomment when ready to ship */}
              {/* <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <ShieldCheck className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Official title and odometer history
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Integrate NMVTIS for official title brands such as salvage, rebuilt, or junk.</li>
                  <li>Bring verified odometer readings into the report instead of relying on derived signals alone.</li>
                </ul>
              </div> */}

              {/* <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Building2 className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Insurance and theft indicators
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Connect NICB VINCheck style signals for theft confirmation and salvage indicators.</li>
                  <li>Close some of the biggest trust gaps that public sources alone cannot resolve.</li>
                </ul>
              </div> */}

              {/* <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Microscope className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Stronger mileage verification
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Layer in time-series odometer signals from commercial inspection partners.</li>
                  <li>Improve fraud detection when listing mileage does not fit the vehicle timeline.</li>
                </ul>
              </div> */}
            </div>
          </PageSection>
          
          
          {/* SECTION: API First Platform */}
          <PageSection id='api' className='bg-background py-6 md:py-10 relative overflow-hidden'>
            <div
              aria-hidden
              className='absolute inset-0 pointer-events-none opacity-40'
              style={{
                background: 'radial-gradient(ellipse 100% 60% at 50% 40%, rgba(255,255,255,0.06), transparent 70%)'
              }}
            />

            <div className='mx-auto max-w-3xl text-center relative z-10'>
              <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                Upcoming - API First Platform
              </h2>
              <p className='mt-4 text-muted-foreground'>
                Integrate VIN intelligence directly into your own applications, workflows, and dealer tools with a clean, developer-friendly API.
              </p>
            </div>

            <div className={cn('relative z-10 mx-auto mt-10 grid w-full gap-8 md:mt-12 md:grid-cols-3', alignedSurfaceWidth)}>
              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Code className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Simple REST endpoints
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Decode any VIN and retrieve structured risk data in a single request.</li>
                  <li>JSON responses designed for easy integration with any stack.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Zap className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Built for scale
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Rate-limited tiers from individual developers to high-volume dealer integrations.</li>
                  <li>Cached NHTSA and marketplace data for fast, consistent response times.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Rocket className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Extend your product
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Embed risk scores, flood signals, and recall data into your own UI or reports.</li>
                  <li>White-label ready for dealerships, inspectors, and marketplace platforms.</li>
                </ul>
              </div>
            </div>
          </PageSection>
          
          
          {/* SECTION 5: PRICING */}
          <PageSection id='pricing' className='bg-background py-6 md:py-10 relative overflow-hidden'>
            {/* Very subtle gradient backdrop */}
            <div 
              aria-hidden 
              className='absolute inset-0 pointer-events-none opacity-40'
              style={{
                background: 'radial-gradient(ellipse 100% 60% at 50% 40%, rgba(255,255,255,0.02), transparent 70%)'
              }}
            />
            
            <div className='flex flex-col items-center gap-4 text-center relative z-10'>
              <h2 className='text-3xl font-bold md:text-4xl'>{PRICE_HEADING}</h2>
            </div>
            <div className='mt-10 md:mt-12 relative z-10'>
              <PricingComponent
                currentPlanId={currentPlanId}
                isAuthenticated={!!user}
                mode='marketing'
                proExhausted={proExhausted}
              />
            </div>
          </PageSection>
        </div>
      </main>
    </>
  )
}
