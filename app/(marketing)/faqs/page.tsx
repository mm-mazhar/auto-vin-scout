// app/(marketing)/faqs/page.tsx

import { FaqList } from '@/app/(marketing)/_components/FaqList';
import { PageSection } from '@/components/page-section';
import { Badge } from '@/components/ui/badge';
// import { cn } from '@/lib/utils';
// import { AnimatePresence, motion } from 'framer-motion';
// import { MinusIcon, PlusIcon } from 'lucide-react';
// import { useState } from 'react';



export default function FaqPage() {
  return (
    <PageSection className='bg-background pt-28 md:pt-36'>
      <div className='flex flex-col items-center space-y-8 px-4'>
        <Badge
          variant='outline'
          className='border-primary mb-4 px-3 py-1 text-xs font-medium tracking-wider uppercase'
        >
          FAQs
        </Badge>

        <h1 className='text-foreground mt-6 text-center text-4xl font-bold tracking-tight md:text-5xl'>
          Frequently Asked Questions
        </h1>

        <p className='text-muted-foreground max-w-2xl text-center'>
          Everything you need to know about our platform, billing, and team management.
        </p>
      </div>

      {/* 
         The heavy interactive logic is isolated here. 
         Ideally, wrap this in Suspense if it fetches data, 
         but even as is, it decouples the header rendering from the JS load.
      */}
      <FaqList />

      <div className='mt-8 text-center'>
        <p className='text-muted-foreground mb-4'>
          Can&apos;t find what you&apos;re looking for?
        </p>
        <a
          href='/contact'
          className='border-primary text-foreground hover:bg-primary hover:text-primary-foreground inline-flex items-center justify-center rounded-lg border-2 mt-6 px-6 py-3 font-medium transition-colors'
        >
          Contact Support
        </a>
      </div>
    </PageSection>
  )
}
