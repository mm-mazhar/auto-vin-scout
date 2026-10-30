// app/(marketing)/_components/footer.tsx

import { ShopLogo } from '@/app/(marketing)/_components/header'
import { APP_DESCRIPTION_LONG, NEXT_PUBLIC_SITE_NAME, SOCIAL_HANDLES, SOCIAL_LINKS } from '@/lib/constants'
import Link from 'next/link'
import { FaLinkedinIn } from 'react-icons/fa6'
import { SiFacebook, SiInstagram, SiTiktok, SiX, SiYoutube } from 'react-icons/si'

const links = [
  { title: 'FAQs', href: '/faqs' },
  { title: 'About', href: '/about' },
  { title: 'Contact', href: '/contact' },
  { title: 'Privacy', href: '/privacy-policy' },
  { title: 'Terms', href: '/terms' },
]

const socials = [
  { key: 'twitter', label: 'X', Icon: SiX },
  { key: 'linkedin', label: 'LinkedIn', Icon: FaLinkedinIn },
  { key: 'facebook', label: 'Facebook', Icon: SiFacebook },
  { key: 'youtube', label: 'YouTube', Icon: SiYoutube },
  { key: 'instagram', label: 'Instagram', Icon: SiInstagram },
  { key: 'tiktok', label: 'TikTok', Icon: SiTiktok },
] as const

/** Template handles ("@yourdomain") are placeholders; never link to them. */
const isRealHandle = (handle: string) => !/your(domain|channel|company)/i.test(handle)

type FooterSectionProps = {
  isAuthenticated?: boolean
}

export default function FooterSection({ isAuthenticated = false }: FooterSectionProps) {
  const liveSocials = socials.filter((s) => isRealHandle(SOCIAL_HANDLES[s.key]))

  return (
    <footer className='border-t-4 border-[var(--lift)] bg-[var(--shop-floor-deep)] px-4 pb-10 pt-14 sm:px-8'>
      <div className='mx-auto grid max-w-[92rem] gap-10 lg:grid-cols-[1fr_auto]'>
        <div className='max-w-xl'>
          <Link href='/' aria-label={`${NEXT_PUBLIC_SITE_NAME} home`} className='flex items-center gap-3 text-[var(--lift)]'>
            <ShopLogo />
          </Link>
          <p className='mt-5 text-[0.95rem] leading-relaxed text-[var(--shop-text-dim)]'>{APP_DESCRIPTION_LONG}</p>
          <Link href={isAuthenticated ? '/dashboard' : '/#inspect'} className='shop-button mt-7'>
            {isAuthenticated ? 'Open dashboard' : 'Inspect a VIN'}
          </Link>
        </div>

        <nav aria-label='Footer'>
          <ul className='grid grid-cols-2 gap-x-12 gap-y-3 sm:grid-cols-1'>
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className='font-bold uppercase tracking-[0.05em] text-[var(--shop-text)] [font-variation-settings:"wdth"_80] hover:text-[var(--lift)]'
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className='mx-auto mt-12 flex max-w-[92rem] flex-col gap-5 border-t border-[var(--shop-rule)] pt-6 text-sm text-[var(--shop-text-dim)] sm:flex-row sm:items-center sm:justify-between'>
        <span>
          © {new Date().getFullYear()} {NEXT_PUBLIC_SITE_NAME}. Risk scores are probabilistic estimates from public
          data, not an official title or odometer record.
        </span>
        {liveSocials.length ? (
          <ul className='flex gap-5'>
            {liveSocials.map(({ key, label, Icon }) => (
              <li key={key}>
                <Link href={SOCIAL_LINKS[key]} aria-label={label} className='block hover:text-[var(--lift)]'>
                  <Icon size={20} />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </footer>
  )
}
