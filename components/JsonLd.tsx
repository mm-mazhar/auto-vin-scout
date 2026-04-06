// components/JsonLd.tsx

import { NEXT_PUBLIC_SITE_NAME, SITE_URL, SOCIAL_LINKS } from '@/lib/constants'

export function JsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: NEXT_PUBLIC_SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`, // A URL to your logo
    sameAs: [
      SOCIAL_LINKS.twitter,
      SOCIAL_LINKS.youtube,
      SOCIAL_LINKS.facebook,
      SOCIAL_LINKS.instagram,
      SOCIAL_LINKS.tiktok,
      SOCIAL_LINKS.linkedin,
    ],
  }

  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
