// app/(marketing)/_components/dash/hero.tsx

import { Cluster } from './cluster'
import { DemoVins } from './demo-vins'

export function Hero() {
  return (
    <section id='top' aria-labelledby='hero-heading' className='relative scroll-mt-24 px-4 pt-6 pb-16 sm:px-6 lg:pt-5'>
      <div className='mx-auto max-w-[1240px]'>
        <div className='nd-rise mx-auto max-w-[62rem] text-center'>
          <h1 id='hero-heading' className='nd-display text-[2.7rem] text-(--nd-print) sm:text-[3.5rem] lg:text-[4.1rem]'>
            Know where this car is hurt before you drive out.
          </h1>
          <p className='mx-auto mt-4 max-w-[46rem] text-lg leading-relaxed text-(--nd-print-2) sm:text-xl'>
            Enter a VIN. The dash reads the public traces a used car leaves behind.
          </p>
        </div>

        <div className='mt-8 lg:mt-7'>
          <Cluster />
        </div>

        <div className='mt-5 flex flex-col items-center gap-3'>
          <DemoVins />
          <p className='text-center text-base text-(--nd-print-3)'>
            Free, no account: decode and model-year recalls. The full eight-lamp report is one credit.
          </p>
        </div>
      </div>
    </section>
  )
}
