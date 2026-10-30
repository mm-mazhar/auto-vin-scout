// app/(marketing)/_components/lift/lift-scene.ts
//
// Framework-agnostic three.js scene for the landing hero: a sedan up on a
// two-post lift, seen from below, with a work lamp the visitor steers across
// the underbody. Findings are placed on real parts; the scene reports how
// strongly each one is lit so the React layer can draw paint-pen marks.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export type FindingAnchor = {
  id: string
  /** Point on the underbody, in car-local metres (x: length, y: up, z: width). */
  position: [number, number, number]
}

export type FindingFrame = {
  id: string
  x: number
  y: number
  /** 0..1, how directly the lamp is on this finding right now. */
  lit: number
  /** Latched once the lamp has rested on the finding. */
  found: boolean
  onScreen: boolean
}

export type LiftSceneOptions = {
  canvas: HTMLCanvasElement
  findings: FindingAnchor[]
  assetBase?: string
  reducedMotion?: boolean
  onFrame?: (frames: FindingFrame[]) => void
  onReady?: () => void
}

const LIFT_HEIGHT = 1.86 // floor-pan height above the shop floor
const REVEAL_RADIUS = 0.42
const FOUND_THRESHOLD = 0.72

const COLORS = {
  liftYellow: 0xf2c11b,
  liftShadow: 0x8a6a06,
  rubber: 0x161616,
  paint: 0x26303a,
  steel: 0x5b6066,
  darkSteel: 0x2c2f33,
  aluminium: 0x7d848b,
  plastic: 0x1b1c1e,
  tyre: 0x141414,
  fog: 0x1d2228,
  tube: 0xeaf4ff,
}

export class LiftScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60)
  private car = new THREE.Group()
  private lamp: THREE.SpotLight
  private lampTarget = new THREE.Object3D()
  private targets: THREE.Object3D[] = []
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private aim = new THREE.Vector3(0.2, LIFT_HEIGHT, 0)
  private desiredAim = new THREE.Vector3(0.2, LIFT_HEIGHT, 0)
  private lastPointerAt = -Infinity
  private timer = new THREE.Timer()
  private frameId = 0
  private running = false
  private disposed = false
  private found = new Set<string>()
  private anchors: { id: string; world: THREE.Vector3 }[]
  private opts: LiftSceneOptions
  private disposables: { dispose: () => void }[] = []
  private resizeObserver: ResizeObserver
  private tmp = new THREE.Vector3()

  constructor(opts: LiftSceneOptions) {
    this.opts = opts
    const { canvas } = opts

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.4
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap

    this.scene.background = new THREE.Color(COLORS.fog)
    this.scene.fog = new THREE.Fog(COLORS.fog, 7, 19)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environment = envTexture
    this.scene.environmentIntensity = 0.2
    this.disposables.push(envTexture, pmrem)

    this.car.position.y = LIFT_HEIGHT
    this.scene.add(this.car)

    this.lamp = new THREE.SpotLight(0xfff1dc, 75, 0, 0.56, 0.62, 2)
    this.lamp.castShadow = true
    this.lamp.shadow.mapSize.set(1024, 1024)
    this.lamp.shadow.bias = -0.0008
    this.lamp.shadow.camera.near = 0.3
    this.lamp.shadow.camera.far = 8
    this.lamp.target = this.lampTarget
    this.scene.add(this.lamp, this.lampTarget)

    const base = opts.assetBase ?? '/landing'
    this.buildShop(base)
    this.buildCar(base)
    this.buildLift()

    this.anchors = opts.findings.map((f) => ({
      id: f.id,
      world: new THREE.Vector3(...f.position).add(this.car.position),
    }))

    if (opts.reducedMotion) {
      for (const f of opts.findings) this.found.add(f.id)
    }

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.resize()

    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerdown', this.onPointerMove)
    canvas.addEventListener('pointerleave', this.onPointerLeave)

    this.renderOnce()
    opts.onReady?.()
  }

  start() {
    if (this.running || this.disposed) return
    this.running = true
    this.timer.reset()
    const loop = () => {
      if (!this.running) return
      this.tick()
      this.frameId = requestAnimationFrame(loop)
    }
    this.frameId = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.frameId)
  }

  /** Point the lamp at a finding (keyboard and list access). */
  focusFinding(id: string) {
    const anchor = this.anchors.find((a) => a.id === id)
    if (!anchor) return
    this.desiredAim.copy(anchor.world)
    this.lastPointerAt = performance.now()
    if (!this.running) {
      this.aim.copy(anchor.world)
      this.renderOnce()
    }
  }

  dispose() {
    this.disposed = true
    this.stop()
    this.resizeObserver.disconnect()
    const canvas = this.opts.canvas
    canvas.removeEventListener('pointermove', this.onPointerMove)
    canvas.removeEventListener('pointerdown', this.onPointerMove)
    canvas.removeEventListener('pointerleave', this.onPointerLeave)
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose()
    })
    this.disposables.forEach((d) => d.dispose())
    this.renderer.dispose()
  }

  // ---------------------------------------------------------------- frame

  private tick() {
    this.timer.update()
    const dt = Math.min(this.timer.getDelta(), 0.05)
    const now = performance.now()

    if (!this.opts.reducedMotion && now - this.lastPointerAt > 2600) {
      // Idle: the lamp works its own way along the underbody.
      const t = now / 1000
      this.desiredAim.set(
        Math.sin(t * 0.33) * 1.75,
        LIFT_HEIGHT - 0.05,
        Math.sin(t * 0.52 + 0.8) * 0.62,
      )
    }

    const k = 1 - Math.exp(-dt * 7)
    this.aim.lerp(this.desiredAim, k)
    this.renderOnce()
  }

  private renderOnce() {
    // The lamp is hand-held about a metre below whatever it points at,
    // angled in from the viewer's side.
    this.lamp.position.set(this.aim.x - 0.45, this.aim.y - 1.05, this.aim.z + 0.35)
    this.lampTarget.position.copy(this.aim)
    this.renderer.render(this.scene, this.camera)
    this.emitFrame()
  }

  private emitFrame() {
    const onFrame = this.opts.onFrame
    if (!onFrame) return
    const canvas = this.opts.canvas
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const frames: FindingFrame[] = this.anchors.map(({ id, world }) => {
      const d = world.distanceTo(this.aim)
      const lit = this.opts.reducedMotion ? 1 : smoothstep(REVEAL_RADIUS, REVEAL_RADIUS * 0.3, d)
      if (lit > FOUND_THRESHOLD) this.found.add(id)
      this.tmp.copy(world).project(this.camera)
      const onScreen = this.tmp.z < 1 && Math.abs(this.tmp.x) < 1.05 && Math.abs(this.tmp.y) < 1.05
      return {
        id,
        x: ((this.tmp.x + 1) / 2) * w,
        y: ((1 - this.tmp.y) / 2) * h,
        lit,
        found: this.found.has(id),
        onScreen,
      }
    })
    onFrame(frames)
  }

  private resize() {
    const canvas = this.opts.canvas
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    const aspect = w / h
    this.camera.aspect = aspect
    // The viewer stands under the rear corner of the car, looking forward
    // and up along the underbody, the way you walk in under a lift.
    if (aspect < 0.85) {
      this.camera.fov = 62
      this.camera.position.set(-2.55, 0.55, 0.55)
      this.camera.lookAt(0.7, LIFT_HEIGHT + 0.05, -0.05)
    } else if (aspect < 1.35) {
      this.camera.fov = 54
      this.camera.position.set(-3.0, 0.7, 1.0)
      this.camera.lookAt(0.65, LIFT_HEIGHT, -0.2)
    } else {
      this.camera.fov = 47
      this.camera.position.set(-3.55, 0.6, 1.2)
      this.camera.lookAt(0.35, LIFT_HEIGHT + 0.08, -0.55)
    }
    this.camera.updateProjectionMatrix()
    if (!this.running) this.renderOnce()
  }

  // -------------------------------------------------------------- input

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.opts.canvas.getBoundingClientRect()
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster.intersectObjects(this.targets, false)[0]
    if (hit) {
      this.desiredAim.copy(hit.point)
    } else {
      const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), LIFT_HEIGHT)
      const point = this.raycaster.ray.intersectPlane(plane, this.tmp)
      if (point) this.desiredAim.copy(point)
    }
    this.lastPointerAt = performance.now()
    if (!this.running) {
      this.aim.copy(this.desiredAim)
      this.renderOnce()
    }
  }

  private onPointerLeave = () => {
    this.lastPointerAt = performance.now() - 1800
  }

  // -------------------------------------------------------------- build

  private texture(url: string, repeat: [number, number], color = true) {
    const tex = new THREE.TextureLoader().load(url, () => {
      if (!this.running && !this.disposed) this.renderOnce()
    })
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(...repeat)
    tex.anisotropy = 8
    if (color) tex.colorSpace = THREE.SRGBColorSpace
    this.disposables.push(tex)
    return tex
  }

  private buildShop(base: string) {
    const floorTex = this.texture(`${base}/concrete-floor.jpg`, [7, 7])
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.MeshStandardMaterial({ map: floorTex, color: 0x9a9fa6, roughness: 0.62, metalness: 0.05 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)

    // Fluorescent tubes in rows on the ceiling.
    const tubeMat = new THREE.MeshBasicMaterial({ color: COLORS.tube })
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.7, metalness: 0.4 })
    const tubeGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.2, 10)
    const housingGeo = new THREE.BoxGeometry(2.4, 0.06, 0.26)
    for (const x of [-4.5, -1.5, 1.5, 4.5]) {
      for (const z of [-3.2, 0, 3.2]) {
        const housing = new THREE.Mesh(housingGeo, housingMat)
        housing.position.set(x, 4.62, z)
        this.scene.add(housing)
        for (const dz of [-0.06, 0.06]) {
          const tube = new THREE.Mesh(tubeGeo, tubeMat)
          tube.rotation.z = Math.PI / 2
          tube.position.set(x, 4.56, z + dz)
          this.scene.add(tube)
        }
      }
    }
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.95 }),
    )
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.y = 4.68
    this.scene.add(ceiling)

    // Cool overhead light from the tubes; the underbody is lit by its bounce
    // off the bright floor, which is what the hemisphere's ground colour does.
    const hemi = new THREE.HemisphereLight(0x223040, 0xa8a294, 1.5)
    const overhead = new THREE.DirectionalLight(0xe6f0ff, 0.3)
    overhead.position.set(0.5, 6, 1)
    const rim = new THREE.PointLight(0xdfe9ff, 14, 9, 2)
    rim.position.set(2.5, 4.3, -2.5)
    this.scene.add(hemi, overhead, rim)

    // Back wall, far enough to fall into the fog.
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 6),
      new THREE.MeshStandardMaterial({ color: 0x272c31, roughness: 0.95 }),
    )
    wall.position.set(0, 3, -6.5)
    this.scene.add(wall)
  }

  private buildCar(base: string) {
    const grime = this.texture(`${base}/underbody-grime.jpg`, [3, 1.4])
    const mat = {
      underbody: new THREE.MeshStandardMaterial({ map: grime, color: 0xd2d6da, roughness: 0.85, metalness: 0.15 }),
      paint: new THREE.MeshPhysicalMaterial({ color: COLORS.paint, roughness: 0.5, metalness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.4, envMapIntensity: 0.35 }),
      steel: new THREE.MeshStandardMaterial({ color: COLORS.steel, roughness: 0.55, metalness: 0.75 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: COLORS.darkSteel, roughness: 0.7, metalness: 0.6 }),
      aluminium: new THREE.MeshStandardMaterial({ color: COLORS.aluminium, roughness: 0.42, metalness: 0.85 }),
      plastic: new THREE.MeshStandardMaterial({ color: COLORS.plastic, roughness: 0.75, metalness: 0.05 }),
      tyre: new THREE.MeshStandardMaterial({ color: COLORS.tyre, roughness: 0.92, metalness: 0 }),
      exhaust: new THREE.MeshStandardMaterial({ color: 0x6d655c, roughness: 0.6, metalness: 0.7 }),
    }

    const add = (mesh: THREE.Mesh, target = true) => {
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.car.add(mesh)
      if (target) this.targets.push(mesh)
      return mesh
    }
    const block = (w: number, h: number, d: number, m: THREE.Material, r = 0.015) =>
      new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), m)

    // Body shell: side profile extruded across the width, with wheel arches.
    const s = new THREE.Shape()
    s.moveTo(2.12, 0)
    s.quadraticCurveTo(2.36, 0.02, 2.38, 0.3)
    s.quadraticCurveTo(2.4, 0.58, 2.18, 0.64)
    s.lineTo(1.05, 0.76)
    s.quadraticCurveTo(0.62, 0.8, 0.18, 1.2)
    s.lineTo(-0.9, 1.24)
    s.quadraticCurveTo(-1.45, 1.18, -1.86, 0.9)
    s.lineTo(-2.26, 0.84)
    s.quadraticCurveTo(-2.4, 0.6, -2.36, 0.24)
    s.quadraticCurveTo(-2.32, 0.02, -2.14, 0)
    s.lineTo(2.12, 0)
    const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: 1.66, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 3, curveSegments: 18 })
    bodyGeo.translate(0, 0.07, -0.83)
    add(new THREE.Mesh(bodyGeo, mat.paint), false)

    // Floor pan between the axles and the narrower front and rear sections.
    add(block(1.92, 0.035, 1.66, mat.underbody, 0.01)).position.set(0, -0.005, 0)
    add(block(0.62, 0.03, 1.12, mat.underbody, 0.01)).position.set(-2.0, 0.01, 0)
    add(block(0.5, 0.03, 1.5, mat.plastic, 0.01)).position.set(1.98, 0.02, 0) // splash shield

    // Transmission tunnel and heat shield.
    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.3, 20, 1, true, 0, Math.PI), mat.underbody)
    tunnel.rotation.set(0, 0, Math.PI / 2)
    tunnel.scale.set(1, 1, 0.55)
    tunnel.position.set(0.05, 0.0, 0)
    tunnel.material = mat.underbody.clone()
    ;(tunnel.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    add(tunnel)
    add(block(1.3, 0.012, 0.36, mat.aluminium, 0.004)).position.set(0.2, -0.03, 0.02)

    // Rocker panels and pinch welds along both sides.
    for (const z of [-0.84, 0.84]) {
      add(block(1.95, 0.11, 0.07, mat.underbody, 0.02)).position.set(0, -0.04, z)
      add(block(1.95, 0.05, 0.012, mat.darkSteel, 0.004)).position.set(0, -0.11, z * 0.995)
    }

    // Front subframe, rails and control arms.
    for (const z of [-0.42, 0.42]) {
      add(block(1.25, 0.08, 0.09, mat.darkSteel, 0.012)).position.set(1.55, -0.08, z)
      add(block(1.55, 0.07, 0.08, mat.underbody, 0.012)).position.set(-1.25, -0.04, z * 1.1)
    }
    add(block(0.12, 0.08, 0.92, mat.darkSteel, 0.012)).position.set(1.12, -0.09, 0)
    add(block(0.12, 0.08, 0.92, mat.darkSteel, 0.012)).position.set(1.95, -0.09, 0)
    for (const z of [-1, 1]) {
      const arm = add(block(0.42, 0.04, 0.06, mat.steel, 0.01))
      arm.position.set(1.38, -0.1, z * 0.6)
      arm.rotation.y = z * 0.5
    }

    // Engine oil pan and transmission bell housing.
    add(block(0.48, 0.13, 0.42, mat.aluminium, 0.03)).position.set(1.62, -0.16, -0.06)
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.42, 22), mat.aluminium)
    bell.rotation.z = Math.PI / 2
    bell.position.set(1.12, -0.07, -0.04)
    add(bell)
    add(block(0.5, 0.18, 0.3, mat.aluminium, 0.04)).position.set(0.72, -0.06, -0.02)

    // Exhaust: downpipe, catalytic converter, mid pipe, resonator, muffler.
    const pipe = (from: THREE.Vector3, to: THREE.Vector3, r: number) => {
      const len = from.distanceTo(to)
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat.exhaust)
      m.position.copy(from).add(to).multiplyScalar(0.5)
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
      return add(m)
    }
    const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
    pipe(P(1.45, -0.12, 0.18), P(0.95, -0.1, 0.08), 0.03)
    pipe(P(0.62, -0.1, 0.08), P(0.95, -0.1, 0.08), 0.075) // cat
    pipe(P(0.62, -0.09, 0.08), P(-0.9, -0.08, 0.08), 0.03)
    pipe(P(-0.15, -0.09, 0.08), P(0.25, -0.09, 0.08), 0.06) // resonator
    pipe(P(-0.9, -0.08, 0.08), P(-1.55, -0.07, 0.3), 0.03)
    add(block(0.62, 0.17, 0.38, mat.exhaust, 0.06)).position.set(-1.85, -0.08, 0.33) // muffler
    pipe(P(-2.16, -0.1, 0.42), P(-2.4, -0.11, 0.42), 0.032) // tail pipe

    // Fuel tank ahead of the rear axle, with straps.
    add(block(0.72, 0.2, 0.95, mat.plastic, 0.06)).position.set(-0.82, -0.12, -0.18)
    for (const x of [-1.0, -0.64]) add(block(0.04, 0.012, 1.0, mat.steel, 0.004)).position.set(x, -0.225, -0.18)

    // Rear twist-beam axle and trailing arms.
    add(block(0.09, 0.09, 1.36, mat.darkSteel, 0.02)).position.set(-1.38, -0.06, 0)
    for (const z of [-0.62, 0.62]) {
      const ta = add(block(0.6, 0.06, 0.07, mat.darkSteel, 0.015))
      ta.position.set(-1.12, -0.06, z)
      ta.rotation.y = z > 0 ? -0.08 : 0.08
    }

    // Wheels hang a little on the lift, as they do in the shop.
    const tyreProfile: THREE.Vector2[] = []
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI
      tyreProfile.push(new THREE.Vector2(0.235 + Math.sin(a) * 0.105, Math.cos(a) * 0.11))
    }
    const tyreGeo = new THREE.LatheGeometry(tyreProfile, 40)
    const rimGeo = new THREE.CylinderGeometry(0.235, 0.235, 0.19, 32)
    const discGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.028, 28)
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x3d4247, roughness: 0.5, metalness: 0.8 })
    for (const x of [-1.38, 1.38]) {
      for (const z of [-0.76, 0.76]) {
        const wheel = new THREE.Group()
        const tyre = new THREE.Mesh(tyreGeo, mat.tyre)
        const rim = new THREE.Mesh(rimGeo, rimMat)
        const disc = new THREE.Mesh(discGeo, mat.steel)
        disc.position.y = -Math.sign(z) * 0.12
        for (const m of [tyre, rim, disc]) {
          m.castShadow = true
          m.receiveShadow = true
          wheel.add(m)
        }
        wheel.rotation.x = Math.PI / 2
        wheel.position.set(x, -0.04, z)
        this.car.add(wheel)
        this.targets.push(tyre)
      }
    }

    this.buildFindingPatches(base, mat)
  }

  /** Visible evidence on the parts the findings point at. */
  private buildFindingPatches(base: string, mat: Record<string, THREE.Material>) {
    const blob = makeBlobAlpha()
    this.disposables.push(blob)
    const patch = (map: THREE.Texture, w: number, d: number, x: number, y: number, z: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshStandardMaterial({ map, alphaMap: blob, transparent: true, depthWrite: false, roughness: 0.9, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, ...extra }),
      )
      m.rotation.x = Math.PI / 2 // face down, towards the viewer below
      m.position.set(x, y, z)
      m.receiveShadow = true
      this.car.add(m)
      return m
    }
    const silt = this.texture(`${base}/flood-silt.jpg`, [1.2, 1.2])
    const rust = this.texture(`${base}/surface-rust.jpg`, [1.6, 0.6])
    patch(silt, 0.95, 0.75, -0.2, -0.026, -0.46)
    patch(silt, 0.6, 0.5, 0.45, -0.026, 0.5)
    const rocker = patch(rust, 0.9, 0.22, -0.55, -0.0955, 0.875)
    rocker.rotation.set(0, 0, 0)
    rocker.position.set(-0.55, -0.04, 0.876)
    patch(rust, 0.7, 0.4, -1.3, -0.105, 0.5)

    // Oil weeping from the pan.
    patch(this.makeSolid(0x050505), 0.36, 0.3, 1.66, -0.226, -0.02, { roughness: 0.08, metalness: 0.3, opacity: 0.9 })

    // Repair on the left front rail: primer, a ragged weld bead.
    const primer = new THREE.Mesh(
      new RoundedBoxGeometry(0.36, 0.085, 0.095, 2, 0.012),
      new THREE.MeshStandardMaterial({ color: 0x9c4a2c, roughness: 0.85, metalness: 0.1 }),
    )
    primer.position.set(1.72, -0.08, -0.42)
    this.car.add(primer)
    this.targets.push(primer)
    const beadPts: THREE.Vector3[] = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      beadPts.push(new THREE.Vector3(1.62 + t * 0.2, -0.124 + Math.sin(t * 40) * 0.003, -0.42 + Math.sin(t * 9) * 0.04))
    }
    const bead = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beadPts), 60, 0.009, 6), mat.steel)
    this.car.add(bead)
  }

  private makeSolid(hex: number) {
    const c = document.createElement('canvas')
    c.width = c.height = 4
    const g = c.getContext('2d')!
    g.fillStyle = `#${hex.toString(16).padStart(6, '0')}`
    g.fillRect(0, 0, 4, 4)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    this.disposables.push(t)
    return t
  }

  private buildLift() {
    const yellow = new THREE.MeshStandardMaterial({ color: COLORS.liftYellow, roughness: 0.45, metalness: 0.3 })
    const shade = new THREE.MeshStandardMaterial({ color: COLORS.liftShadow, roughness: 0.6, metalness: 0.3 })
    const rubber = new THREE.MeshStandardMaterial({ color: COLORS.rubber, roughness: 0.9 })
    const steel = new THREE.MeshStandardMaterial({ color: 0x6b7178, roughness: 0.5, metalness: 0.8 })

    const mesh = (geo: THREE.BufferGeometry, m: THREE.Material) => {
      const x = new THREE.Mesh(geo, m)
      x.castShadow = true
      x.receiveShadow = true
      this.scene.add(x)
      return x
    }
    const postZ = 1.42
    for (const side of [-1, 1]) {
      const z = side * postZ
      mesh(new RoundedBoxGeometry(0.34, 3.9, 0.3, 2, 0.02), yellow).position.set(-0.1, 1.95, z)
      mesh(new THREE.BoxGeometry(0.12, 3.7, 0.04), shade).position.set(-0.1, 1.95, z - side * 0.16)
      mesh(new RoundedBoxGeometry(0.6, 0.02, 0.5, 1, 0.005), steel).position.set(-0.1, 0.01, z) // base plate
      const carriage = mesh(new RoundedBoxGeometry(0.42, 0.5, 0.36, 2, 0.02), yellow)
      carriage.position.set(-0.1, LIFT_HEIGHT - 0.32, z - side * 0.06)

      // Short front arm and long rear arm, swung in to the lift points.
      for (const [px, len] of [[1.08, 0], [-1.18, 0]] as const) {
        const from = new THREE.Vector3(-0.1, LIFT_HEIGHT - 0.42, z - side * 0.18)
        const to = new THREE.Vector3(px, LIFT_HEIGHT - 0.42, side * 0.84)
        void len
        const dir = to.clone().sub(from)
        const arm = mesh(new RoundedBoxGeometry(dir.length(), 0.09, 0.13, 2, 0.02), yellow)
        arm.position.copy(from).add(to).multiplyScalar(0.5)
        arm.rotation.y = -Math.atan2(dir.z, dir.x)
        const riser = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 14), steel)
        riser.position.set(to.x, LIFT_HEIGHT - 0.27, to.z)
        const pad = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 20), rubber)
        pad.position.set(to.x, LIFT_HEIGHT - 0.135, to.z)
      }
    }
    // Overhead beam joining the posts.
    mesh(new RoundedBoxGeometry(0.22, 0.26, postZ * 2 + 0.3, 2, 0.02), yellow).position.set(-0.1, 3.95, 0)
  }
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

/** Soft, irregular alpha so evidence patches have no hard edges. */
function makeBlobAlpha() {
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, size, size)
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2
    const r = rand() * size * 0.28
    const x = size / 2 + Math.cos(a) * r
    const y = size / 2 + Math.sin(a) * r * 0.8
    const rad = size * (0.08 + rand() * 0.14)
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, 'rgba(255,255,255,0.55)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
  }
  const tex = new THREE.CanvasTexture(c)
  return tex
}
