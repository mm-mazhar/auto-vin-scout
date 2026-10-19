// app/(marketing)/page.tsx

import { DashProvider } from './_components/dash/dash-state'
import { DriversSection } from './_components/dash/drivers-section'
import { Hero } from './_components/dash/hero'
import { IgnitionSection } from './_components/dash/ignition-section'
import { LampsSection } from './_components/dash/lamps-section'
import { LimitsSection } from './_components/dash/limits-section'
import { RateCardSection } from './_components/dash/rate-card-section'
import { SampleSection } from './_components/dash/sample-section'
import { TripLogSection } from './_components/dash/trip-log-section'

export default function Home() {
  return (
    <DashProvider>
      <Hero />
      <LampsSection />
      <TripLogSection />
      <SampleSection />
      <DriversSection />
      <LimitsSection />
      <RateCardSection />
      <IgnitionSection />
    </DashProvider>
  )
}
