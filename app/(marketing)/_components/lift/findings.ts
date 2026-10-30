// app/(marketing)/_components/lift/findings.ts
//
// The sample car on the landing-page lift. These findings are illustrative
// and labelled as such on the page; they demonstrate what each risk vector
// looks for, not the history of any real vehicle.

export type SampleFinding = {
  id: string
  /** Risk vector name as used in reports. */
  vector: string
  /** Short paint-pen tag. */
  tag: string
  score: number
  note: string
  /** Car-local anchor in metres: x along the length (front +), y up, z across. */
  position: [number, number, number]
  /** Which side of the ring the label sits on, in px. */
  label: { dx: number; dy: number }
}

export const SAMPLE_FINDINGS: SampleFinding[] = [
  {
    id: 'flood',
    vector: 'Geospatial flood forensics',
    tag: 'Flood',
    score: 64,
    note: 'Listed in a FEMA-declared county three weeks after the storm.',
    position: [-0.2, -0.03, -0.46],
    label: { dx: 64, dy: -54 },
  },
  {
    id: 'forensics',
    vector: 'Visual and auction forensics',
    tag: 'Salvage',
    score: 82,
    note: 'VIN matched a salvage-auction listing with front damage.',
    position: [1.72, -0.12, -0.42],
    label: { dx: 58, dy: 40 },
  },
  {
    id: 'baseline',
    vector: 'Baseline health and market anomalies',
    tag: 'Odometer',
    score: 71,
    note: 'Relisted with 12,400 fewer miles than a year earlier.',
    position: [-0.82, -0.23, -0.18],
    label: { dx: -250, dy: 46 },
  },
  {
    id: 'corrosion',
    vector: 'Environmental corrosion',
    tag: 'Rust',
    score: 58,
    note: 'Six winters of listings in Salt Belt states.',
    position: [-0.55, -0.06, 0.88],
    label: { dx: -236, dy: -64 },
  },
  {
    id: 'powertrain',
    vector: 'Powertrain complexity',
    tag: 'Engine',
    score: 41,
    note: 'Turbo four at 96k miles, where its known failures start.',
    position: [1.66, -0.23, -0.02],
    label: { dx: 54, dy: -70 },
  },
]
