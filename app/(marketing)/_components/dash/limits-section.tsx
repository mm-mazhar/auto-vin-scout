// app/(marketing)/_components/dash/limits-section.tsx

const LIMITS = [
  {
    title: 'Public signals, not DMV or insurance files.',
    body: 'Title and claims databases sit behind federal law and paywalls. The report infers risk from what is public instead.',
  },
  {
    title: 'Derived mileage, not verified readings.',
    body: 'Odometer checks come from the listing timeline. A rollback shows up as a newer listing with fewer miles.',
  },
  {
    title: 'Gaps stay visible.',
    body: 'When a source is down or has nothing on this car, the report lists that reading as pending instead of quietly counting it as clear.',
  },
]

const PLANNED = [
  'NMVTIS title brands: salvage, rebuilt, junk',
  'NICB theft and salvage checks',
  'Verified odometer readings',
  'Depreciation forecasts',
  'A public API for your own tools',
  'White-label reports for dealers',
]

export function LimitsSection() {
  return (
    <section aria-labelledby='limits-heading' className='border-t border-(--nd-rule) px-4 py-24 sm:px-6 lg:py-28'>
      <div className='mx-auto grid max-w-[1240px] gap-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]'>
        <div>
          <h2 id='limits-heading' className='nd-display max-w-[16ch] text-[2.6rem] text-(--nd-print) sm:text-[3.4rem]'>
            What the dash can’t see.
          </h2>
          <p className='mt-5 max-w-[52ch] text-lg leading-relaxed text-(--nd-print-2)'>
            A score is a probability, never a verdict. Knowing where it stops is what makes it worth trusting.
          </p>
          <dl className='mt-12 space-y-8'>
            {LIMITS.map((limit) => (
              <div key={limit.title} className='grid gap-2 border-t border-(--nd-rule) pt-6 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:gap-8'>
                <dt className='nd-display text-[1.45rem] text-(--nd-print)'>{limit.title}</dt>
                <dd className='text-base leading-relaxed text-(--nd-print-2)'>{limit.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside aria-labelledby='planned-heading' className='self-start rounded-2xl border border-dashed border-(--nd-rule-strong) p-8'>
          <h3 id='planned-heading' className='nd-display text-[1.8rem] text-(--nd-print)'>
            Not on the dash yet
          </h3>
          <p className='mt-2 text-base text-(--nd-print-3)'>Planned. None of these are available today.</p>
          <ul className='mt-6 space-y-3.5'>
            {PLANNED.map((item) => (
              <li key={item} className='flex gap-3 text-base text-(--nd-print-2)'>
                <span aria-hidden className='mt-[0.55em] size-1.5 shrink-0 rounded-full border border-(--nd-print-3)' />
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  )
}
