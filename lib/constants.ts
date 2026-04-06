// lib/constants.ts

// glassmorphism design - light shade for better visibility
export const GLASS_CARD =
  'bg-white/[0.08] backdrop-blur-md border border-border ring-1 ring-border/50'

// ✅ NEXT APP
export const LOCAL_SITE_URL = process.env.LOCAL_SITE_URL || 'http://localhost:3000'
export const PRODUCTION_URL = process.env.PRODUCTION_URL || ''
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || ''

// ✅ COLOR SCHEME AND MODE
export const DEFAULT_COLOR_SCHEME = `theme-green` as string
export const DEFAULT_THEME_MODE = `dark` as string

// ✅ LOCALE
export const LOCALE = `en_US`
export const DEFAULT_CURRENCY = `USD`

export function formatPrice(
  price: string | number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = LOCALE
) {
  const amount = typeof price === 'string' ? Number(price) : price
  const resolvedLocale = locale.replace('_', '-')
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount}`
  }
}

// ✅ SOCIALS AND SEO
export const NEXT_PUBLIC_SITE_NAME = `Auto VIN Scout` as string
export const APP_SLOGAN = `⚡ Buy your next car with total confidence.` as string
export const APP_DESCRIPTION = `Probabilistic risk assessment based on over numerous market factors.` as string
export const APP_DESCRIPTION_LONG =
  `A comprehensive decision support system that aggregates NHTSA data, market behavior, and environmental hazards to give you a clear 'buy' or 'avoid' signal for any VIN.` as string
export const KEYWORDS_LST: string[] = [
  'Saas,Next.js',
  'TypeScript',
  'Tailwind CSS',
  'ShadCN,Kinde',
  'Supabase',
]
  .flatMap((keywordGroup) => keywordGroup.split(','))
  .map((keyword) => keyword.trim())

// Define the HANDLES as the single source of truth.
export const SOCIAL_HANDLES = {
  twitter: '@yourdomain',
  youtube: '@yourchannel',
  facebook: 'yourdomain', // No '@' for Facebook pages
  instagram: 'yourdomain', // No '@'
  tiktok: '@yourdomain',
  linkedin: 'yourcompany', // This is the company slug, not a handle
}

// CONSTRUCT the full links from the handles.
export const SOCIAL_LINKS = {
  twitter: `https://x.com/${SOCIAL_HANDLES.twitter.replace('@', '')}`,
  youtube: `https://youtube.com/${SOCIAL_HANDLES.youtube}`,
  facebook: `https://facebook.com/${SOCIAL_HANDLES.facebook}`,
  instagram: `https://instagram.com/${SOCIAL_HANDLES.instagram}`,
  tiktok: `https://tiktok.com/${SOCIAL_HANDLES.tiktok}`,
  linkedin: `https://linkedin.com/company/${SOCIAL_HANDLES.linkedin}`,
}

// ✅ Contact
export const APP_EMAIL = `mail@example.com` as string
export const APP_OFFICE_ADDRESS = `Building Number: 2200, Street Name: Fairmount Avenue, Street Address: Philadelphia Museum of Art, 'Rocky Steps'
State: PA
City: Philadelphia
Post Code: 19130` as string
export const APP_PHONE_1 = `+1 xxx xxxx` as string
export const APP_PHONE_2 = `+1 xxx xxxx` as string

// ✅ Pricing
export const STRIPE_PRICE_ID_pro = (process.env.STRIPE_PRICE_ID_pro || '') as string
export const STRIPE_PRICE_ID_proplus = (process.env.STRIPE_PRICE_ID_proplus || '') as string

// A new type definition for a pricing plan
export const PRICE_HEADING = `Flexible plans, no hidden complexity` as string
export const PLAN_IDS = {
  free: 'RZ5wzP!PwpF%gj',       // random generated
  pro: 'X6t!RNJPq#7Jdb',       // random generated
  proplus: 'Y9vLm#K2sP!Q4w'    // random generated
} as const

export const CREDITS_FREE: number = 5
export const CREDITS_PRO: number = 50
export const CREDITS_PROPLUS: number = 100

export type PlanId = (typeof PLAN_IDS)[keyof typeof PLAN_IDS]

export type PricingPlan = {
  id: PlanId
  title: string
  price: string
  priceSuffix: string
  description: string
  credits: number
  features: string[]
  stripePriceId?: string // Optional because 'Free' plan has no Stripe ID
}

// Define the three plans using the new type
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: PLAN_IDS.free,
    title: 'Free',
    price: '0',
    priceSuffix: '/mo',
    description: 'Lorem ipsum dolor sit amet',
    credits: CREDITS_FREE,
    features: [
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
    ],
    stripePriceId: undefined,
  },
  {
    id: PLAN_IDS.pro,
    title: 'Pro',
    price: '9.99',
    priceSuffix: '/mo',
    description: 'Lorem ipsum dolor sit amet',
    credits: CREDITS_PRO,
    features: [
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
    ],
    stripePriceId: STRIPE_PRICE_ID_pro,
  },
  {
    id: PLAN_IDS.proplus,
    title: 'Pro Plus',
    price: '19.99',
    priceSuffix: '/mo',
    description: 'Lorem ipsum dolor sit amet',
    credits: CREDITS_PROPLUS,
    features: [
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscingr',
      'Lorem ipsum dolor sit amet, consetetur sadipscingl',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
    ],
    stripePriceId: STRIPE_PRICE_ID_proplus,
  },  
]

export const RENEWAL_REMINDER_DAYS_BEFORE = 3
export const CREDIT_REMINDER_THRESHOLD = 4
export const FREE_REFILL_DAYS = 30
export const SOFT_DELETE_RETENTION_DAYS = 30
// ✅ Subscription Renewal
export const SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD = 20
export const ENABLE_EMAILS = true
export const CHECK_DISPOSABLE_EMAILS = true
export const INVITE_EXPIRATION_MS = 60 * 60 * 1000

// ✅ Multi-Tenancy Limits & Configuration
const MAX_ORG_ENV_PUBLIC = Number(process.env.NEXT_PUBLIC_MAX_ORGANIZATIONS_PER_USER)
const MAX_ORG_ENV_SERVER = Number(process.env.MAX_ORGANIZATIONS_PER_USER)
const MAX_ORG_ENV =
  Number.isFinite(MAX_ORG_ENV_PUBLIC) && MAX_ORG_ENV_PUBLIC > 0
    ? MAX_ORG_ENV_PUBLIC
    : MAX_ORG_ENV_SERVER
const RESOLVED_MAX_ORGS =
  Number.isFinite(MAX_ORG_ENV) && MAX_ORG_ENV > 0 ? MAX_ORG_ENV : 1

export const LIMITS = {
  MAX_ORGANIZATIONS_PER_USER: RESOLVED_MAX_ORGS,
  MAX_PROJECTS_PER_ORGANIZATION: 5,
  MAX_MEMBERS_PER_ORGANIZATION: 5,
  MAX_PENDING_INVITES_PER_ORG: 3,
} as const

export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const

export type OrganizationRole = keyof typeof ROLES

// Testimonials section on Main Landing Page
export const TESTIMONIAL_TICKER_ENABLED = true

export type Testimonial = {
  quote: string
  name: string
  title: string
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      '“Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.”',
    name: 'John Doe',
    title: 'CEO, Company',
  },
  {
    quote:
      '“Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.”',
    name: 'Jason L.',
    title: 'CTO, Company',
  },
  {
    quote:
      '“Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.”',
    name: 'Nina P.',
    title: 'CTO, Company',
  },
  {
    quote:
      '“Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.”',
    name: 'Mark D.',
    title: 'CTO, Company',
  },
  {
    quote:
      '“Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.”',
    name: 'Ayesha K.',
    title: 'CTO, Company',
  },
  {
    quote:
      '“Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.”',
    name: 'Luis R.',
    title: 'CTO, Company',
  },
]

