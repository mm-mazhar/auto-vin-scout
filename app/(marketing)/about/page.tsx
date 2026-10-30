// app/(marketing)/about/page.tsx

import { ShopPageHead } from '@/app/(marketing)/_components/shop-page-head'
import { NEXT_PUBLIC_SITE_NAME } from '@/lib/constants'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About',
  description: `What ${NEXT_PUBLIC_SITE_NAME} is, where its data comes from, and what it is not.`,
}

const PRINCIPLES = [
  {
    title: 'Evidence before verdict',
    body: 'Every score shows the signals behind it, so you can judge the claim instead of trusting a number.',
  },
  {
    title: 'Honest about what it is',
    body: 'A probabilistic read of public signals, never an official history report. When a source is missing or a fallback was used, the report says so.',
  },
  {
    title: 'A decision in one sitting',
    body: 'Standing at a listing, you should get to skip it, go see it, or here is what to ask, without reading everything.',
  },
  {
    title: 'Leverage, not alarm',
    body: 'Findings become calm, specific talking points you can use with a seller.',
  },
] as const

const SOURCES = [
  { name: 'NHTSA vPIC', use: 'VIN decode: make, model, engine, plant' },
  { name: 'NHTSA Recalls', use: 'Open recall campaigns' },
  { name: 'NHTSA NCAP', use: 'Crash ratings, complaints and investigations' },
  { name: 'MarketCheck', use: 'Premium decode and marketplace listing history' },
  { name: 'FEMA Open Data', use: 'Disaster declarations for flood exposure' },
  { name: 'Open-Meteo', use: 'Historical rainfall to check flood timing' },
  { name: 'Bright Data search', use: 'Auction and salvage forensics, theft reports, price signals' },
  { name: 'Bright Data social', use: 'Owner-community reliability reports, mostly Reddit' },
] as const

export default function AboutPage() {
  return (
    <>
      <ShopPageHead
        title={`About ${NEXT_PUBLIC_SITE_NAME}`}
        lede={
          <p>
            AI risk intelligence for used-car buyers. We read the public record around a car, so you
            know what to look for before you spend a trip or a deposit on it.
          </p>
        }
      />

      <section aria-labelledby='why-title' className='px-4 pb-20 sm:px-8'>
        <div className='mx-auto grid max-w-[76rem] gap-10 lg:grid-cols-[1fr_1fr] lg:items-center'>
          <div>
            <h2 id='why-title' className='shop-h3 text-[2rem]'>
              Why it exists
            </h2>
            <div className='mt-5 space-y-4 text-[1.05rem] leading-relaxed text-[var(--shop-text-dim)]'>
              <p>
                The most useful vehicle records, DMV registrations and insurance claims, sit behind
                privacy law and expensive paywalls. Static history reports leave buyers guessing about
                everything they don&apos;t cover.
              </p>
              <p>
                {NEXT_PUBLIC_SITE_NAME} works from what is public instead: federal safety data,
                marketplace listing timelines, disaster declarations, auction traces and owner
                communities. Eight inspectors score those signals and explain what they found.
              </p>
            </div>
          </div>
          <Image
            src='/landing/shop-bay.jpg'
            alt='A sedan raised on a yellow two-post lift in an empty repair bay at night'
            width={2000}
            height={1500}
            sizes='(min-width: 1024px) 38rem, 100vw'
            className='h-auto w-full rounded-[3px]'
          />
        </div>
      </section>

      <section aria-labelledby='principles-title' className='bg-[var(--shop-floor-deep)] px-4 py-20 sm:px-8'>
        <div className='mx-auto max-w-[76rem]'>
          <h2 id='principles-title' className='shop-h3 text-[2rem]'>
            How we build it
          </h2>
          <ul className='mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2'>
            {PRINCIPLES.map((p) => (
              <li key={p.title} className='border-t-2 border-[var(--lift)] pt-4'>
                <h3 className='text-[1.15rem] font-bold'>{p.title}</h3>
                <p className='mt-2 max-w-[52ch] leading-relaxed text-[var(--shop-text-dim)]'>{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby='sources-title' className='px-4 py-20 sm:px-8'>
        <div className='mx-auto max-w-[76rem]'>
          <h2 id='sources-title' className='shop-h3 text-[2rem]'>
            Where the data comes from
          </h2>
          <div className='shop-paper mt-8'>
            <table className='w-full text-left'>
              <thead>
                <tr className='shop-paper-rule shop-paper-print border-b-2'>
                  <th scope='col' className='shop-stencil-label px-5 py-3 sm:px-8'>
                    Source
                  </th>
                  <th scope='col' className='shop-stencil-label px-5 py-3 sm:px-8'>
                    What it tells the inspectors
                  </th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((s) => (
                  <tr key={s.name} className='shop-paper-rule border-b last:border-b-0'>
                    <th scope='row' className='px-5 py-3 font-bold sm:px-8'>
                      {s.name}
                    </th>
                    <td className='px-5 py-3 text-[#33363b] sm:px-8'>{s.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby='not-title' className='px-4 pb-24 sm:px-8'>
        <div className='mx-auto grid max-w-[76rem] gap-8 rounded-[3px] bg-[var(--shop-floor-raised)] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center'>
          <div>
            <h2 id='not-title' className='shop-h3 text-[2rem]'>
              What it is not
            </h2>
            <p className='mt-4 max-w-[60ch] leading-relaxed text-[var(--shop-text-dim)]'>
              Not an official title or odometer record, and not a substitute for a mechanic. A high
              flood score means the record makes flooding likely, not that the car was flooded. Use
              the report to decide which cars deserve a closer look, and what to check when you get
              there.
            </p>
          </div>
          <Link href='/#inspect' className='shop-button'>
            Inspect a VIN
          </Link>
        </div>
      </section>
    </>
  )
}
