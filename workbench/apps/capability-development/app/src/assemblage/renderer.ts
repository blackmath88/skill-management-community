/**
 * The Three.js adapter: the only file in the application that imports a renderer.
 *
 * Why a direct Three adapter and not React Three Fiber
 * ----------------------------------------------------
 * R3F v9.8.2 declares `react >=19 <19.4` and `three >=0.156`, and this app is on React 19.3.1 and
 * three 0.187.0 — so the combination is compatible on paper and was not rejected for that. It was
 * rejected because of what it would add: R3F plus Drei is two more dependencies in an application
 * whose entire runtime is React and React DOM, and the helpers that would justify them are the
 * ones whose WebGPU behaviour the build plan explicitly says not to assume. Everything this
 * viewport needs — asynchronous initialisation, render-on-demand, a bounded settling animation,
 * disposal on unmount and a forced WebGL 2 backend — is a few dozen lines here and is exercised
 * by the browser test. If a later slice needs instancing, loaders or a gizmo, R3F becomes worth
 * reconsidering; it is not worth it for six meshes.
 *
 * Everything is imported from `three/webgpu`, so one module graph serves both backends:
 * WebGPURenderer with `forceWebGL: true` initialises a WebGL 2 backend from the same code, which
 * is what makes the fallback path testable rather than theoretical.
 *
 * Nothing in here is given anything the person wrote. See ./view.ts.
 */
import {
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardNodeMaterial,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGPURenderer,
  type Material,
} from 'three/webgpu'
import { markerInlay, type MarkerShape } from './marker-geometry'
import { fitCamera, VIEW_YAW } from './project'
import type { AssemblageView, PieceView } from './view'
import type { MeshData } from './geometry'

export type Backend = 'webgpu' | 'webgl2'

export interface RendererFailure {
  /** Which attempt failed, so the interface can say which path was tried. */
  stage: 'no-canvas' | 'no-webgpu-api' | 'init' | 'first-render'
  backend: Backend
  message: string
}

export class RendererInitError extends Error {
  readonly failure: RendererFailure
  constructor(failure: RendererFailure) {
    super(failure.message)
    this.failure = failure
    this.name = 'RendererInitError'
  }
}

export interface PickResult {
  kind: 'piece' | 'marker'
  /** Instance id for a piece, marker id for a marker. Opaque either way. */
  id: string
  /** For a marker, the piece it sits on. */
  instanceId: string
}

export interface AssemblageRenderer {
  readonly backend: Backend
  /** True when shadow maps actually initialised on this backend. */
  readonly shadows: boolean
  setView(view: AssemblageView): void
  setSelected(instanceId: string | null): void
  /** One short coordinated settle. Does nothing when motion is off. */
  settle(): void
  setMotionEnabled(enabled: boolean): void
  /** Yaw, in degrees, clamped to the permitted arc. */
  orbitBy(degrees: number): void
  resetView(): void
  /** Call on container resize. Capped pixel density is applied here. */
  resize(width: number, height: number): void
  /** Stops rendering entirely: used when the viewport scrolls away or the tab is hidden. */
  setPaused(paused: boolean): void
  pick(clientX: number, clientY: number): PickResult | null
  /** Renders once, now, if anything changed. Safe to call freely. */
  invalidate(): void
  dispose(): void
  /** Counts actual draw submissions, so "renders only when needed" can be checked. */
  readonly frames: number
}

export interface RendererOptions {
  canvas: HTMLCanvasElement
  /** 'webgpu' tries the WebGPU backend; 'webgl2' forces the WebGL 2 backend. */
  backend: Backend
  /** Capped. Anything above 2 buys nothing visible and costs fill rate on a phone. */
  maxPixelRatio?: number
  /** Called if the GPU device or context is lost after a successful start. */
  onLost?: (reason: string) => void
}

const ORBIT_LIMIT = 34
const SETTLE_MS = 520

/** The elevated three-quarter view, shared with the static drawing so the two cannot drift. */
const BASE_YAW = VIEW_YAW

function geometryFrom(mesh: MeshData): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(mesh.positions.slice(), 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(mesh.normals.slice(), 3))
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * Starts a renderer, or throws RendererInitError.
 *
 * The WebGPU path checks `navigator.gpu` itself before constructing anything. WebGPURenderer
 * documents a WebGL 2 backend fallback, but relying on it to decide the backend would leave the
 * interface unable to say which one it got — and an initialisation failure inside `init()` is not
 * the same thing as a missing API. Both are reported separately, and both leave the caller free
 * to show the static drawing instead.
 */
export async function createAssemblageRenderer(options: RendererOptions): Promise<AssemblageRenderer> {
  const { canvas, backend } = options
  if (!canvas) {
    throw new RendererInitError({ stage: 'no-canvas', backend, message: 'There is no canvas to draw on.' })
  }
  if (backend === 'webgpu' && typeof navigator !== 'undefined' && !('gpu' in navigator)) {
    throw new RendererInitError({
      stage: 'no-webgpu-api',
      backend,
      message: 'This browser does not expose WebGPU.',
    })
  }

  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: false,
    forceWebGL: backend === 'webgl2',
  })
  renderer.outputColorSpace = SRGBColorSpace
  /**
   * No tone mapping.
   *
   * Tone mapping exists to squeeze a high dynamic range into a display; this scene has none. Six
   * matte solids under two soft lights produce values that are already in range, and compressing
   * them only pulls the palette away from the authored colours — which are the same colours the
   * static drawing paints flat. With it off, a piece is the colour the palette says it is in both
   * paths, which is what makes switching between them unremarkable.
   */
  renderer.toneMapping = NoToneMapping
  renderer.setPixelRatio(Math.min(options.maxPixelRatio ?? 2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1))

  let shadows = false
  try {
    renderer.shadowMap.enabled = true
    shadows = true
  } catch {
    shadows = false
  }

  try {
    await renderer.init()
  } catch (error) {
    renderer.dispose()
    throw new RendererInitError({
      stage: 'init',
      backend,
      message: error instanceof Error ? error.message : 'The renderer could not start.',
    })
  }

  /**
   * Which backend actually started — asked of the renderer, not assumed from what was requested.
   *
   * WebGPURenderer's documented WebGL 2 fallback is silent: with `navigator.gpu` present but
   * `requestAdapter()` returning null, `init()` resolves happily having built a WebGL 2 backend
   * and logs a warning nobody sees. A first version of this file reported "WebGPU" in that case,
   * which is the precise failure the build plan warns about — claiming the fallback recovered
   * something it did not. The interface now shows what is really drawing.
   */
  const actual: Backend = (renderer.backend as { isWebGPUBackend?: boolean } | undefined)?.isWebGPUBackend === true
    ? 'webgpu'
    : 'webgl2'

  if (backend === 'webgpu' && actual !== 'webgpu') {
    renderer.dispose()
    throw new RendererInitError({
      stage: 'init',
      backend,
      message:
        'WebGPU was asked for, but no adapter was available and the renderer fell back to WebGL 2. Choose automatic or WebGL 2 to use that fallback deliberately.',
    })
  }

  // ---------------------------------------------------------------- scene

  const scene = new Scene()
  const camera = new OrthographicCamera(-2, 2, 2, -2, -100, 200)

  /**
   * Light levels chosen to match the static drawing's shading, not picked by eye.
   *
   * That drawing shades a face as 0.34 ambient + 0.52 key + 0.12 fill. Three's lights are
   * physical and a diffuse BRDF divides irradiance by π, so an intensity of k·π reproduces a
   * term of k at full incidence. Hence roughly 1.45, 1.65 and 0.38 below. The numbers are not
   * round because they are derived rather than tuned.
   */
  const sky = new HemisphereLight(0xfff6ea, 0xc6bcab, 1.45)
  scene.add(sky)
  const sun = new DirectionalLight(0xfff4e2, 1.65)
  sun.position.set(4.2, 6.4, 3.4)
  sun.castShadow = shadows
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -4.5
  sun.shadow.camera.right = 4.5
  sun.shadow.camera.top = 4.5
  sun.shadow.camera.bottom = -4.5
  sun.shadow.camera.near = 0.1
  sun.shadow.camera.far = 24
  sun.shadow.bias = -0.0012
  sun.shadow.normalBias = 0.02
  scene.add(sun)
  // A second, much weaker light from the opposite side. Without it the shadowed faces of a matte
  // solid go flat black at this contrast and the facets stop reading as facets.
  const fill = new DirectionalLight(0xe8eef6, 0.38)
  fill.position.set(-3.6, 2.2, -2.8)
  scene.add(fill)

  /**
   * The ground is a shadow catcher, not a visible surface.
   *
   * ShadowMaterial draws only the shadow, so the composition sits on the clear colour with a
   * contact shadow under it and no disc edge anywhere in frame. It is also why this is not
   * `ContactShadows`: that helper renders a planar approximation into a texture, and the thing
   * that makes a stack of blocks look like it is touching is the shadow one piece casts onto
   * another, which a ground-plane approximation does not do at all.
   */
  const ground = new Mesh(new PlaneGeometry(60, 60), new ShadowMaterial({ opacity: 0.26, color: 0x2a241c }))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = shadows
  ground.position.y = -0.001
  scene.add(ground)

  const content = new Group()
  scene.add(content)

  // ---------------------------------------------------------------- resources

  const geometries = new Map<string, BufferGeometry>()
  const markerGeometries = new Map<MarkerShape, BufferGeometry>()
  const materials: Material[] = []
  const pieceMeshes = new Map<string, Mesh>()
  const markerMeshes = new Map<string, { mesh: Mesh; instanceId: string }>()
  const outlines = new Map<string, Mesh>()

  function pieceGeometry(view: PieceView): BufferGeometry {
    const existing = geometries.get(view.pieceId)
    if (existing) return existing
    const made = geometryFrom(view.definition.mesh)
    geometries.set(view.pieceId, made)
    return made
  }

  function markerGeometry(shape: MarkerShape): BufferGeometry {
    const existing = markerGeometries.get(shape)
    if (existing) return existing
    const made = geometryFrom(markerInlay(shape))
    markerGeometries.set(shape, made)
    return made
  }

  function bodyMaterial(colour: string): MeshStandardNodeMaterial {
    // Matte mineral: high roughness, no metalness, no environment map. A clearcoat or a specular
    // highlight here turns painted timber into plastic immediately.
    const material = new MeshStandardNodeMaterial({ color: new Color(colour), roughness: 0.82, metalness: 0 })
    materials.push(material)
    return material
  }

  // ---------------------------------------------------------------- state

  let current: AssemblageView | null = null
  let selected: string | null = null
  let yaw = BASE_YAW
  let motion = true
  let paused = false
  let disposed = false
  let dirty = true
  let frames = 0
  let settleStart: number | null = null
  let raf = 0

  const raycaster = new Raycaster()
  const pointer = new Vector2()

  /**
   * Framing, from the same fit the static drawing uses.
   *
   * Importing the projection module here is deliberate: if the canvas worked out its own frustum
   * the two paths would drift apart the first time either was adjusted, and switching renderer
   * would visibly re-frame the sculpture. One function, two consumers.
   */
  function placeCamera(view: AssemblageView): void {
    const width = canvas.clientWidth || 640
    const height = canvas.clientHeight || 420
    const fit = fitCamera(view, height > 0 ? width / height : 1.6, yaw)
    const centre = new Vector3(fit.centre[0], fit.centre[1], fit.centre[2])
    camera.position.set(
      centre.x + fit.eye[0] * fit.distance,
      centre.y + fit.eye[1] * fit.distance,
      centre.z + fit.eye[2] * fit.distance,
    )
    camera.up.set(fit.up[0], fit.up[1], fit.up[2])
    camera.lookAt(centre)
    camera.left = -fit.halfWidth
    camera.right = fit.halfWidth
    camera.top = fit.halfHeight
    camera.bottom = -fit.halfHeight
    // Orthographic: the near plane may sit behind the eye without anything being clipped, which
    // is what keeps a tall composition fully in frame at a shallow pitch.
    camera.near = -fit.distance * 2
    camera.far = fit.distance * 4
    camera.updateProjectionMatrix()
    sun.target.position.copy(centre)
    sun.target.updateMatrixWorld()
    scene.add(sun.target)
  }

  function applyOutline(): void {
    for (const [instanceId, outline] of outlines) {
      outline.visible = instanceId === selected
    }
  }

  function rebuild(view: AssemblageView): void {
    content.clear()
    pieceMeshes.clear()
    markerMeshes.clear()
    outlines.clear()
    renderer.setClearColor(new Color(view.groundColour), 1)

    for (const piece of view.pieces) {
      const mesh = new Mesh(pieceGeometry(piece), bodyMaterial(piece.bodyColour))
      mesh.matrixAutoUpdate = false
      mesh.matrix.fromArray(piece.matrix as number[])
      mesh.castShadow = shadows
      mesh.receiveShadow = shadows
      mesh.userData.instanceId = piece.instanceId
      content.add(mesh)
      pieceMeshes.set(piece.instanceId, mesh)

      /**
       * Selection is an outline, not a tint.
       *
       * The same geometry is drawn slightly larger with its back faces, which leaves a rim of
       * accent colour around the silhouette. A tint would change the piece's own colour, and
       * colour is never allowed to be the only carrier of meaning here — the DOM piece list
       * marks the same selection in words, which is what a keyboard or screen-reader user reads.
       */
      const outlineMaterial = new MeshStandardNodeMaterial({
        color: new Color(view.accentColour),
        roughness: 1,
        metalness: 0,
      })
      outlineMaterial.side = 1 // BackSide
      materials.push(outlineMaterial)
      const outline = new Mesh(pieceGeometry(piece), outlineMaterial)
      outline.matrixAutoUpdate = false
      outline.matrix.fromArray(piece.matrix as number[])
      outline.scale.setScalar(1.035)
      outline.matrix.scale(new Vector3(1.035, 1.035, 1.035))
      outline.visible = false
      content.add(outline)
      outlines.set(piece.instanceId, outline)

      for (const marker of piece.markers) {
        const inlayMaterial = new MeshStandardNodeMaterial({
          color: new Color(marker.shape === 'pair' ? view.inkColour : view.accentColour),
          roughness: 0.6,
          metalness: 0,
        })
        materials.push(inlayMaterial)
        const inlay = new Mesh(markerGeometry(marker.shape), inlayMaterial)
        inlay.position.set(marker.at[0], marker.at[1], marker.at[2])
        inlay.scale.setScalar(marker.size / 0.06)
        inlay.castShadow = false
        inlay.receiveShadow = false
        inlay.userData.markerId = marker.id
        inlay.userData.instanceId = piece.instanceId
        content.add(inlay)
        markerMeshes.set(marker.id, { mesh: inlay, instanceId: piece.instanceId })
      }
    }
    applyOutline()
    placeCamera(view)
  }

  /**
   * Stops the renderer's own animation loop after a frame.
   *
   * Three's `Renderer.render()` calls `this._animation.start()` on every call, and that loop is a
   * `requestAnimationFrame` chain that keeps running whether or not an animation callback was
   * ever set: `setAnimationLoop(null)` only clears the callback, it does not stop the loop. So a
   * renderer that is only ever asked to draw one frame still schedules sixty a second for the
   * life of the page. A browser check caught this — 180 frames in three idle seconds — which is
   * exactly why the build plan says to verify on-demand rendering on the real backend rather
   * than assume it.
   *
   * `_animation` is private, so this is defensive on every step and the renderer keeps working if
   * a future version removes it; the cost of that would be the idle loop coming back, not a
   * broken viewport. Stopping it is safe here because the loop's only other job is advancing
   * `nodeFrame`'s clock, and nothing in this scene is driven by time.
   */
  function stopInternalLoop(): void {
    const animation = (renderer as unknown as { _animation?: { stop?: () => void } })._animation
    try {
      animation?.stop?.()
    } catch {
      // A future three may not have it. An idle loop is a cost, not a correctness problem.
    }
  }

  function renderNow(): void {
    if (disposed || paused) return
    renderer.render(scene, camera)
    stopInternalLoop()
    frames += 1
    dirty = false
  }

  /**
   * One frame of settling: the whole composition eases down and comes to rest.
   *
   * It is a single bounded easing, started only by an explicit interaction, and the loop stops
   * when it ends — there is no idle animation, no float, no breathing and no particle anywhere in
   * this file. A person who leaves the tab open overnight gets no frames at all.
   */
  function step(now: number): void {
    raf = 0
    if (disposed || paused) return
    if (settleStart === null) {
      if (dirty) renderNow()
      return
    }
    const t = Math.min(1, (now - settleStart) / SETTLE_MS)
    const eased = 1 - Math.pow(1 - t, 3)
    content.position.y = (1 - eased) * -0.11
    content.scale.setScalar(1 + (1 - eased) * 0.012)
    renderNow()
    if (t >= 1) {
      settleStart = null
      content.position.y = 0
      content.scale.setScalar(1)
      renderNow()
      return
    }
    raf = requestAnimationFrame(step)
  }

  function schedule(): void {
    if (disposed || paused || raf !== 0) return
    raf = requestAnimationFrame(step)
  }

  // ---------------------------------------------------------------- device loss

  let lostHandler: (() => void) | null = null
  if (options.onLost) {
    const notify = options.onLost
    if (actual === 'webgl2') {
      lostHandler = () => notify('The graphics context was lost.')
      canvas.addEventListener('webglcontextlost', lostHandler as EventListener)
    } else {
      // The WebGPU device reports its own loss through a promise rather than an event.
      const device = (renderer.backend as { device?: GPUDevice } | undefined)?.device
      void device?.lost?.then((info: GPUDeviceLostInfo) => {
        if (!disposed) notify(info.message || 'The graphics device was lost.')
      })
    }
  }

  const handle: AssemblageRenderer = {
    backend: actual,
    shadows,
    get frames() {
      return frames
    },
    setView(view) {
      current = view
      rebuild(view)
      dirty = true
      schedule()
    },
    setSelected(instanceId) {
      selected = instanceId
      applyOutline()
      dirty = true
      schedule()
    },
    settle() {
      if (!motion) {
        dirty = true
        schedule()
        return
      }
      settleStart = typeof performance === 'undefined' ? Date.now() : performance.now()
      schedule()
    },
    setMotionEnabled(enabled) {
      motion = enabled
      if (!enabled && settleStart !== null) {
        settleStart = null
        content.position.y = 0
        content.scale.setScalar(1)
        dirty = true
        schedule()
      }
    },
    orbitBy(degrees) {
      yaw = Math.max(BASE_YAW - ORBIT_LIMIT, Math.min(BASE_YAW + ORBIT_LIMIT, yaw + degrees))
      if (current) placeCamera(current)
      dirty = true
      schedule()
    },
    resetView() {
      yaw = BASE_YAW
      if (current) placeCamera(current)
      dirty = true
      schedule()
    },
    resize(width, height) {
      if (width <= 0 || height <= 0) return
      renderer.setPixelRatio(
        Math.min(options.maxPixelRatio ?? 2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1),
      )
      renderer.setSize(width, height, false)
      if (current) placeCamera(current)
      dirty = true
      schedule()
    },
    setPaused(next) {
      paused = next
      if (paused) {
        if (raf !== 0) cancelAnimationFrame(raf)
        raf = 0
        settleStart = null
        content.position.y = 0
        content.scale.setScalar(1)
      } else {
        dirty = true
        schedule()
      }
    },
    pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null
      pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1))
      raycaster.setFromCamera(pointer, camera)
      // Markers first: an inlay sits on a face, so a ray through it also hits the piece under it,
      // and selecting the piece when somebody aimed at the marker would lose the record behind it.
      const markerHits = raycaster.intersectObjects(
        [...markerMeshes.values()].map((m) => m.mesh),
        false,
      )
      const firstMarker = markerHits[0]
      if (firstMarker) {
        const markerId = firstMarker.object.userData.markerId as string | undefined
        const instanceId = firstMarker.object.userData.instanceId as string | undefined
        if (markerId && instanceId) return { kind: 'marker', id: markerId, instanceId }
      }
      const pieceHits = raycaster.intersectObjects([...pieceMeshes.values()], false)
      const firstPiece = pieceHits[0]
      if (firstPiece) {
        const instanceId = firstPiece.object.userData.instanceId as string | undefined
        if (instanceId) return { kind: 'piece', id: instanceId, instanceId }
      }
      return null
    },
    invalidate() {
      dirty = true
      schedule()
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (raf !== 0) cancelAnimationFrame(raf)
      raf = 0
      if (lostHandler) canvas.removeEventListener('webglcontextlost', lostHandler as EventListener)
      content.clear()
      scene.clear()
      for (const geometry of geometries.values()) geometry.dispose()
      for (const geometry of markerGeometries.values()) geometry.dispose()
      geometries.clear()
      markerGeometries.clear()
      for (const material of materials) material.dispose()
      materials.length = 0
      ground.geometry.dispose()
      ;(ground.material as Material).dispose()
      sun.shadow.map?.dispose()
      sun.dispose()
      fill.dispose()
      sky.dispose()
      pieceMeshes.clear()
      markerMeshes.clear()
      outlines.clear()
      renderer.dispose()
    },
  }

  try {
    renderer.setSize(Math.max(1, canvas.clientWidth || 640), Math.max(1, canvas.clientHeight || 420), false)
    renderNow()
  } catch (error) {
    handle.dispose()
    throw new RendererInitError({
      stage: 'first-render',
      backend,
      message: error instanceof Error ? error.message : 'The first frame could not be drawn.',
    })
  }

  return handle
}
