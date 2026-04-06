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
  category: 'general' | 'reports' | 'data' | 'account'
}

const faqItems: FaqItem[] = [
  {
    id: '1',
    question: 'What does Auto VIN Scout check?',
    answer:
      'Auto VIN Scout combines VIN decoding, recall context, listing behavior, market pricing signals, and flood exposure indicators to help you spot risk before you commit to a used car.',
    category: 'general',
  },
  {
    id: '2',
    question: 'Is this a replacement for a mechanic inspection?',
    answer:
      'No. It is a decision-support layer, not a physical inspection. The goal is to help you decide which cars deserve deeper inspection and which questions to ask before you spend more time or money.',
    category: 'general',
  },
  {
    id: '3',
    question: 'Who is this built for?',
    answer:
      'It is built for used-car buyers, remote shoppers, families, brokers, and small dealers who need a faster way to screen listings and focus on the vehicles worth verifying.',
    category: 'general',
  },
  {
    id: '4',
    question: 'What is included in the initial VIN review?',
    answer:
      'The initial review focuses on the decoded vehicle identity, key factory specs, and model-level recall context so you can quickly confirm that the listing matches the VIN.',
    category: 'reports',
  },
  {
    id: '5',
    question: 'What do I get in the full report?',
    answer:
      'The full report adds deeper scoring, market timeline context, pricing signals, flood exposure indicators, and buyer guidance that turns the findings into inspection and negotiation prompts.',
    category: 'reports',
  },
  {
    id: '6',
    question: 'How should I use the report before contacting a seller?',
    answer:
      'Start with the risk summary, then review the report drivers and buyer guidance. That gives you a short list of items to confirm with the seller and a sharper checklist for a mechanic or third-party inspection.',
    category: 'reports',
  },
  {
    id: '7',
    question: 'Where does the vehicle data come from?',
    answer:
      'The platform currently uses public and marketplace-accessible sources, including NHTSA decoding and recall data, listing history signals, and environmental risk inputs such as FEMA-related hazard context.',
    category: 'data',
  },
  {
    id: '8',
    question: 'Does a high flood score mean the car was definitely flooded?',
    answer:
      'No. Flood scoring is directional, not absolute. It helps identify vehicles that deserve closer scrutiny based on geography, timing, and related signals, but it does not claim to prove a title event by itself.',
    category: 'data',
  },
  {
    id: '9',
    question: 'How should I read the market pricing signal?',
    answer:
      'Treat it as context, not a guarantee. It helps show whether the asking price and listing behavior look typical or unusual compared with similar vehicles and local market movement.',
    category: 'data',
  },
  {
    id: '10',
    question: 'Do I need an account to start checking VINs?',
    answer:
      'You can begin with the initial experience quickly, but creating an account is the best way to save reports, manage credits, and come back to the vehicles you are comparing.',
    category: 'account',
  },
  {
    id: '11',
    question: 'Can I use this for multiple vehicles while shopping?',
    answer:
      'Yes. It is designed for comparison shopping. Many buyers use it to narrow a long shortlist into the few cars worth inspecting or negotiating on.',
    category: 'account',
  },
  {
    id: '12',
    question: 'Are more data sources coming?',
    answer:
      'Yes. The roadmap includes broader verification sources and stronger ownership-history coverage so the report can move beyond public and marketplace-accessible signals over time.',
    category: 'data',
  },
]

const categories = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'reports', label: 'Reports' },
  { id: 'data', label: 'Data Sources' },
  { id: 'account', label: 'Account' },
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
        <AnimatePresence initial={false}>
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

              <AnimatePresence initial={false}>
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
