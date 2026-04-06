// app/(marketing)/_components/FaqList.tsx

'use client'

// import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'

// Move interfaces and data here
interface FaqItem {
  id: string
  question: string
  answer: string
  category: 'general' | 'pricing' | 'technical' | 'roles'
}

const faqItems: FaqItem[] = [
  // --- GENERAL ---
  {
    id: '1',
    question: 'What is Next SaaS Kit?',
    answer:
      'Next SaaS Kit is a comprehensive boilerplate for building multi-tenant SaaS applications. It comes pre-configured with Authentication, Organization management, Billing (Stripe), and Role-Based Access Control.',
    category: 'general',
  },
  {
    id: '2',
    question: 'Can I create multiple organizations?',
    answer:
      'Yes! You can create multiple organizations (workspaces) under a single user account. Each organization has its own billing, credits, projects, and team members.',
    category: 'general',
  },
  {
    id: '3',
    question: 'How do I switch between organizations?',
    answer:
      'You can switch between your organizations using the Team Switcher in the top-left corner of the dashboard sidebar. Your active context (billing and projects) will update immediately.',
    category: 'general',
  },

  // --- TECHNICAL ---
  {
    id: '4',
    question: 'Is my data isolated from other organizations?',
    answer:
      "Yes. Data is strictly scoped to the Organization ID. Even if you belong to multiple organizations, you can only see projects and data belonging to the organization you are currently viewing.",
    category: 'technical',
  },
  {
    id: '5',
    question: 'How do I invite my team?',
    answer:
      "Go to Settings > Organization > Members. Click 'Invite Member' and enter their email. You can choose to invite them as an Admin or a regular Member.",
    category: 'technical',
  },

  // --- PRICING (Updated for Organization-based Billing) ---
  {
    id: '9',
    question: 'How does the Free Plan credit system work?',
    answer:
      'Your Primary Organization receives a monthly allowance of 5 credits for free. These credits are shared among all members of that organization. This allowance resets monthly on the anniversary of your organization creation.',
    category: 'pricing',
  },
  {
    id: '10',
    question: 'Who pays for the credits, the User or the Organization?',
    answer:
      'Billing is attached to the Organization, not the User. This means if you subscribe to Pro, those credits belong to the Organization "wallet". Any member of the team can use them to create projects.',
    category: 'pricing',
  },
  {
    id: '12',
    question: 'If I upgrade to the Pro/Pro Plus Plan, does my whole team get access?',
    answer:
      'Yes! The subscription applies to the entire Organization. Once you upgrade an Organization to Pro, all members (Owners, Admins, and Members) gain access to Pro features and the 100 shared monthly credits.',
    category: 'pricing',
  },
  {
    id: '13',
    question: 'What happens if I create a second Organization?',
    answer:
      'Secondary organizations start with 0 credits. To use them, you must upgrade that specific organization to Pro/Pro Plus plans. This allows you to keep billing separate for different clients or projects.',
    category: 'pricing',
  },
  {
    id: '14',
    question: 'If I delete an Organization, what happens to my subscription?',
    answer:
      'For your safety, our system automatically cancels any active Stripe subscription associated with an Organization the moment you delete it. It also, ask you to transfer any remaining credits to any another Organization which you own.',
    category: 'pricing',
  },

  // --- ROLES & ACCESS (New Category) ---
  {
    id: '15',
    question: 'What permissions does an Owner have?',
    answer:
      'The Owner has full control. They can manage billing, invite/remove users, change roles, rename the organization, and delete the organization. An organization must always have at least one Owner.',
    category: 'roles',
  },
  {
    id: '16',
    question: 'What can an Admin do?',
    answer:
      'Admins can manage the team (invite and remove members) and manage Billing/Subscriptions. However, Admins cannot delete the Organization or remove the Owner.',
    category: 'roles',
  },
  {
    id: '17',
    question: 'What can a Member do?',
    answer:
      'Members are regular users. They can create and edit Projects and consume the organization\'s credits. They cannot see the Billing page, invite users, or change organization settings.',
    category: 'roles',
  },
  {
    id: '18',
    question: 'Can I change a member\'s role after inviting them?',
    answer:
      'Yes. Owners and Admins can promote or demote members via the Organization Settings page. However, an Admin cannot demote an Owner.',
    category: 'roles',
  },
  {
    id: '19',
    question: 'What happens if I run out of credits before my billing cycle ends?',
    answer:
      'If your balance drops below 20 credits, you have two options: renew your current plan immediately or upgrade to the Pro Plus plan. Doing so will start a new billing cycle instantly and replenish your credits. Please note that while your credits top up, any remaining days from your previous billing period are not carried over.',
    category: 'pricing',
  },
  {
    id: '20',
    question: 'What happens when I upgrade to the Pro Plus plan?',
    answer:
      'Upgrading immediately ends your current Pro subscription and starts a new Pro Plus billing cycle. Your new credit allowance will be added to your account, and any unused credits from your previous plan will roll over. However, any remaining time from your previous billing cycle will be forfeited.',
    category: 'pricing',
  },
];

const categories = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'roles', label: 'Roles & Access' },
  { id: 'technical', label: 'Technical' },
]

export function FaqList() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredFaqs =
    activeCategory === 'all'
      ? faqItems
      : faqItems.filter((item) => item.category === activeCategory)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <>
      {/* Category Tabs */}
      <div className='flex flex-col items-center space-y-8 px-4'>
        <div className='mt-8 flex flex-wrap justify-center gap-2'>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                activeCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 mt-8 sm:grid-cols-2'>
        <AnimatePresence mode='wait' initial={false}>
          {filteredFaqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={cn(
                'border-border h-fit overflow-hidden rounded-xl border',
                expandedId === faq.id ? 'shadow-3xl bg-card/50' : 'bg-card/50'
              )}
              style={{ minHeight: '112px' }}
            >
              <button
                onClick={() => toggleExpand(faq.id)}
                className='flex w-full items-center justify-between p-6 text-left min-h-[112px]'
              >
                <h3 className='text-foreground text-lg font-medium'>
                  {faq.question}
                </h3>
                <div className='ml-4 flex-shrink-0'>
                  {expandedId === faq.id ? (
                    <MinusIcon className='text-primary h-5 w-5' />
                  ) : (
                    <PlusIcon className='text-primary h-5 w-5' />
                  )}
                </div>
              </button>

              <AnimatePresence mode='wait' initial={false}>
                {expandedId === faq.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className='overflow-hidden'
                  >
                    <div className='border-border border-t px-6 pt-2 pb-6'>
                      <p className='text-muted-foreground'>{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}