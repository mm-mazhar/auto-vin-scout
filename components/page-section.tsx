// components/page-section.tsx

import { cn } from '@/lib/utils'
import React from 'react'

interface PageSectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  as?: React.ElementType
}

export function PageSection({
  children,
  className,
  as: Component = 'section',
  ...props
}: PageSectionProps) {
  return (
    <Component
      // ✅ FIX: Reduced 'md:py-32' to 'md:py-24'. 
      // This shrinks the gap on FAQs/Terms pages by 32px.
      className={cn(
        'w-full py-16 md:py-24', 
        className
      )}
      {...props}
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {children}
      </div>
    </Component>
  )
}
