// app/(marketing)/faqs/page.tsx

import { FaqList } from '@/app/(marketing)/_components/FaqList'
import { ShopPageHead } from '@/app/(marketing)/_components/shop-page-head'
import { NEXT_PUBLIC_SITE_NAME } from '@/lib/constants'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQs',
  description: `Answers about ${NEXT_PUBLIC_SITE_NAME} reports, data sources and accounts.`,
}

export default function FaqPage() {
  return (
    <>
      <ShopPageHead
        title='Questions at the counter'
        lede={<p>Answers about reports, data sources, and where {NEXT_PUBLIC_SITE_NAME} fits in your buying process.</p>}
      />
      <section aria-label='Frequently asked questions' className='px-4 pb-16 sm:px-8'>
        <div className='mx-auto max-w-[76rem]'>
          <FaqList />
        </div>
      </section>
      <section className='px-4 pb-24 sm:px-8'>
        <div className='mx-auto flex max-w-[76rem] flex-col gap-5 rounded-[3px] bg-[var(--shop-floor-raised)] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9'>
          <p className='text-[1.1rem]'>Need help with a specific VIN or report?</p>
          <Link href='/contact' className='shop-button shop-button--quiet'>
            Contact us
          </Link>
        </div>
      </section>
    </>
  )
}
