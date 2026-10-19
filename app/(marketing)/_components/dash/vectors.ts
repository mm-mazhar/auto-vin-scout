// app/(marketing)/_components/dash/vectors.ts

export type VectorId =
  | 'baseline'
  | 'safety'
  | 'flood'
  | 'powertrain'
  | 'corrosion'
  | 'theft'
  | 'forensics'
  | 'reliability'

export interface RiskVector {
  id: VectorId
  name: string
  lampLabel: string
  reads: string
  weight: number
}

/** Cluster order, left to right, as the telltale strip shows them. */
export const RISK_VECTORS: RiskVector[] = [
  {
    id: 'baseline',
    name: 'Baseline health & market anomalies',
    lampLabel: 'Baseline',
    reads: 'Odometer rollbacks, fire-sale pricing, mileage velocity, open recalls.',
    weight: 0.25,
  },
  {
    id: 'safety',
    name: 'Safety ratings & crash survivability',
    lampLabel: 'Safety',
    reads: 'NHTSA 5-star ratings, IIHS scores, ADAS features.',
    weight: 0.05,
  },
  {
    id: 'flood',
    name: 'Geospatial flood forensics',
    lampLabel: 'Flood',
    reads: 'FEMA disaster overlap with the listing timeline, checked against Open-Meteo rainfall.',
    weight: 0.15,
  },
  {
    id: 'powertrain',
    name: 'Powertrain complexity',
    lampLabel: 'Powertrain',
    reads: 'Engine architecture against its mileage lifecycle, and whether it is near the costly hump.',
    weight: 0.1,
  },
  {
    id: 'corrosion',
    name: 'Environmental corrosion',
    lampLabel: 'Corrosion',
    reads: 'Cumulative Salt Belt, Sun Belt and coastal stress from where it has been listed.',
    weight: 0.05,
  },
  {
    id: 'theft',
    name: 'Theft & vandalism sentiment',
    lampLabel: 'Theft',
    reads: 'How often this model is targeted, plus regional chatter from public forums.',
    weight: 0.05,
  },
  {
    id: 'forensics',
    name: 'Visual & auction forensics',
    lampLabel: 'Forensics',
    reads: 'Salvage-yard photos, Copart and IAAI watermarks, “parts only” listings.',
    weight: 0.2,
  },
  {
    id: 'reliability',
    name: 'Reliability & social proof',
    lampLabel: 'Reliability',
    reads: 'Recurring mechanical failures owners report in enthusiast communities.',
    weight: 0.15,
  },
]

export type RiskBand = 'low' | 'medium' | 'high'

export function bandForScore(score: number): RiskBand {
  if (score <= 30) return 'low'
  if (score <= 70) return 'medium'
  return 'high'
}

export const BAND_LABEL: Record<RiskBand, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

/**
 * A real report from the README demo set (shown in public/dashboard-03.png and
 * dashboard-04.png). Vectors that report did not score stay unscored here.
 */
export const SAMPLE_REPORT = {
  vin: '5J6RM4H52EL066598',
  year: 2014,
  make: 'HONDA',
  model: 'CR-V',
  score: 12,
  vectors: {
    baseline: 40,
    safety: 15,
    powertrain: 15,
    corrosion: 15,
  } as Partial<Record<VectorId, number>>,
}

export const DEMO_VINS = [
  { vin: '5J6RM4H52EL066598', label: 'Sample report' },
  { vin: '5YFBPRBE3LP067431', label: null },
  { vin: '1N4AL3AP2FC260308', label: null },
] as const
