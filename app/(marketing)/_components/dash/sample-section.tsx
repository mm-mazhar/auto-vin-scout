// app/(marketing)/_components/dash/sample-section.tsx

import Image from 'next/image'
import { SAMPLE_REPORT } from './vectors'

const SCRIPT_LINES = [
  'I noticed there is still an unresolved NHTSA recall on this CR-V; would you be willing to get that handled before the sale, or can we adjust the price to cover the dealership visit?',
  'I see the car has had three price reductions recently—it seems like you’re motivated to move it, so I’m wondering if there’s a bit more room to negotiate on the final price.',
  'I noticed a significant gap of over 2,600 days in the listing history. Could you help me understand where the vehicle was during that time so I can be sure about the title and repair history?',
]

const SCREENSHOT = { src: '/dashboard-03.png', width: 1090, height: 750 }

/** The score card region of the screenshot, shown at native scale on phones. */
const SCORE_CARD_CROP = { x: 150, y: 20, w: 400, h: 240 }

const EXECUTIVE_SUMMARY =
  'This 2014 Honda CR-V is a low-risk vehicle featuring a reliable K24Z7 powertrain and top-tier safety ratings. While it benefits from low environmental stress and 77,336 miles, it is currently approaching a major maintenance window (80k-120k miles). Primary concerns include one unresolved NHTSA recall and a suspicious 2,648-day listing gap that may indicate a title wash or repair flip.'

export function SampleSection() {
  return (
    <section id='sample' aria-labelledby='sample-heading' className='scroll-mt-24 px-4 py-24 sm:px-6 lg:py-32'>
      <div className='mx-auto max-w-[1240px]'>
        <div className='grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16'>
          <div>
            <h2 id='sample-heading' className='nd-display text-[2.6rem] text-(--nd-print) sm:text-[3.4rem]'>
              A real report, not a mockup.
            </h2>
            <p className='mt-5 max-w-[48ch] text-lg leading-relaxed text-(--nd-print-2)'>
              This {SAMPLE_REPORT.year} Honda CR-V came back Low risk at {SAMPLE_REPORT.score}. It ran on an earlier version of
              the engine that scored four vectors and left the rest pending, so those added nothing to the score. It still
              flagged one unresolved recall and a 2,648-day gap in the listing history that the seller should explain.
            </p>
            <p className='mt-3 font-mono text-sm tracking-wide text-(--nd-print-3)'>VIN {SAMPLE_REPORT.vin}</p>
          </div>

          <figure className='lg:border-l lg:border-(--nd-rule) lg:pl-16'>
            <figcaption className='nd-legend text-(--nd-print-3)'>From its negotiation script</figcaption>
            <ul className='mt-6 space-y-6'>
              {SCRIPT_LINES.map((line) => (
                <li key={line} className='max-w-[60ch] text-[1.15rem] leading-relaxed text-(--nd-print)'>
                  <q>{line}</q>
                </li>
              ))}
            </ul>
          </figure>
        </div>

        <figure className='mt-14 md:hidden'>
          <div className='rounded-[1.1rem] border border-(--nd-rule-strong) bg-[oklch(0.1_0.012_170)] p-2'>
            <div
              className='relative mx-auto w-full max-w-[400px] overflow-hidden rounded-[0.7rem]'
              style={{ aspectRatio: `${SCORE_CARD_CROP.w} / ${SCORE_CARD_CROP.h}` }}
            >
              <Image
                src={SCREENSHOT.src}
                alt='Score card from the 2014 Honda CR-V report: overall risk index 12 of 100, Low Risk, based on 4 of 5 assessment vectors.'
                width={SCREENSHOT.width}
                height={SCREENSHOT.height}
                sizes='1090px'
                className='absolute max-w-none'
                style={{
                  width: `${(SCREENSHOT.width / SCORE_CARD_CROP.w) * 100}%`,
                  left: `${(-SCORE_CARD_CROP.x / SCORE_CARD_CROP.w) * 100}%`,
                  top: `${(-SCORE_CARD_CROP.y / SCORE_CARD_CROP.h) * 100}%`,
                }}
              />
            </div>
          </div>
          <blockquote className='mt-6 border-t border-(--nd-rule) pt-5 text-base leading-relaxed text-(--nd-print-2)'>
            <p className='nd-legend mb-3 text-(--nd-print-3)'>Executive summary</p>
            {EXECUTIVE_SUMMARY}
          </blockquote>
        </figure>

        <figure className='mt-16 hidden md:block'>
          <div className='overflow-x-auto rounded-[1.1rem] border border-(--nd-rule-strong) bg-[oklch(0.1_0.012_170)] p-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.7)]'>
            <Image
              src={SCREENSHOT.src}
              alt='Report overview for the 2014 Honda CR-V: overall risk index 12, Low Risk, based on 4 of 5 assessment vectors, with executive summary and per-vector findings.'
              width={SCREENSHOT.width}
              height={SCREENSHOT.height}
              sizes={`${SCREENSHOT.width}px`}
              className='mx-auto h-auto w-[1090px] max-w-none rounded-[0.7rem]'
            />
          </div>
          <figcaption className='mt-3 text-sm text-(--nd-print-3)'>The report’s overview tab at actual size.</figcaption>
        </figure>
      </div>
    </section>
  )
}
