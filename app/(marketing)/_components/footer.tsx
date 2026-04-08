// app/(marketing)/_components/footer.tsx

import SiteLogo from '@/app/(marketing)/_components/Sitelogo'
import { MARKETING_SURFACE_MAX_WIDTH } from '@/components/page-section'
import { Button } from '@/components/ui/button'
import { ShineBorder } from '@/components/ui/shine-border'
import { APP_DESCRIPTION_LONG, NEXT_PUBLIC_SITE_NAME, SOCIAL_LINKS } from '@/lib/constants'
import Link from 'next/link'
import { FaLinkedinIn } from 'react-icons/fa6'
import {
    SiFacebook,
    SiInstagram,
    SiTiktok,
    SiX,
    SiYoutube,
} from 'react-icons/si'

const links = [
  { title: 'Privacy', href: '/privacy-policy' },
  { title: 'Terms', href: '/terms' },
  { title: 'Contact', href: '/contact' },
  { title: 'FAQs', href: '/faqs' },
  { title: 'About', href: '/about' }
]

type FooterSectionProps = {
  isAuthenticated?: boolean
}

export default function FooterSection({ isAuthenticated = false }: FooterSectionProps) {
  return (
    <footer className='w-full pt-2 pb-8 md:pt-4 md:pb-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-col items-center text-center'>
          <div
            className={`relative mb-10 w-full overflow-hidden rounded-[2rem] border border-border/70 bg-background/80 px-6 py-8 shadow-lg shadow-black/5 backdrop-blur md:px-10 md:py-10 ${MARKETING_SURFACE_MAX_WIDTH}`}
          >
            <ShineBorder borderWidth={1} duration={20} shineColor={['var(--primary)']} />
            <div
              aria-hidden
              className='absolute inset-x-0 top-0 h-32'
              style={{
                background:
                  'radial-gradient(circle at top, color-mix(in oklch, var(--primary) 16%, transparent), transparent 70%)',
              }}
            />
            <div className='relative flex flex-col items-center gap-5'>
              <div className='rounded-full border border-border/60 bg-background/75 px-3 py-1 text-[11px] font-medium tracking-[0.22em] text-muted-foreground'>
                CHECK BEFORE YOU COMMIT
              </div>
              <div className='max-w-2xl space-y-3'>
                <h2 className='text-2xl font-semibold tracking-tight md:text-3xl'>
                  Run the VIN before you trust the listing
                </h2>
                <p className='text-sm leading-6 text-muted-foreground md:text-base'>
                  Decode the vehicle, review market behavior, and walk into seller conversations with sharper questions.
                </p>
              </div>
              <div className='flex flex-col gap-3 sm:flex-row'>
                <Button asChild size='lg' className='font-semibold'>
                  <Link href={isAuthenticated ? '/dashboard' : '/get-started'}>
                    {isAuthenticated ? 'Dashboard' : 'Start VIN Check'}
                  </Link>
                </Button>
                <Button asChild size='lg' variant='outline' className='font-semibold'>
                  <Link href='/faqs'>Review FAQs</Link>
                </Button>
              </div>
            </div>
          </div>

          <SiteLogo />
          <p className='mt-4 max-w-2xl text-sm leading-6 text-muted-foreground'>
            {APP_DESCRIPTION_LONG}
          </p>

          <div className='mt-6 mb-8 flex flex-wrap justify-center gap-6 text-sm'>
            {links.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className='text-muted-foreground hover:text-primary block duration-150'
              >
                <span>{link.title}</span>
              </Link>
            ))}
          </div>

          <div className='mb-8 flex flex-wrap justify-center gap-6 text-sm'>
            <Link href={SOCIAL_LINKS.twitter} className='block hover:text-primary transition-colors'><SiX size={24} /></Link>
            <Link href={SOCIAL_LINKS.linkedin} className='block hover:text-primary transition-colors'><FaLinkedinIn size={24} /></Link>
            <Link href={SOCIAL_LINKS.facebook} className='block hover:text-primary transition-colors'><SiFacebook size={24} /></Link>
            <Link href={SOCIAL_LINKS.youtube} className='block hover:text-primary transition-colors'><SiYoutube size={24} /></Link>
            <Link href={SOCIAL_LINKS.instagram} className='block hover:text-primary transition-colors'><SiInstagram size={24} /></Link>
            <Link href={SOCIAL_LINKS.tiktok} className='block hover:text-primary transition-colors'><SiTiktok size={24} /></Link>
          </div>

          <span className='text-muted-foreground block text-center text-sm'>
            © {new Date().getFullYear()} {NEXT_PUBLIC_SITE_NAME}, All rights reserved
          </span>
        </div>
      </div>
    </footer>
  )
}
