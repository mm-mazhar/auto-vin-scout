// app/(marketing)/contact/page.tsx

'use client'

import { ShopPageHead } from '@/app/(marketing)/_components/shop-page-head'
import { useToast } from '@/components/ToastProvider'
import { APP_EMAIL, APP_OFFICE_ADDRESS, APP_PHONE_1, APP_PHONE_2, NEXT_PUBLIC_SITE_NAME } from '@/lib/constants'
import { Copy, Mail, MapPin, Phone } from 'lucide-react'

// Template values in lib/constants are placeholders until real ones are set.
// Never show a placeholder as a way to reach us.
const isRealEmail = (v: string) => !!v && !/example\.(com|org)/i.test(v)
const isRealPhone = (v: string) => !!v && !/x{2,}/i.test(v)
const isRealAddress = (v: string) => !!v && !/rocky steps|museum of art/i.test(v)

export default function ContactPage() {
  const { show } = useToast()
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      show({ title: 'Copied', description: text, variant: 'success', duration: 1500 })
    } catch {}
  }

  const email = isRealEmail(APP_EMAIL) ? APP_EMAIL : null
  const phones = [APP_PHONE_1, APP_PHONE_2].filter(isRealPhone)
  const address = isRealAddress(APP_OFFICE_ADDRESS) ? APP_OFFICE_ADDRESS : null
  const hasAny = email || phones.length || address

  return (
    <>
      <ShopPageHead
        title='Talk to the shop'
        lede={<p>Questions about a report, your account or billing at {NEXT_PUBLIC_SITE_NAME}.</p>}
      />
      <section className='px-4 pb-24 sm:px-8'>
        <div className='mx-auto max-w-[76rem]'>
          {hasAny ? (
            <ul className='grid gap-px overflow-hidden rounded-[3px] bg-[var(--shop-rule)] md:grid-cols-3'>
              {email ? (
                <li className='bg-[var(--shop-floor-raised)] p-7'>
                  <p className='shop-stencil-label flex items-center gap-2 text-[var(--lift)]'>
                    <Mail aria-hidden className='size-4' /> Email
                  </p>
                  <div className='mt-4 flex items-center gap-2'>
                    <a href={`mailto:${email}`} className='break-all text-[1.1rem] font-bold underline'>
                      {email}
                    </a>
                    <button
                      type='button'
                      onClick={() => copy(email)}
                      aria-label='Copy email address'
                      className='grid size-9 place-items-center rounded-[3px] hover:bg-[var(--shop-floor)]'
                    >
                      <Copy aria-hidden className='size-4' />
                    </button>
                  </div>
                  <p className='mt-2 text-sm text-[var(--shop-text-dim)]'>We respond to all emails within 24 hours.</p>
                </li>
              ) : null}
              {phones.length ? (
                <li className='bg-[var(--shop-floor-raised)] p-7'>
                  <p className='shop-stencil-label flex items-center gap-2 text-[var(--lift)]'>
                    <Phone aria-hidden className='size-4' /> Phone
                  </p>
                  <ul className='mt-4 space-y-2'>
                    {phones.map((phone) => (
                      <li key={phone} className='flex items-center gap-2'>
                        <a href={`tel:${phone.replace(/\s/g, '')}`} className='text-[1.1rem] font-bold tabular-nums underline'>
                          {phone}
                        </a>
                        <button
                          type='button'
                          onClick={() => copy(phone)}
                          aria-label={`Copy ${phone}`}
                          className='grid size-9 place-items-center rounded-[3px] hover:bg-[var(--shop-floor)]'
                        >
                          <Copy aria-hidden className='size-4' />
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : null}
              {address ? (
                <li className='bg-[var(--shop-floor-raised)] p-7'>
                  <p className='shop-stencil-label flex items-center gap-2 text-[var(--lift)]'>
                    <MapPin aria-hidden className='size-4' /> Office
                  </p>
                  <address className='mt-4 whitespace-pre-line not-italic leading-relaxed'>{address}</address>
                </li>
              ) : null}
            </ul>
          ) : (
            <div className='rounded-[3px] bg-[var(--shop-floor-raised)] p-7 sm:p-10'>
              <p className='max-w-[56ch] text-[1.1rem] leading-relaxed'>
                Our support inbox is being set up. Check back soon, or start with the{' '}
                <a href='/faqs' className='font-bold text-[var(--lift)] underline'>
                  FAQs
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
