// app/(marketing)/faqs/page.tsx

import { FaqList } from '@/app/(marketing)/_components/FaqList';
import {
  MARKETING_ALIGNED_CONTAINER_WIDTH,
  MARKETING_ALIGNED_CONTENT_WIDTH,
  MARKETING_CONTENT_SECTION_BOTTOM_SPACING,
  MARKETING_CONTENT_SECTION_TOP_SPACING,
  PageSection,
} from '@/components/page-section';
import { Badge } from '@/components/ui/badge';
// import { cn } from '@/lib/utils';
// import { AnimatePresence, motion } from 'framer-motion';
// import { MinusIcon, PlusIcon } from 'lucide-react';
// import { useState } from 'react';



export default function FaqPage() {
  return (
    <PageSection
      className={`bg-background ${MARKETING_CONTENT_SECTION_TOP_SPACING} ${MARKETING_CONTENT_SECTION_BOTTOM_SPACING}`}
      containerClassName={MARKETING_ALIGNED_CONTAINER_WIDTH}
    >
      <div className='flex flex-col items-center space-y-6 px-4'>
        <Badge
          variant='outline'
          className='border-primary mb-4 px-3 py-1 text-xs font-medium tracking-wider uppercase'
        >
          FAQs
        </Badge>

        <h1 className='text-foreground mt-3 text-center text-4xl font-bold tracking-tight md:text-5xl'>
          Frequently Asked Questions
        </h1>

        <p className='text-muted-foreground max-w-2xl text-center'>
          Answers about reports, data sources, and how Auto VIN Scout fits into your buying process.
        </p>
      </div>

      {/* 
         The heavy interactive logic is isolated here. 
         Ideally, wrap this in Suspense if it fetches data, 
         but even as is, it decouples the header rendering from the JS load.
      */}
      <div className={MARKETING_ALIGNED_CONTENT_WIDTH}>
        <FaqList />
      </div>

      <div className='mx-auto mt-6 w-full max-w-3xl text-center'>
        <p className='text-muted-foreground mb-4'>
          Need help with a specific VIN or report question?
        </p>
        <a
          href='/contact'
          className='border-primary text-foreground hover:bg-primary hover:text-primary-foreground mt-4 inline-flex items-center justify-center rounded-lg border-2 px-6 py-3 font-medium transition-colors'
        >
          Contact Us
        </a>
      </div>
    </PageSection>
  )
}
