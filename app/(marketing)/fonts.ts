// app/(marketing)/fonts.ts

import { Barlow, Barlow_Condensed, Barlow_Semi_Condensed } from 'next/font/google'
import localFont from 'next/font/local'

export const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-nd-body',
  display: 'swap',
})

export const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-nd-display',
  display: 'swap',
})

export const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-nd-legend',
  display: 'swap',
})

export const dseg7 = localFont({
  src: './_fonts/DSEG7Classic-Bold.woff2',
  variable: '--font-nd-seg7',
  display: 'swap',
})

export const NIGHT_DASH_FONT_VARIABLES = [
  barlow.variable,
  barlowCondensed.variable,
  barlowSemiCondensed.variable,
  dseg7.variable,
].join(' ')
