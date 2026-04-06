// app/(marketing)/contact/page.tsx

"use client"

import {
  MARKETING_ALIGNED_CONTAINER_WIDTH,
  MARKETING_ALIGNED_CONTENT_WIDTH,
  MARKETING_CONTENT_SECTION_BOTTOM_SPACING,
  MARKETING_CONTENT_SECTION_TOP_SPACING,
  PageSection,
} from '@/components/page-section'
import { useToast } from '@/components/ToastProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShineBorder } from '@/components/ui/shine-border'
import {
  APP_EMAIL,
  APP_OFFICE_ADDRESS,
  APP_PHONE_1,
  APP_PHONE_2,
  NEXT_PUBLIC_SITE_NAME,
} from '@/lib/constants'
import { Copy, Mail, MapPin, Phone } from 'lucide-react'

export default function ContactPage() {
  const { show } = useToast()

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      show({ title: 'Copied', description: text, variant: 'success', duration: 1500 })
    } catch {}
  }

  return (
    <PageSection
      className={`${MARKETING_CONTENT_SECTION_TOP_SPACING} ${MARKETING_CONTENT_SECTION_BOTTOM_SPACING}`}
      containerClassName={MARKETING_ALIGNED_CONTAINER_WIDTH}
    >
      <div className='flex flex-col items-center space-y-6 px-4'>
        <Badge
                  variant="outline"
                  className="border-primary mb-4 px-3 py-1 text-xs font-medium tracking-wider uppercase"
                >
                  Contact
                </Badge>
        <div className='flex flex-col items-center space-y-2'>
          <h1 className='mt-3 text-3xl font-bold'>Contact Us</h1>
          <p className='mt-4 text-muted-foreground'>
            Contact the support team at {NEXT_PUBLIC_SITE_NAME}.
          </p>
        </div>

        <div
          className={`relative w-full overflow-hidden rounded-2xl border p-4 shadow-sm ring-1 ring-border md:p-6 ${MARKETING_ALIGNED_CONTENT_WIDTH}`}
        >
          <ShineBorder borderWidth={1} duration={20} shineColor={['var(--primary)']} />
          <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            <div className='space-y-8'>
              <div className='flex items-center gap-2 text-sm font-medium'>
                <Mail className='size-4' />
                <span>Email</span>
              </div>
              <div className='flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2'>
                <span className='text-sm'>{APP_EMAIL}</span>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => copy(APP_EMAIL)}
                >
                  <Copy className='size-4' />
                </Button>
              </div>
              <p className='text-xs text-muted-foreground'>We respond to all emails within 24 hours.</p>
            </div>

            <div className='space-y-8'>
              <div className='flex items-center gap-2 text-sm font-medium'>
                <MapPin className='size-4' />
                <span>Office</span>
              </div>
              <div className='rounded-md border bg-muted/20 px-3 py-2 text-sm whitespace-pre-line'>
                {APP_OFFICE_ADDRESS}
              </div>
              <p className='text-xs text-muted-foreground'>Drop by our office for a chat.</p>
            </div>

            <div className='space-y-8'>
              <div className='flex items-center gap-2 text-sm font-medium'>
                <Phone className='size-4' />
                <span>Phone</span>
              </div>
              <div className='space-y-8'>
                <div className='flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2'>
                  <span className='text-sm'>{APP_PHONE_1}</span>
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    onClick={() => copy(APP_PHONE_1)}
                  >
                    <Copy className='size-4' />
                  </Button>
                </div>
                <div className='flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2'>
                  <span className='text-sm'>{APP_PHONE_2}</span>
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    onClick={() => copy(APP_PHONE_2)}
                  >
                    <Copy className='size-4' />
                  </Button>
                </div>
              </div>
              <p className='text-xs text-muted-foreground'>We’re available Mon–Fri, 9am–5pm.</p>
            </div>
          </div>
        </div>
      </div>
    </PageSection>
  )
}
