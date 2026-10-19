// app/(marketing)/_components/dash/cluster-scene.tsx

'use client'

import { Environment, Lightformer, OrthographicCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import React from 'react'
import * as THREE from 'three'
import { CLUSTER, DIAL_ONLY, cowlOutline, dialAngle, lampBox } from './cluster-geometry'
import type { LampState } from './dash-state'
import {
  createBrushedMetalTexture,
  createDialTexture,
  createGlowTexture,
  createHoodShadowTexture,
  createSpunMetalTexture,
} from './dial-texture'
import { RISK_VECTORS, type VectorId } from './vectors'

export interface ClusterSceneProps {
  variant: 'wide' | 'dial'
  needle: number
  lamps: Record<VectorId, LampState>
  reducedMotion: boolean
  active: boolean
  numeralFamily: string
  legendFamily: string
  onReady: () => void
  onSettled: () => void
}

const LAMP_COLOR: Record<LampState, string | null> = {
  off: null,
  clear: null,
  pending: null,
  test: '#f2ab3c',
  medium: '#f2ab3c',
  high: '#ef5a4c',
}

function toScene(space: { width: number; height: number }, x: number, y: number): [number, number] {
  return [x - space.width / 2, space.height / 2 - y]
}

function roundedRect(cx: number, cy: number, w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape()
  const x = cx - w / 2
  const y = cy - h / 2
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}

function roundedFrame(cx: number, cy: number, w: number, h: number, r: number, thickness: number) {
  const outer = roundedRect(cx, cy, w, h, r)
  outer.holes.push(roundedRect(cx, cy, w - thickness * 2, h - thickness * 2, Math.max(2, r - thickness)))
  return outer
}

function cowlShape(inset: number): THREE.Shape {
  const { start, commands } = cowlOutline(inset)
  const shape = new THREE.Shape()
  shape.moveTo(start[0], start[1])
  for (const command of commands) {
    switch (command[0]) {
      case 'L':
        shape.lineTo(command[1], command[2])
        break
      case 'Q':
        shape.quadraticCurveTo(command[1], command[2], command[3], command[4])
        break
      case 'C':
        shape.bezierCurveTo(command[1], command[2], command[3], command[4], command[5], command[6])
        break
    }
  }
  return shape
}

function annulus(radius: number, hole: number): THREE.Shape {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
  const inner = new THREE.Path()
  inner.absarc(0, 0, hole, 0, Math.PI * 2, true)
  shape.holes.push(inner)
  return shape
}

function useMaterials() {
  return React.useMemo(
    () => ({
      rim: new THREE.MeshStandardMaterial({ color: '#131918', roughness: 0.74, metalness: 0.18, envMapIntensity: 0.5 }),
      face: new THREE.MeshPhysicalMaterial({
        color: '#090d0c',
        roughness: 0.45,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
        envMapIntensity: 0.25,
      }),
      chrome: new THREE.MeshStandardMaterial({ color: '#dfe5e4', metalness: 1, roughness: 0.3, envMapIntensity: 1.6 }),
      bezel: (() => {
        const map = createSpunMetalTexture()
        const span = (CLUSTER.dial.bezel + 3) * 2
        map.repeat.set(1 / span, 1 / span)
        map.offset.set(0.5, 0.5)
        return new THREE.MeshStandardMaterial({ map, metalness: 0.85, roughness: 0.3, envMapIntensity: 1.2 })
      })(),
      podFrame: (() => {
        const map = createBrushedMetalTexture()
        map.repeat.set(1 / CLUSTER.leftPod.w, 1 / CLUSTER.leftPod.h)
        map.offset.set(0.5, 0.5)
        return new THREE.MeshStandardMaterial({ map, metalness: 0.85, roughness: 0.32, envMapIntensity: 1.2 })
      })(),
      screen: new THREE.MeshPhysicalMaterial({
        color: '#030706',
        roughness: 0.3,
        clearcoat: 0.6,
        clearcoatRoughness: 0.12,
        envMapIntensity: 0.2,
      }),
      wellFrame: new THREE.MeshStandardMaterial({ color: '#1c2322', roughness: 0.55, metalness: 0.35 }),
      well: new THREE.MeshStandardMaterial({ color: '#050807', roughness: 0.6, envMapIntensity: 0.2 }),
      needle: new THREE.MeshStandardMaterial({
        color: '#efebe2',
        roughness: 0.42,
        emissive: '#efebe2',
        emissiveIntensity: 0.06,
      }),
      needleShadow: new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.4, depthWrite: false }),
      hubCap: new THREE.MeshStandardMaterial({ color: '#0c100f', roughness: 0.5, metalness: 0.4 }),
    }),
    []
  )
}

type Materials = ReturnType<typeof useMaterials>

function FitCamera({ width }: { width: number }) {
  const size = useThree((state) => state.size)
  return (
    <OrthographicCamera makeDefault position={[0, 0, 1200]} near={1} far={4000} zoom={size.width / width} />
  )
}

const NEEDLE_SHAPE = (() => {
  const shape = new THREE.Shape()
  shape.moveTo(-36, -5.5)
  shape.lineTo(0, -6.5)
  shape.lineTo(174, -1.4)
  shape.lineTo(176, 0)
  shape.lineTo(174, 1.4)
  shape.lineTo(0, 6.5)
  shape.lineTo(-36, 5.5)
  shape.closePath()
  return shape
})()

function Needle({
  target,
  reducedMotion,
  materials,
}: {
  target: number
  reducedMotion: boolean
  materials: Materials
}) {
  const needleRef = React.useRef<THREE.Group>(null)
  const shadowRef = React.useRef<THREE.Mesh>(null)
  const value = React.useRef(0)
  const velocity = React.useRef(0)
  const geometry = React.useMemo(
    () => new THREE.ExtrudeGeometry(NEEDLE_SHAPE, { depth: 3, bevelEnabled: true, bevelSize: 0.8, bevelThickness: 0.8, bevelSegments: 2 }),
    []
  )

  useFrame((_, delta) => {
    if (reducedMotion) {
      value.current = target
      velocity.current = 0
    } else {
      // Fixed substeps keep the spring on wall-clock time even when frames are slow.
      let remaining = Math.min(delta, 0.5)
      while (remaining > 0) {
        const dt = Math.min(remaining, 1 / 120)
        const acceleration = 70 * (target - value.current) - 12 * velocity.current
        velocity.current += acceleration * dt
        value.current += velocity.current * dt
        remaining -= dt
      }
    }
    const angle = dialAngle(value.current)
    if (needleRef.current) needleRef.current.rotation.z = angle
    if (shadowRef.current) shadowRef.current.rotation.z = angle
  })

  return (
    <>
      <mesh ref={shadowRef} geometry={geometry} material={materials.needleShadow} position={[6, -8, 2]} />
      <group ref={needleRef} position={[0, 0, 10]}>
        <mesh geometry={geometry} material={materials.needle} />
      </group>
      <mesh material={materials.chrome} position={[0, 0, 15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[21, 23, 8, 48]} />
      </mesh>
      <mesh material={materials.hubCap} position={[0, 0, 19.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[11, 11, 1, 32]} />
      </mesh>
    </>
  )
}

function Dial({
  center,
  needle,
  reducedMotion,
  materials,
  numeralFamily,
  legendFamily,
}: {
  center: [number, number]
  needle: number
  reducedMotion: boolean
  materials: Materials
  numeralFamily: string
  legendFamily: string
}) {
  const { face, bezel } = CLUSTER.dial
  const [texture, setTexture] = React.useState<THREE.CanvasTexture | null>(null)

  React.useEffect(() => {
    let cancelled = false
    let created: THREE.CanvasTexture | null = null
    Promise.all([
      document.fonts.load(`600 27px ${numeralFamily}`),
      document.fonts.load(`500 12px ${legendFamily}`),
    ])
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return
        created = createDialTexture({ faceRadius: face, numeralFamily, legendFamily })
        setTexture(created)
      })
    return () => {
      cancelled = true
      created?.dispose()
    }
  }, [face, numeralFamily, legendFamily])

  const bezelGeometry = React.useMemo(
    () =>
      new THREE.ExtrudeGeometry(annulus(bezel, face), {
        depth: 8,
        bevelEnabled: true,
        bevelSize: 2.5,
        bevelThickness: 3,
        bevelSegments: 4,
        curveSegments: 96,
      }),
    [bezel, face]
  )

  return (
    <group position={[center[0], center[1], 0]}>
      <mesh position={[0, 0, 0.4]}>
        <circleGeometry args={[face, 96]} />
        <meshStandardMaterial
          key={texture ? texture.uuid : 'unprinted'}
          map={texture}
          color={texture ? '#ffffff' : '#0e1312'}
          roughness={0.6}
          envMapIntensity={0.15}
        />
      </mesh>
      <mesh geometry={bezelGeometry} material={materials.bezel} position={[0, 0, 0.5]} />
      <Needle target={needle} reducedMotion={reducedMotion} materials={materials} />
    </group>
  )
}

function Lamp({
  center,
  state,
  glow,
  materials,
}: {
  center: [number, number]
  state: LampState
  glow: THREE.Texture
  materials: Materials
}) {
  const { w, h } = CLUSTER.lamps
  const spill = React.useRef<THREE.MeshBasicMaterial>(null)
  const color = LAMP_COLOR[state]
  const frameGeometry = React.useMemo(
    () => new THREE.ExtrudeGeometry(roundedFrame(0, 0, w, h, 10, 3), { depth: 3, bevelEnabled: false }),
    [w, h]
  )

  useFrame((_, delta) => {
    if (!spill.current) return
    const target = color ? 0.55 : 0
    spill.current.opacity += (target - spill.current.opacity) * (1 - Math.exp(-delta * 14))
    if (color) spill.current.color.set(color)
  })

  return (
    <group position={[center[0], center[1], 0]}>
      <mesh material={materials.well} position={[0, 0, 0.2]}>
        <planeGeometry args={[w - 4, h - 4]} />
      </mesh>
      <mesh geometry={frameGeometry} material={materials.wellFrame} position={[0, 0, 0.3]} />
      <mesh position={[0, 0, 1.2]} scale={[w * 1.6, h * 2.2, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={spill}
          map={glow}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color='#f2ab3c'
        />
      </mesh>
    </group>
  )
}

function Pod({ box, materials }: { box: { x: number; y: number; w: number; h: number }; materials: Materials }) {
  const [cx, cy] = toScene(CLUSTER, box.x + box.w / 2, box.y + box.h / 2)
  const frameGeometry = React.useMemo(
    () =>
      new THREE.ExtrudeGeometry(roundedFrame(0, 0, box.w, box.h, 18, 7), {
        depth: 4,
        bevelEnabled: true,
        bevelSize: 1.5,
        bevelThickness: 1.5,
        bevelSegments: 3,
        curveSegments: 12,
      }),
    [box.w, box.h]
  )
  const screenGeometry = React.useMemo(() => new THREE.ShapeGeometry(roundedRect(0, 0, box.w - 14, box.h - 14, 11)), [box.w, box.h])

  return (
    <group position={[cx, cy, 0]}>
      <mesh geometry={screenGeometry} material={materials.screen} position={[0, 0, 0.3]} />
      <mesh geometry={frameGeometry} material={materials.podFrame} position={[0, 0, 0.5]} />
    </group>
  )
}

function useIntro({
  reducedMotion,
  onSettled,
}: {
  reducedMotion: boolean
  onSettled: () => void
}) {
  const group = React.useRef<THREE.Group>(null)
  const settled = React.useRef(false)
  const pointer = React.useRef({ x: 0, y: 0 })
  const tilt = React.useRef(reducedMotion ? 0 : -0.62)
  const lift = React.useRef(reducedMotion ? 0 : -60)

  React.useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const ease = 1 - Math.exp(-Math.min(delta, 0.5) * 3.4)
    tilt.current += (0 - tilt.current) * ease
    lift.current += (0 - lift.current) * ease

    if (!settled.current && Math.abs(tilt.current) < 0.004) {
      settled.current = true
      onSettled()
    }

    const follow = reducedMotion ? 0 : 1
    const targetY = pointer.current.x * 0.035 * follow
    const targetX = tilt.current + pointer.current.y * 0.025 * follow
    g.rotation.y += (targetY - g.rotation.y) * 0.08
    g.rotation.x = targetX
    g.position.y = lift.current
  })

  return group
}

function WideCluster(props: ClusterSceneProps & { materials: Materials }) {
  const { materials, lamps, needle, reducedMotion, numeralFamily, legendFamily, onSettled } = props
  const group = useIntro({ reducedMotion, onSettled })
  const glow = React.useMemo(() => createGlowTexture(), [])
  const hoodShadow = React.useMemo(() => {
    const texture = createHoodShadowTexture()
    const top = CLUSTER.height / 2 - CLUSTER.rimInset
    const depth = 180
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.repeat.set(1 / CLUSTER.width, 1 / depth)
    texture.offset.set(0.5, -(top - depth) / depth)
    return texture
  }, [])

  const faceShape = React.useMemo(() => cowlShape(CLUSTER.rimInset), [])
  const faceGeometry = React.useMemo(() => new THREE.ShapeGeometry(faceShape, 64), [faceShape])
  const rimGeometry = React.useMemo(() => {
    const outer = cowlShape(0)
    outer.holes.push(cowlShape(CLUSTER.rimInset))
    return new THREE.ExtrudeGeometry(outer, {
      depth: 14,
      bevelEnabled: true,
      bevelSize: 6,
      bevelThickness: 7,
      bevelSegments: 6,
      curveSegments: 64,
    })
  }, [])

  React.useEffect(
    () => () => {
      glow.dispose()
      hoodShadow.dispose()
    },
    [glow, hoodShadow]
  )

  const dialCenter = toScene(CLUSTER, CLUSTER.dial.cx, CLUSTER.dial.cy)

  return (
    <group ref={group}>
      <mesh position={[0, -40, -30]} scale={[CLUSTER.width * 1.25, CLUSTER.height * 1.2, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glow} color='#000000' transparent opacity={0.75} depthWrite={false} />
      </mesh>
      <mesh geometry={faceGeometry} material={materials.face} />
      <mesh geometry={faceGeometry} position={[0, 0, 0.6]}>
        <meshBasicMaterial map={hoodShadow} transparent depthWrite={false} />
      </mesh>
      <mesh geometry={rimGeometry} material={materials.rim} />
      <Pod box={CLUSTER.leftPod} materials={materials} />
      <Pod box={CLUSTER.rightPod} materials={materials} />
      <Dial
        center={dialCenter}
        needle={needle}
        reducedMotion={reducedMotion}
        materials={materials}
        numeralFamily={numeralFamily}
        legendFamily={legendFamily}
      />
      {RISK_VECTORS.map((vector, index) => {
        const box = lampBox(index)
        return (
          <Lamp
            key={vector.id}
            center={toScene(CLUSTER, box.x + box.w / 2, box.y + box.h / 2)}
            state={lamps[vector.id]}
            glow={glow}
            materials={materials}
          />
        )
      })}
    </group>
  )
}

function DialCluster(props: ClusterSceneProps & { materials: Materials }) {
  const { materials, needle, reducedMotion, numeralFamily, legendFamily, onSettled } = props
  const group = useIntro({ reducedMotion, onSettled })
  const rimGeometry = React.useMemo(
    () =>
      new THREE.ExtrudeGeometry(annulus(236, 214), {
        depth: 12,
        bevelEnabled: true,
        bevelSize: 4,
        bevelThickness: 5,
        bevelSegments: 5,
        curveSegments: 96,
      }),
    []
  )
  return (
    <group ref={group}>
      <mesh material={materials.face}>
        <circleGeometry args={[216, 96]} />
      </mesh>
      <mesh geometry={rimGeometry} material={materials.rim} />
      <Dial
        center={[0, 0]}
        needle={needle}
        reducedMotion={reducedMotion}
        materials={materials}
        numeralFamily={numeralFamily}
        legendFamily={legendFamily}
      />
    </group>
  )
}

function SceneContents(props: ClusterSceneProps) {
  const materials = useMaterials()
  const width = props.variant === 'wide' ? CLUSTER.width : DIAL_ONLY.width

  React.useEffect(
    () => () => {
      Object.values(materials).forEach((material) => {
        if ('map' in material) material.map?.dispose()
        material.dispose()
      })
    },
    [materials]
  )

  return (
    <>
      <FitCamera width={width} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-500, 700, 900]} intensity={1.3} />
      <directionalLight position={[600, -200, 500]} intensity={0.25} color='#bff5dc' />
      <Environment resolution={256} frames={1}>
        <Lightformer form='rect' intensity={1.8} position={[0, 6, 1.5]} rotation={[Math.PI / 2, 0, 0]} scale={[16, 2, 1]} color='#f1f7f4' />
        <Lightformer form='rect' intensity={0.5} position={[-7, 1, 0]} rotation={[0, Math.PI / 2, 0]} scale={[6, 5, 1]} color='#a8ecd0' />
        <Lightformer form='rect' intensity={0.6} position={[7, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 4, 1]} color='#ffffff' />
        <Lightformer form='rect' intensity={0.35} position={[0, -6, 1]} rotation={[-Math.PI / 2, 0, 0]} scale={[16, 1.5, 1]} color='#cfe9de' />
        {/* Thin strips in front of the cluster streak the chrome rings; matte surfaces barely see them. */}
        <Lightformer form='rect' intensity={2.2} position={[-2.2, 0, 6]} scale={[0.35, 9, 1]} color='#ffffff' />
        <Lightformer form='rect' intensity={1.4} position={[2.6, 0.5, 6]} scale={[0.2, 9, 1]} color='#f1f7f4' />
        <Lightformer form='rect' intensity={0.9} position={[0, 2.8, 6]} scale={[10, 0.18, 1]} color='#ffffff' />
      </Environment>
      {props.variant === 'wide' ? (
        <WideCluster {...props} materials={materials} />
      ) : (
        <DialCluster {...props} materials={materials} />
      )}
    </>
  )
}

export default function ClusterScene(props: ClusterSceneProps) {
  const { active, onReady } = props
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
      onCreated={() => onReady()}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden
    >
      <SceneContents {...props} />
    </Canvas>
  )
}
