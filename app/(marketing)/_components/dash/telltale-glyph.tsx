// app/(marketing)/_components/dash/telltale-glyph.tsx

import type { VectorId } from './vectors'

function CarProfile({ dy = 0, scale = 1 }: { dy?: number; scale?: number }) {
  return (
    <g transform={`translate(0 ${dy}) scale(${scale})`}>
      <path d='M3.5 13.5l1.7-3.8A2 2 0 0 1 7 8.5h10a2 2 0 0 1 1.8 1.2l1.7 3.8V16a1 1 0 0 1-1 1h-1.2M3.5 13.5V16a1 1 0 0 0 1 1h1.2M3.5 13.5h17M9.2 17h5.6' />
      <circle cx='7.5' cy='17' r='1.6' />
      <circle cx='16.5' cy='17' r='1.6' />
    </g>
  )
}

const GLYPHS: Record<VectorId, React.ReactNode> = {
  baseline: (
    <>
      <path d='M4 15.5a8 8 0 0 1 16 0' />
      <path d='M12 15.5l3.6-4.4' />
      <path d='M6.2 11.2l1 .8M12 7.5v1.3M17.8 11.2l-1 .8' />
      <rect x='8.5' y='17.5' width='7' height='3' rx='0.6' />
    </>
  ),
  safety: (
    <>
      <circle cx='12' cy='4.6' r='1.8' />
      <path d='M11.6 8.2l-1 6.3h4.6l1.6 5' />
      <path d='M8.6 9.6l6 5' />
      <path d='M8 7.5v9.3h2.6' />
    </>
  ),
  flood: (
    <>
      <CarProfile dy={-3} />
      <path d='M2.5 18.6c1.6 0 1.6-1.1 3.2-1.1s1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1' />
      <path d='M2.5 21.4c1.6 0 1.6-1.1 3.2-1.1s1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1' />
    </>
  ),
  powertrain: (
    <>
      <path d='M5 10.5v5h1.8v2.2h8.4l2.2-2.2h1.4V11h-1.4l-2-2H14V7H8.8v2H7.2l-1.4 1.5z' />
      <path d='M2.8 11.5v3.2M2.8 13h2.2M18.8 13h2.4M21.2 11.2v3.6' />
    </>
  ),
  corrosion: (
    <>
      <CarProfile dy={-2.5} />
      <path d='M6.5 19.2v.9M10 19.6v1.4M14 19.6v1.4M17.5 19.2v.9' />
    </>
  ),
  theft: (
    <>
      <g transform='translate(-1.5 0)'>
        <path d='M3.5 13.5l1.7-3.8A2 2 0 0 1 7 8.5h7.8M3.5 13.5V16a1 1 0 0 0 1 1h1.2M3.5 13.5h9M9.2 17h2.8' />
        <circle cx='7.5' cy='17' r='1.6' />
      </g>
      <rect x='14' y='12.5' width='7' height='6.5' rx='1' />
      <path d='M15.6 12.5v-1.6a1.9 1.9 0 0 1 3.8 0v1.6' />
    </>
  ),
  forensics: (
    <>
      <path d='M4 8.5h3.2l1.5-2.2h6.6l1.5 2.2H20v10.5H4z' />
      <circle cx='12' cy='13.5' r='3.4' />
      <path d='M17.4 11h.01' />
    </>
  ),
  reliability: (
    <path d='M14.6 6.4a4.2 4.2 0 0 0-5.3 5.4L4.2 16.9a1.6 1.6 0 0 0 0 2.3l.6.6a1.6 1.6 0 0 0 2.3 0l5.1-5.1a4.2 4.2 0 0 0 5.4-5.3l-2.6 2.6-2.3-.5-.5-2.3z' />
  ),
}

export function TelltaleGlyph({
  id,
  className,
  title,
}: {
  id: VectorId
  className?: string
  title?: string
}) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.6}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {GLYPHS[id]}
    </svg>
  )
}
