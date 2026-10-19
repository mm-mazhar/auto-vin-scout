// app/(marketing)/_components/dash/cluster-geometry.ts

/**
 * Shared layout of the instrument cluster in design units (1 unit = 1px at the
 * cluster's full 1240px width). The 3D scene and the HTML overlay both read
 * from here so readouts sit exactly in their bezels.
 */

export const CLUSTER = {
  width: 1240,
  height: 560,
  shoulderY: 150,
  rimInset: 22,
  dial: { cx: 620, cy: 238, face: 192, bezel: 210 },
  leftPod: { x: 64, y: 180, w: 320, h: 220 },
  rightPod: { x: 856, y: 180, w: 320, h: 220 },
  lamps: { cy: 503, w: 88, h: 54, firstCx: 214, step: 116 },
} as const

export const DIAL_ONLY = {
  width: 480,
  height: 480,
  dial: { cx: 240, cy: 240, face: 192, bezel: 210 },
} as const

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export function lampBox(index: number): Box {
  const { cy, w, h, firstCx, step } = CLUSTER.lamps
  return { x: firstCx + index * step - w / 2, y: cy - h / 2, w, h }
}

/** Percent placement for an overlay element inside a design space. */
export function placeIn(space: { width: number; height: number }, box: Box) {
  return {
    left: `${(box.x / space.width) * 100}%`,
    top: `${(box.y / space.height) * 100}%`,
    width: `${(box.w / space.width) * 100}%`,
    height: `${(box.h / space.height) * 100}%`,
  }
}

/** 0 sits at lower-left (225°), 100 at lower-right (-45°): a 270° clockwise sweep. */
export function dialAngle(value: number): number {
  const clamped = Math.min(100, Math.max(0, value))
  return ((225 - clamped * 2.7) * Math.PI) / 180
}

/**
 * Cowl outline as a list of path commands in a y-up coordinate frame centred
 * on the cluster, inset by `inset` units. Consumed by THREE.Shape and by the
 * static SVG fallback.
 */
export function cowlOutline(inset: number) {
  const halfW = CLUSTER.width / 2 - inset
  const halfH = CLUSTER.height / 2 - inset
  const shoulder = CLUSTER.height / 2 - CLUSTER.shoulderY - inset * 0.4
  const corner = Math.max(8, 40 - inset)
  const hoodHalf = CLUSTER.dial.bezel + 70 - inset

  return {
    start: [-halfW + corner, -halfH] as const,
    commands: [
      ['L', halfW - corner, -halfH],
      ['Q', halfW, -halfH, halfW, -halfH + corner],
      ['L', halfW, shoulder - corner],
      ['Q', halfW, shoulder, halfW - corner, shoulder],
      ['L', hoodHalf + 90, shoulder],
      ['C', hoodHalf - 10, shoulder, hoodHalf * 0.62, halfH, 0, halfH],
      ['C', -hoodHalf * 0.62, halfH, -hoodHalf + 10, shoulder, -hoodHalf - 90, shoulder],
      ['L', -halfW + corner, shoulder],
      ['Q', -halfW, shoulder, -halfW, shoulder - corner],
      ['L', -halfW, -halfH + corner],
      ['Q', -halfW, -halfH, -halfW + corner, -halfH],
    ] as const,
  }
}

/** The same outline as an SVG path in the overlay's y-down design space. */
export function cowlSvgPath(inset: number): string {
  const { start, commands } = cowlOutline(inset)
  const tx = (x: number) => x + CLUSTER.width / 2
  const ty = (y: number) => CLUSTER.height / 2 - y
  const parts = [`M${tx(start[0])} ${ty(start[1])}`]
  for (const command of commands) {
    const [op, ...nums] = command
    const points: string[] = []
    for (let i = 0; i < nums.length; i += 2) points.push(`${tx(nums[i])} ${ty(nums[i + 1])}`)
    parts.push(`${op}${points.join(' ')}`)
  }
  return `${parts.join(' ')}Z`
}
