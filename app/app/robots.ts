// app/app/robots.ts

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // HARD-CODE to disallow everything during development
  // Switch this to 'true' only on launch day
  const isLaunched = false; 

  if (!isLaunched) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  // Normal rules for after launch
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/_next/', '/admin/'] }],
    host: 'https://your-final-domain.com',
  };
}