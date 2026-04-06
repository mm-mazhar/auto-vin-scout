// app/(marketing)/_components/hero-section.tsx

import { AnimatedGroup } from '@/app/(marketing)/_components/ui/animated-group'
import AnimatedShinyText from '@/app/(marketing)/_components/ui/animated-shiny-text'
import { HyperText } from '@/app/(marketing)/_components/ui/hyper-text'
import TextEffect from '@/app/(marketing)/_components/ui/text-effect'
import { PageSection } from '@/components/page-section'
import PricingComponent from '@/components/PricingComponent'
import { Button } from '@/components/ui/button'
import { ShineBorder } from '@/components/ui/shine-border'
import {
  Briefcase,
  Building2,
  FlaskConical,
  Lightbulb,
  Microscope,
  Rocket,
  ShieldCheck,
  Wrench
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

const HERO_LIGHT_IMAGE_PATH = '/HeroDark-02.png'
const HERO_DARK_IMAGE_PATH = '/HeroDark-03.png'

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
    return null
  })()

  const proCredits =
    PRICING_PLANS.find((p) => p.id === PLAN_IDS.proplus)?.credits ?? 0
  const proExhausted =
    subStatus === 'active' && currentPlanId === PLAN_IDS.proplus
      ? creditsUsed >= proCredits
      : false

  const glassCardBase = 'flex flex-col rounded-2xl p-5 text-left shadow-sm'
  const glassCardFlexBetween =
    'flex h-full flex-col justify-between rounded-2xl p-6 text-left shadow-sm'

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
                      <span className='text-nowrap'>Go to Dashboard</span>
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size='lg' variant='default' className='font-bold px-5'>
                    <Link href='/get-started'>
                      <span className='text-nowrap'>Go To Dashboard</span>
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
              <div className='mask-b-from-55% relative overflow-hidden px-2'>
                <div className='inset-shadow-2xs ring-background dark:inset-shadow-white/20 relative mx-auto max-w-6xl overflow-hidden rounded-2xl border bg-background p-4 shadow-lg shadow-zinc-950/15 ring-1'>
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
            </AnimatedGroup>
          </PageSection>

          <PageSection className='pt-0 -mt-20 md:-mt-32 relative z-10 pb-8 md:pb-12'>
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
          </PageSection>

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
                Everything you need for a real SaaS
              </h2>
              <p className='mt-4 text-muted-foreground'>
                Stop wiring the same infrastructure from scratch. This kit focuses on the hard, boring parts so you can focus on your product.
              </p>
            </div>

            <div className='mx-auto mt-10 grid w-full max-w-6xl gap-8 md:mt-12 md:grid-cols-2 relative z-10'>
              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Rocket className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>Launch in days, not months</h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Prewired auth, billing, and dashboard flows.</li>
                  <li>kip boilerplate setup and ship usable features faster.</li>
                </ul>
            </div>


              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Building2 className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Multi-tenant out of the box
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>
                    Organizations, members, and roles modeled for you.
                  </li>
                  <li>Designed to work cleanly with row-level security.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <ShieldCheck className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Built-in auth, billing, RBAC
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Supabase Auth for signup, login, and sessions.</li>
                  <li>Stripe subscriptions, credits, and role-based access control.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Wrench className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Production-grade patterns
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Structured API layer and error handling.</li>
                  <li>Patterns oriented toward long-term maintainability.</li>
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
                Whether you are validating an idea or standardizing client projects, this kit gives you a solid SaaS foundation.
              </p>
            </div>

            <div className='mx-auto mt-10 grid w-full max-w-6xl gap-8 md:mt-12 md:grid-cols-2 relative z-10'>
              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Lightbulb className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Solo founders
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Avoid rebuilding auth, billing, and dashboards.</li>
                  <li>Focus on your core idea and customer value.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Briefcase className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Agencies shipping SaaS for clients
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Start every project from a proven multi-tenant template.</li>
                  <li>Deliver more value per engagement with less setup time.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <FlaskConical className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Product teams validating new ideas
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Prototype with real orgs, roles, and subscriptions.</li>
                  <li>Test pricing and onboarding flows early.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <Microscope className='h-6 w-6 shrink-0 text-primary' />
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Developers wanting a production-ready template
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>
                    Study a full-stack reference implementation.
                  </li>
                  <li>Reuse patterns instead of stitching together examples.</li>
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
                Go from clone to charging customers in three straightforward steps.
              </p>
            </div>

            <div className='mx-auto mt-10 grid w-full max-w-6xl gap-8 md:mt-12 md:grid-cols-3 relative z-10'>
              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
                    1
                  </div>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Clone and configure environment
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>
                    Clone the repo and install dependencies.
                  </li>
                  <li>Configure environment vars and secrets.</li>
                  <li>Connect your database and Supabase project.</li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
                    2
                  </div>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Customize domain logic and UI
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Plug in your product-specific features and flows.</li>
                  <li>Adjust data models to match your domain.</li>
                  <li>
                    Refine marketing copy and visual branding.
                  </li>
                </ul>
              </div>

              <div className={cn(glassCardBase, GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
                    3
                  </div>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Deploy and start charging
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Deploy to your preferred hosting platform.</li>
                  <li>
                    Wire up Stripe for payments and subscriptions.
                  </li>
                  <li>
                    Invite your first customers and iterate.
                  </li>
                </ul>
              </div>
            </div>

            <div className='mt-12 font-bold flex justify-center md:mt-16'>
              <Button asChild size='lg'>
                <Link href={user ? '/dashboard' : '/get-started'}>
                  <span>{user ? 'Go to Dashboard' : 'Get Started'}</span>
                </Link>
              </Button>
            </div>
          </PageSection>

          {/* SECTION 4: Testimonials */}
          <PageSection className='bg-background py-6 md:py-10 relative overflow-hidden'>
            <div className='mx-auto max-w-3xl text-center'>
              <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                What people are saying
              </h2>
              <p className='mt-4 text-muted-foreground'>
                People use this kit to skip boilerplate and focus on the parts of their SaaS that actually differentiate.
              </p>
            </div>

            {TESTIMONIAL_TICKER_ENABLED ? (
              <div className='mx-auto mt-10 w-full max-w-6xl md:mt-12'>
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
