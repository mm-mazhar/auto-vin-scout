// app/(marketing)/_components/dash/drivers-section.tsx

const DRIVERS = [
  {
    title: 'One car, one decision.',
    body: 'You found it on a marketplace, it’s three hours away, and the seller says it’s clean. Read the risk before you spend the drive, the deposit or the inspection fee.',
    points: [
      'Plain-language findings, not a data dump',
      'Which issues deserve a mechanic, and which are noise',
      'Questions to ask the seller before you go',
    ],
  },
  {
    title: 'Thirty listings a week.',
    body: 'Decode every VIN for free and spend a credit only when a car earns a closer look. Relists, price cuts and time on market are already laid out when you call.',
    points: [
      'Free decode and recall count on every VIN',
      'Market timeline: price, mileage and seller history',
      'Team workspaces with projects and shared credits',
    ],
  },
]

export function DriversSection() {
  return (
    <section aria-labelledby='drivers-heading' className='px-4 py-24 sm:px-6 lg:py-28'>
      <div className='mx-auto max-w-[1240px]'>
        <h2 id='drivers-heading' className='nd-display max-w-[18ch] text-[2.6rem] text-(--nd-print) sm:text-[3.4rem]'>
          Built for two kinds of buyer.
        </h2>
        <div className='mt-14 grid gap-12 md:grid-cols-2 md:gap-0 md:divide-x md:divide-(--nd-rule-strong)'>
          {DRIVERS.map((driver, index) => (
            <article key={driver.title} className={index === 0 ? 'md:pr-12 lg:pr-16' : 'md:pl-12 lg:pl-16'}>
              <h3 className='nd-display text-[2rem] text-(--nd-vfd) sm:text-[2.3rem]'>{driver.title}</h3>
              <p className='mt-4 max-w-[46ch] text-lg leading-relaxed text-(--nd-print-2)'>{driver.body}</p>
              <ul className='mt-7 space-y-3 border-t border-(--nd-rule) pt-6'>
                {driver.points.map((point) => (
                  <li key={point} className='flex gap-3 text-base text-(--nd-print)'>
                    <span aria-hidden className='mt-[0.6em] h-px w-4 shrink-0 bg-(--nd-emerald)' />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
