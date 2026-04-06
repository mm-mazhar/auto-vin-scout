// app/(marketing)/_components/footer.tsx

import SiteLogo from '@/app/(marketing)/_components/Sitelogo'
import { NEXT_PUBLIC_SITE_NAME, SOCIAL_LINKS } from '@/lib/constants'
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
  { title: 'Privacy Policy', href: '/privacy-policy' },
  { title: 'Terms and Conditions', href: '/terms' },
  { title: 'Contact Us', href: '/contact' },
  { title: 'FAQs', href: '/faqs' },
  { title: 'About', href: '/about' }
]

export default function FooterSection() {
  return (
    <footer className='w-full pt-6 pb-8 md:pt-10 md:pb-8'>
      
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-col items-center text-center'>
          <SiteLogo />

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
