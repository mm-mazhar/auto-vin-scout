// app/(marketing)/_components/dash/dial-texture.ts

import * as THREE from 'three'
import { dialAngle } from './cluster-geometry'

const BANDS = [
  { from: 0, to: 30, color: '#00bc7d', word: 'LOW' },
  { from: 31, to: 70, color: '#f2ab3c', word: 'MED' },
  { from: 71, to: 100, color: '#ef5a4c', word: 'HIGH' },
] as const

const PRINT = '#e8eee9'
const PRINT_DIM = '#99a5a0'

/**
 * Paints the printed dial face: ticks, numerals, and the three risk bands,
 * each band carrying its word as well as its colour.
 */
export function createDialTexture({
  faceRadius,
  numeralFamily,
  legendFamily,
  size = 1024,
}: {
  faceRadius: number
  numeralFamily: string
  legendFamily: string
  size?: number
}): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const scale = size / (faceRadius * 2)
  ctx.translate(size / 2, size / 2)
  ctx.scale(scale, scale)

  const face = ctx.createRadialGradient(0, -40, 10, 0, 0, faceRadius)
  face.addColorStop(0, '#1a2120')
  face.addColorStop(1, '#0b100f')
  ctx.fillStyle = face
  ctx.beginPath()
  ctx.arc(0, 0, faceRadius, 0, Math.PI * 2)
  ctx.fill()

  const canvasAngle = (value: number) => -dialAngle(value)

  for (const band of BANDS) {
    ctx.strokeStyle = band.color
    ctx.lineWidth = 7
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.arc(0, 0, 150, canvasAngle(band.from), canvasAngle(band.to + (band.to === 100 ? 0 : 0.6)))
    ctx.stroke()

    const mid = canvasAngle((band.from + band.to) / 2)
    ctx.save()
    ctx.rotate(mid + Math.PI / 2)
    ctx.fillStyle = band.color
    ctx.font = `600 13px ${legendFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.letterSpacing = '2px'
    ctx.fillText(band.word, 0, -132)
    ctx.restore()
  }

  for (let value = 0; value <= 100; value += 2) {
    const major = value % 10 === 0
    const angle = canvasAngle(value)
    const outer = 182
    const inner = major ? 160 : 170
    ctx.strokeStyle = major ? PRINT : PRINT_DIM
    ctx.lineWidth = major ? 3.2 : 1.4
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
    ctx.stroke()
  }

  ctx.fillStyle = PRINT
  ctx.font = `600 27px ${numeralFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let value = 0; value <= 100; value += 10) {
    const angle = canvasAngle(value)
    ctx.fillText(String(value), Math.cos(angle) * 108, Math.sin(angle) * 108)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Soft radial falloff used for lamp light spilling onto the lens. */
export function createGlowTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.35)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  return new THREE.CanvasTexture(canvas)
}

/** Vertical falloff for the hood's shadow across the top of the lens. */
export function createHoodShadowTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, size)
    gradient.addColorStop(0, 'rgba(0,0,0,0.75)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 4, size)
  }
  return new THREE.CanvasTexture(canvas)
}

function grainCanvas(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  return canvas
}

/**
 * Turned-metal finish for the dial bezel: a conic sweep of highlights with
 * fine concentric grain. Under an orthographic camera a flat ring reflects a
 * single environment point, so the chrome has to carry its own light.
 */
export function createSpunMetalTexture(size = 1024): THREE.CanvasTexture {
  const canvas = grainCanvas(size)
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const c = size / 2
    const sweep = ctx.createConicGradient(-Math.PI / 2.6, c, c)
    const stops: Array<[number, string]> = [
      [0, '#f4f7f7'],
      [0.1, '#9aa3a3'],
      [0.22, '#4b5353'],
      [0.36, '#c9d0d0'],
      [0.5, '#f4f7f7'],
      [0.6, '#8d9696'],
      [0.74, '#454c4c'],
      [0.88, '#bfc7c7'],
      [1, '#f4f7f7'],
    ]
    for (const [offset, color] of stops) sweep.addColorStop(offset, color)
    ctx.fillStyle = sweep
    ctx.fillRect(0, 0, size, size)

    for (let r = 4; r < c; r += 1.5) {
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(c, c, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** Brushed finish for the rectangular pod frames: a diagonal highlight band over horizontal grain. */
export function createBrushedMetalTexture(size = 512): THREE.CanvasTexture {
  const canvas = grainCanvas(size)
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const band = ctx.createLinearGradient(0, 0, size, size)
    band.addColorStop(0, '#7f8888')
    band.addColorStop(0.3, '#eef2f2')
    band.addColorStop(0.42, '#9ba4a4')
    band.addColorStop(0.7, '#4c5454')
    band.addColorStop(0.86, '#c3caca')
    band.addColorStop(1, '#7f8888')
    ctx.fillStyle = band
    ctx.fillRect(0, 0, size, size)
    for (let y = 0; y < size; y += 2) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'
      ctx.fillRect(0, y, size, 1)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}
