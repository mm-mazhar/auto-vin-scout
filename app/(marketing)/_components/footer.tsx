// app/(marketing)/_components/footer.tsx

import { NEXT_PUBLIC_SITE_NAME, SOCIAL_LINKS } from '@/lib/constants'
import Link from 'next/link'
import { FaLinkedinIn } from 'react-icons/fa6'
import { SiFacebook, SiInstagram, SiTiktok, SiX, SiYoutube } from 'react-icons/si'
import { Wordmark } from './dash/wordmark'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { title: 'How it reads', href: '/#lamps' },
      { title: 'Sample report', href: '/#sample' },
      { title: 'Pricing', href: '/#pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { title: 'About', href: '/about' },
      { title: 'FAQs', href: '/faqs' },
      { title: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { title: 'Privacy', href: '/privacy-policy' },
      { title: 'Terms', href: '/terms' },
    ],
  },
]

const SOCIALS = [
  { label: 'X', href: SOCIAL_LINKS.twitter, Icon: SiX },
  { label: 'LinkedIn', href: SOCIAL_LINKS.linkedin, Icon: FaLinkedinIn },
  { label: 'Facebook', href: SOCIAL_LINKS.facebook, Icon: SiFacebook },
  { label: 'YouTube', href: SOCIAL_LINKS.youtube, Icon: SiYoutube },
  { label: 'Instagram', href: SOCIAL_LINKS.instagram, Icon: SiInstagram },
  { label: 'TikTok', href: SOCIAL_LINKS.tiktok, Icon: SiTiktok },
]

const DATA_SOURCES = 'NHTSA vPIC · NHTSA Recalls · NHTSA NCAP · FEMA · Open-Meteo · MarketCheck'

export default function FooterSection() {
  return (
    <footer className='border-t border-(--nd-rule) bg-(--nd-ground)'>
      <div className='mx-auto grid max-w-[1288px] gap-12 px-4 pt-16 pb-10 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]'>
        <div className='max-w-sm'>
          <Wordmark />
          <p className='mt-5 text-base leading-relaxed text-(--nd-print-2)'>
            Probabilistic risk reports for used cars, built from public records and marketplace history.
            A score is a probability, never a verdict.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className='nd-legend text-(--nd-print-3)'>{column.title}</h2>
            <ul className='mt-4 space-y-3'>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className='text-base text-(--nd-print-2) transition-colors hover:text-(--nd-print)'>
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className='mx-auto flex max-w-[1288px] flex-col gap-6 border-t border-(--nd-rule) px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between'>
        <p className='nd-legend text-(--nd-print-3)'>
          <span className='sr-only'>Data sources: </span>
          {DATA_SOURCES}
        </p>
        <div className='flex items-center gap-6'>
          <ul className='flex items-center gap-4'>
            {SOCIALS.map(({ label, href, Icon }) => (
              <li key={label}>
                <Link href={href} aria-label={label} className='block text-(--nd-print-3) transition-colors hover:text-(--nd-print)'>
                  <Icon size={18} />
                </Link>
              </li>
            ))}
          </ul>
          <span className='text-sm text-(--nd-print-3)'>
            © {new Date().getFullYear()} {NEXT_PUBLIC_SITE_NAME}
          </span>
        </div>
      </div>
    </footer>
  )
}
