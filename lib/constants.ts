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

// ✅ EMAIL BRANDING
export const EMAIL_BUTTON_BG = `#22c55e` as string
export const EMAIL_BUTTON_TEXT = `#ffffff` as string
export const EMAIL_LOGO_URL = process.env.NODE_ENV === 'development'
  ? `https://qjyielclapaimupufxcr.supabase.co/storage/v1/object/public/assets/autovinscout-logo-dark-01.png`
  : `https://iuthcvepcccuhyfioiqf.supabase.co/storage/v1/object/public/assets/autovinscout-logo-dark-01.png`

// ✅ LOCALE
export const LOCALE = `en_US`
export const DEFAULT_CURRENCY = `USD`
export const OPENAPI_SPEC_VERSION = `1.0.0`

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
export const NEXT_PUBLIC_SITE_NAME = `AutoVINScout` as string
export const APP_SLOGAN = `⚡ AI Risk Intelligence for smarter used-car buying.` as string
export const APP_DESCRIPTION = `Probabilistic Risk Modeling` as string
// export const APP_DESCRIPTION = `Probabilistic Risk Modeling. Check a VIN before you trust the listing.` as string
export const APP_DESCRIPTION_LONG =
  `Check a VIN before you trust the listing. Buying expensive Reports. Decode the vehicle, compare listing behavior against the market, and review flood and recall signals in one report built for buyers who want clearer next steps.` as string
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
export const STRIPE_PRICE_ID_basic = (process.env.STRIPE_PRICE_ID_basic || '') as string
export const STRIPE_PRICE_ID_pro = (process.env.STRIPE_PRICE_ID_pro || '') as string
export const STRIPE_PRICE_ID_dealercore = (process.env.STRIPE_PRICE_ID_dealercore || '') as string
export const STRIPE_PRICE_ID_dealerplus = (process.env.STRIPE_PRICE_ID_dealerplus || '') as string

// A new type definition for a pricing plan
export const PRICE_HEADING = `Flexible plans, no hidden complexity` as string
export const PLAN_IDS = {
  free: 'free_plan',
  basic: 'basic_report',
  pro: 'pro_plan',
  dealercore: 'dealer_core',
  dealerplus: 'dealer_plus',
} as const

export const CREDITS_FREE: number = 0
export const CREDITS_BASIC: number = 3
export const CREDITS_PRO: number = 10
export const CREDITS_DEALERCORE: number = 100
export const CREDITS_DEALERPLUS: number = 200

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

// Define the plans using the pricing strategy
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: PLAN_IDS.free,
    title: 'Free',
    price: '0',
    priceSuffix: '',
    description: 'Create an account to save your search history.',
    credits: CREDITS_FREE,
    features: ['Account Creation', 'Save Search History'],
    stripePriceId: undefined,
  },
  {
    id: PLAN_IDS.basic,
    title: 'Basic',
    price: '29.99',
    priceSuffix: ' one-time',
    description: `Deep dive into few vehicles. Credits: ${CREDITS_BASIC}`,
    credits: CREDITS_BASIC,
    features: ['vPIC VIN Decode', 'Market Anomalies', 'Local Market Band', 'FEMA Flood Zones', 'Basic Inspection Checklist'],
    stripePriceId: STRIPE_PRICE_ID_basic,
  },
  {
    id: PLAN_IDS.pro,
    title: 'Pro',
    price: '59.99',
    priceSuffix: '/mo',
    description: `For power buyers/flippers. Credits: ${CREDITS_PRO}`,
    credits: CREDITS_PRO,
    features: [
      'Everything in Basic',
      'Title Branding & Salvage Records',
      'Auction / Wholesale Data',
      'Legal & Title Verification',
    ],
    stripePriceId: STRIPE_PRICE_ID_pro,
  },
  {
    id: PLAN_IDS.dealercore,
    title: 'Core',
    price: '199.99',
    priceSuffix: '/mo',
    description: `For small used car lots. Credits: ${CREDITS_DEALERCORE}`,
    credits: CREDITS_DEALERCORE,
    features: [
      'Everything in Pro',
      'Inventory Risk Scoring',
      'Wholesale Signals',
    ],
    stripePriceId: STRIPE_PRICE_ID_dealercore,
  },
  {
    id: PLAN_IDS.dealerplus,
    title: 'Core Plus',
    price: '499.99',
    priceSuffix: '/mo',
    description: `For franchise dealers. Credits: ${CREDITS_DEALERPLUS}`,
    credits: CREDITS_DEALERPLUS,
    features: [
      'Everything in Core',
      'Priority Title Checks',
      'Full Predictive Engine',
      'Depreciation Forecasts',
    ],
    stripePriceId: STRIPE_PRICE_ID_dealerplus,
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
      '“If a VIN tool can tell me a truck spent weeks being relisted in a flood-prone county, that saves me from a six-hour drive.”',
    name: 'Marcus T.',
    title: 'Used truck shopper',
  },
  {
    quote:
      '“The recall count is useful, but the inspection checklist is what makes this practical. It tells me what to ask before I pay a mechanic.”',
    name: 'Priya S.',
    title: 'First-time buyer',
  },
  {
    quote:
      '“I like that it uses probability language instead of pretending it knows everything. That makes the report feel more trustworthy.”',
    name: 'Daniel R.',
    title: 'Remote marketplace buyer',
  },
  {
    quote:
      '“A quick free decode with a gated deeper report is exactly how I want to triage the dozens of listings I review each week.”',
    name: 'Jasmine L.',
    title: 'Independent auto broker',
  },
  {
    quote:
      '“Most VIN tools dump data on you. I need something that tells me where the real risk is and what I should verify next.”',
    name: 'Kevin M.',
    title: 'Family SUV shopper',
  },
  {
    quote:
      '“Market pricing plus flood and recall signals would be enough for me to decide which cars deserve a paid inspection.”',
    name: 'Elena G.',
    title: 'Budget-conscious buyer',
  },
]


export const ISLAUNCHED = false

export const NHTSA_VIN_DECODER = 'https://vpic.nhtsa.dot.gov'
export const NHTSA_RECALLS = 'https://api.nhtsa.gov'

export const PREMIUM_VIN_PROVIDER = process.env.PREMIUM_VIN_PROVIDER || ''
export const PREMIUM_VIN_API_KEY = process.env.PREMIUM_VIN_API_KEY || ''
export const PREMIUM_VIN_API_SECRET = process.env.PREMIUM_VIN_API_SECRET || ''
export const PREMIUM_VIN_BASE_URL = 'https://stag-mc-api.marketcheck.com'
export const PREMIUM_VIN_TIMEOUT_MS = 10000 // 10 seconds

// Weather Services
export const OPEN_METEO_BASE = 'https://archive-api.open-meteo.com/v1/archive'
export const MAX_CLUSTERS = 3
export const DATE_WINDOW_DAYS = 5


