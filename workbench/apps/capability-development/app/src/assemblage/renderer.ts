import * as THREE from 'three/webgpu'
import { geometry } from './geometry'
import { PALETTES, part, poses, type Composition } from './model'
export type Backend = 'auto' | 'webgl' | 'static'
export interface SceneInput {
  composition: Composition
  selected: string
  preview?: string
  azimuth: number
}
export async function mountScene(
  host: HTMLElement,
  backend: Backend,
  getInput: () => SceneInput,
  select: (id: string) => void,
  status: (s: string) => void,
  signal: AbortSignal,
) {
  const bounded = async <T>(work: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Graphics initialization timed out')), 8000)
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
  }
  let disposed = false
  let frame = 0
  let visible = true
  let started = 0
  let submissions = 0
  const initStarted = performance.now()
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#f1eee6')
  const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 50)
  const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: backend === 'webgl' })
  const canvas = renderer.domElement
  canvas.setAttribute('aria-hidden', 'true')
  canvas.dataset.submissions = '0'
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  const ambient = new THREE.HemisphereLight('#fff5e0', '#8a8e7e', 2.2)
  scene.add(ambient)
  const sun = new THREE.DirectionalLight('#fff4df', 3.8)
  sun.position.set(-3, 7, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -5
  sun.shadow.camera.right = 5
  sun.shadow.camera.top = 6
  sun.shadow.camera.bottom = -5
  sun.shadow.normalBias = 0.025
  sun.shadow.bias = -0.0003
  scene.add(sun)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: '#f1eee6', roughness: 1 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.015
  ground.receiveShadow = true
  scene.add(ground)
  const sculpture = new THREE.Group()
  scene.add(sculpture)
  const raycaster = new THREE.Raycaster()
  let ready = false
  let dirty = true
  let previous = ''
  let animation = false
  const disposeObjects = (root: THREE.Object3D) =>
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        const materials = Array.isArray(o.material) ? o.material : [o.material]
        materials.forEach((m) => m.dispose())
      }
    })
  const fail = () => {
    if (disposed) return
    status('Static view · graphics unavailable. Your composition and controls are safe.')
    canvas.style.visibility = 'hidden'
    host.style.pointerEvents = 'none'
    ready = false
    cancelAnimationFrame(frame)
  }
  renderer.onDeviceLost = fail
  const lost = (event: Event) => {
    event.preventDefault()
    fail()
  }
  canvas.addEventListener('webglcontextlost', lost)
  const rebuild = () => {
    const input = getInput()
    const signature = JSON.stringify([input.composition, input.selected, input.preview])
    if (signature === previous) return
    animation =
      previous !== '' &&
      !input.composition.motionOff &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
    previous = signature
    started = performance.now()
    disposeObjects(sculpture)
    sculpture.clear()
    const transforms = poses(input.composition)
    for (const p of input.composition.pieces) {
      const g = geometry(p.partId)
      const positions: number[] = []
      for (const face of g.faces)
        for (let i = 1; i < face.length - 1; i++)
          for (const index of [face[0]!, face[i]!, face[i + 1]!]) positions.push(...g.vertices[index]!)
      const buffer = new THREE.BufferGeometry()
      buffer.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      buffer.computeVertexNormals()
      const material = new THREE.MeshStandardMaterial({
        color: PALETTES[input.composition.palette].colors[part(p.partId).color]!,
        roughness: 0.86,
        metalness: 0,
        flatShading: true,
        side: THREE.DoubleSide,
        transparent: p.id === input.preview,
        opacity: p.id === input.preview ? 0.45 : 1,
      })
      if (p.id === input.selected) {
        material.emissive.set('#617454')
        material.emissiveIntensity = 0.1
      }
      const mesh = new THREE.Mesh(buffer, material)
      const pose = transforms.get(p.id)!
      mesh.position.fromArray(pose.at)
      mesh.rotation.y = (pose.angle * Math.PI) / 180
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.id = p.id
      sculpture.add(mesh)
      for (const marker of input.composition.markers.filter((m) => m.instanceId === p.id && m.visible)) {
        const [, , depth] = part(p.partId).size
        const h = part(p.partId).size[1]
        const mat = new THREE.MeshStandardMaterial({ color: '#efe1b8', roughness: 0.75, metalness: 0.12 })
        const group = new THREE.Group()
        group.position.set(0, h * 0.8, depth / 2 + 0.035)
        group.userData.id = marker.id
        const add = (geo: THREE.BufferGeometry, x: number, y: number) => {
          const m = new THREE.Mesh(geo, mat)
          m.position.set(x, y, 0)
          m.userData.id = marker.id
          group.add(m)
        }
        if (marker.motif === 'loop') {
          add(new THREE.TorusGeometry(0.07, 0.018, 5, 12), -0.045, 0)
          add(new THREE.TorusGeometry(0.07, 0.018, 5, 12), 0.045, 0.045)
        } else if (marker.motif === 'inlay') {
          add(new THREE.BoxGeometry(0.025, 0.18, 0.02), -0.045, 0)
          add(new THREE.BoxGeometry(0.025, 0.12, 0.02), 0.045, 0)
        } else {
          add(new THREE.BoxGeometry(0.14, 0.025, 0.02), 0, -0.04)
          add(new THREE.BoxGeometry(0.025, 0.14, 0.02), 0.065, 0.02)
        }
        mesh.add(group)
      }
    }
  }
  const render = () => {
    frame = 0
    if (disposed || !ready || document.hidden || !visible) return
    try {
      if (dirty) {
        rebuild()
        dirty = false
      }
      const input = getInput()
      const size = host.getBoundingClientRect()
      const aspect = size.width / Math.max(size.height, 1)
      camera.left = -3.05 * aspect
      camera.right = 3.05 * aspect
      camera.top = 3.05
      camera.bottom = -3.05
      camera.position.set(6 * Math.sin(input.azimuth), 4.8, 6 * Math.cos(input.azimuth))
      camera.lookAt(0, 1.5, 0)
      camera.updateProjectionMatrix()
      const t = Math.min((performance.now() - started) / 420, 1)
      sculpture.rotation.z = animation ? Math.sin(t * Math.PI * 2) * 0.012 * (1 - t) : 0
      const submittedAt = performance.now()
      renderer.render(scene, camera)
      canvas.dataset.submissionMs = (performance.now() - submittedAt).toFixed(2)
      submissions++
      canvas.dataset.submissions = String(submissions)
      if (animation && t < 1) frame = requestAnimationFrame(render)
    } catch {
      fail()
    }
  }
  const invalidate = () => {
    dirty = true
    if (!frame) frame = requestAnimationFrame(render)
  }
  const resize = new ResizeObserver(() => {
    if (ready) {
      renderer.setSize(host.clientWidth, host.clientHeight)
      invalidate()
    }
  })
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true
    if (visible) invalidate()
    else {
      cancelAnimationFrame(frame)
      frame = 0
    }
  })
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame)
      frame = 0
    } else invalidate()
  }
  const pointer = (e: PointerEvent) => {
    if (!ready) return
    const rect = canvas.getBoundingClientRect()
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    )
    const hit = raycaster.intersectObjects(sculpture.children, true)[0]
    if (hit?.object.userData.id) select(hit.object.userData.id as string)
  }
  const cleanup = () => {
    if (disposed) return
    disposed = true
    signal.removeEventListener('abort', cleanup)
    cancelAnimationFrame(frame)
    resize.disconnect()
    observer.disconnect()
    document.removeEventListener('visibilitychange', visibility)
    canvas.removeEventListener('pointerup', pointer)
    canvas.removeEventListener('webglcontextlost', lost)
    disposeObjects(scene)
    sun.shadow.dispose()
    void Promise.resolve(renderer.dispose()).catch(() => {
      /* A lost device may reject disposal. */
    })
    canvas.remove()
  }
  signal.addEventListener('abort', cleanup, { once: true })
  try {
    if (signal.aborted) throw new Error('Unmounted')
    await bounded(renderer.init())
    if (disposed) throw new Error('Unmounted')
    rebuild()
    camera.position.set(3, 4.8, 6)
    camera.lookAt(0, 1.5, 0)
    camera.updateProjectionMatrix()
    // Compile both lighting and shadow pipelines before claiming a usable backend.
    // Async compilation propagates device/shader failures to the explicit WebGL retry.
    await bounded(renderer.compileAsync(scene, camera))
    if (disposed) throw new Error('Unmounted')
    renderer.setSize(host.clientWidth, host.clientHeight)
    renderer.render(scene, camera)
    const device = (renderer.backend as unknown as { device?: GPUDevice }).device
    if (device) {
      await bounded(device.queue.onSubmittedWorkDone())
      if (disposed) throw new Error('Unmounted')
      // One tiny readback before enhancement: an initialized but blank GPU canvas is not ready.
      const probe = document.createElement('canvas')
      probe.width = 1
      probe.height = 1
      const context = probe.getContext('2d')
      if (!context) throw new Error('Could not verify graphics output')
      context.drawImage(canvas, 0, 0, 1, 1)
      if (context.getImageData(0, 0, 1, 1).data[3] === 0) throw new Error('Graphics output is blank')
    }
    if (device)
      void device.lost
        .then(() => {
          if (!disposed) fail()
        })
        .catch(() => {
          if (!disposed) fail()
        })
    ready = true
    host.style.pointerEvents = 'auto'
    canvas.dataset.initializationMs = String(Math.round(performance.now() - initStarted))
    host.append(canvas)
    resize.observe(host)
    observer.observe(host)
    document.addEventListener('visibilitychange', visibility)
    canvas.addEventListener('pointerup', pointer)
    const actual = (renderer.backend as unknown as { isWebGPUBackend?: boolean }).isWebGPUBackend
      ? 'WebGPU'
      : 'WebGL 2'
    canvas.dataset.backend = actual
    status(actual)
    invalidate()
    return { update: invalidate, dispose: cleanup }
  } catch (error) {
    cleanup()
    throw error
  }
}
