// components/page-section.tsx

import { cn } from '@/lib/utils'
import React from 'react'

interface PageSectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  as?: React.ElementType
}

export const MARKETING_CONTENT_SECTION_TOP_SPACING = 'pt-28 md:pt-32'
export const MARKETING_CONTENT_SECTION_BOTTOM_SPACING = 'pb-4 md:pb-6'

export function PageSection({
  children,
  className,
  as: Component = 'section',
  ...props
}: PageSectionProps) {
  return (
    <Component
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
