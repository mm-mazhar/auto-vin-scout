// app/(marketing)/_components/shop-page-head.tsx
//
// Opening block for the inner marketing pages: a stencilled title on the
// concrete, set against a strip of lift steel.

import { cn } from '@/lib/utils'

type ShopPageHeadProps = {
  title: string
  lede?: React.ReactNode
  meta?: React.ReactNode
  className?: string
}

export function ShopPageHead({ title, lede, meta, className }: ShopPageHeadProps) {
  return (
    <header className={cn('px-4 pb-12 pt-16 sm:px-8 lg:pb-16 lg:pt-24', className)}>
      <div className='mx-auto max-w-[76rem]'>
        <div aria-hidden className='h-2 w-24 bg-[var(--lift)]' />
        <h1 className='shop-display mt-6 max-w-[16ch] text-[clamp(3rem,1.8rem+4.6vw,6rem)]'>{title}</h1>
        {lede ? <div className='shop-lede mt-6'>{lede}</div> : null}
        {meta ? <div className='mt-4 text-sm text-[var(--shop-text-dim)]'>{meta}</div> : null}
      </div>
    </header>
  )
}
