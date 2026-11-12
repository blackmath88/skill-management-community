/**
 * The static drawing: the same composition, the same camera, projected to flat polygons.
 *
 * This is not a placeholder graphic standing in for the real thing. It projects the identical
 * authored geometry through the identical near-orthographic camera and shades it with the
 * identical light direction as ./renderer.ts, so the page's first paint already shows the real
 * composition and a browser with no GPU path at all shows the same sculpture, just without the
 * orbit and the settle.
 *
 * Pure: no DOM, no canvas, no Three.js. The interface turns the polygons it returns into SVG, and
 * these functions are measurable in a unit test.
 */
import { cross, dot, normalise, sub, transformDirection, transformPoint, type Vec3 } from './math'
import { markerInlay, type MarkerShape } from './marker-geometry'
import type { AssemblageView, PieceView } from './view'

/** Kept in step with renderer.ts by the test in ./project.test.ts. */
export const VIEW_YAW = 32
export const VIEW_PITCH = 27
const LIGHT: Vec3 = [4.2, 6.4, 3.4]
const FILL_LIGHT: Vec3 = [-3.6, 2.2, -2.8]

export interface ProjectedFace {
  /** Screen-space polygon, already in viewBox units. */
  points: readonly (readonly [number, number])[]
  fill: string
  /** Greater is nearer the eye. Faces are returned already sorted back to front. */
  depth: number
  instanceId: string
  kind: 'piece' | 'marker'
  /** Marker id for a marker face, so the static drawing is clickable too. */
  markerId?: string
}

export interface Projection {
  faces: ProjectedFace[]
  viewBox: { x: number; y: number; width: number; height: number }
  /** Where the shadow ellipse goes, so the static drawing has a contact too. */
  groundShadow: { cx: number; cy: number; rx: number; ry: number }
}

export interface Camera {
  centre: Vec3
  /** Unit vector from the composition's centre towards the eye. */
  eye: Vec3
  right: Vec3
  up: Vec3
  /** Half-width and half-height of the orthographic frustum, already fitted to the content. */
  halfWidth: number
  halfHeight: number
  /** How far back to stand the eye so nothing clips. */
  distance: number
}

function axes(yawDegrees: number): { eye: Vec3; right: Vec3; up: Vec3 } {
  const y = (yawDegrees * Math.PI) / 180
  const p = (VIEW_PITCH * Math.PI) / 180
  const eye = normalise([Math.cos(p) * Math.sin(y), Math.sin(p), Math.cos(p) * Math.cos(y)])
  const right = normalise(cross([0, 1, 0], eye))
  const up = normalise(cross(eye, right))
  return { eye, right, up }
}

/** Padding around the composition, as a fraction of its projected size. */
const MARGIN = 0.16

/**
 * Fits the camera to what is actually on screen, not to a world-space bounding box.
 *
 * A box-based fit leaves a composition swimming in empty canvas, because an elevated
 * three-quarter view of a wide, low sculpture projects to far less than the box suggests. This
 * projects every corner of every piece through the view axes, takes the two-dimensional extent of
 * that, and grows it to the viewport's aspect — so the sculpture fills the frame at any aspect
 * ratio and at any point in the orbit, and the static drawing and the GPU view agree on framing.
 */
export function fitCamera(view: AssemblageView, aspect: number, yawDegrees: number): Camera {
  const { eye, right, up } = axes(yawDegrees)
  const points: Vec3[] = []
  for (const piece of view.pieces) {
    for (const corner of piece.definition.corners) points.push(transformPoint(piece.matrix, corner))
  }
  if (points.length === 0) points.push([0, 0, 0], [1, 1, 1])

  let minU = Infinity
  let maxU = -Infinity
  let minV = Infinity
  let maxV = -Infinity
  let maxDepth = -Infinity
  for (const p of points) {
    const u = dot(p, right)
    const v = dot(p, up)
    const d = dot(p, eye)
    if (u < minU) minU = u
    if (u > maxU) maxU = u
    if (v < minV) minV = v
    if (v > maxV) maxV = v
    if (d > maxDepth) maxDepth = d
  }

  const midU = (minU + maxU) / 2
  const midV = (minV + maxV) / 2
  // The centre is the point that projects to the middle of the frame, reconstructed from the
  // view axes. Depth is taken at the content's own centre so the orthographic range stays tight.
  const midD = points.reduce((sum, p) => sum + dot(p, eye), 0) / points.length
  const centre: Vec3 = [
    right[0] * midU + up[0] * midV + eye[0] * midD,
    right[1] * midU + up[1] * midV + eye[1] * midD,
    right[2] * midU + up[2] * midV + eye[2] * midD,
  ]

  let halfWidth = ((maxU - minU) / 2) * (1 + MARGIN)
  let halfHeight = ((maxV - minV) / 2) * (1 + MARGIN)
  // Grow the smaller axis rather than shrinking the larger one: nothing may be cropped.
  if (halfWidth / halfHeight < aspect) halfWidth = halfHeight * aspect
  else halfHeight = halfWidth / aspect
  const span = Math.max(maxU - minU, maxV - minV, 1)

  return { centre, eye, right, up, halfWidth, halfHeight, distance: span * 3 + maxDepth - midD }
}

function toScreen(camera: Camera, world: Vec3): readonly [number, number] {
  const d = sub(world, camera.centre)
  // SVG y grows downward, so the camera's up axis is negated once, here.
  return [dot(d, camera.right), -dot(d, camera.up)]
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const n = Number.parseInt(full.slice(0, 6), 16)
  if (!Number.isFinite(n)) return [200, 200, 200]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(rgb: readonly [number, number, number]): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${clamp(rgb[0]).toString(16).padStart(2, '0')}${clamp(rgb[1]).toString(16).padStart(2, '0')}${clamp(rgb[2]).toString(16).padStart(2, '0')}`
}

/**
 * Lambert shading against the two lights the renderer uses, plus the same hemisphere term.
 *
 * Deliberately simple and deliberately matched. The point is not physical accuracy, it is that a
 * face is the same brightness in the static drawing as it is once the GPU takes over, so the
 * enhancement is not a visible jump.
 */
function shade(colour: string, normal: Vec3): string {
  const base = parseHex(colour)
  const key = Math.max(0, dot(normal, normalise(LIGHT)))
  const fill = Math.max(0, dot(normal, normalise(FILL_LIGHT)))
  // Hemisphere: upward faces pick up the warm sky, downward faces the cooler ground bounce.
  const hemi = 0.5 + 0.5 * (normal[1] ?? 0)
  const lit = 0.34 + 0.52 * key + 0.12 * fill + 0.1 * hemi
  const warm = 1 + 0.05 * key
  return toHex([base[0] * lit * warm, base[1] * lit, base[2] * lit * (1 - 0.04 * key)])
}

function facesOf(
  piece: PieceView,
  camera: Camera,
  positions: Float32Array,
  normals: Float32Array,
  colour: string,
  kind: 'piece' | 'marker',
  transform: ((p: Vec3) => Vec3) | null,
  normalTransform: ((n: Vec3) => Vec3) | null,
  markerId?: string,
): ProjectedFace[] {
  const out: ProjectedFace[] = []
  for (let i = 0; i < positions.length; i += 9) {
    const raw: Vec3[] = [
      [positions[i] ?? 0, positions[i + 1] ?? 0, positions[i + 2] ?? 0],
      [positions[i + 3] ?? 0, positions[i + 4] ?? 0, positions[i + 5] ?? 0],
      [positions[i + 6] ?? 0, positions[i + 7] ?? 0, positions[i + 8] ?? 0],
    ]
    const world = transform ? raw.map(transform) : raw
    const rawNormal: Vec3 = [normals[i] ?? 0, normals[i + 1] ?? 0, normals[i + 2] ?? 0]
    const normal = normalise(normalTransform ? normalTransform(rawNormal) : rawNormal)
    // Back-face culling. Halves the polygon count and removes the interior faces that would
    // otherwise be painted over the front ones whenever the depth sort is close.
    if (dot(normal, camera.eye) <= 0.001) continue
    const points = world.map((p) => toScreen(camera, p))
    const depth = world.reduce((sum, p) => sum + dot(sub(p, camera.centre), camera.eye), 0) / 3
    const face: ProjectedFace = {
      points,
      fill: shade(colour, normal),
      depth,
      instanceId: piece.instanceId,
      kind,
    }
    out.push(markerId === undefined ? face : { ...face, markerId })
  }
  return out
}

/**
 * Projects the whole composition.
 *
 * `aspect` is the viewport's width over its height; `yawDegrees` lets the static drawing follow
 * the same limited orbit, so turning the view with a keyboard works before the GPU path starts
 * and still works if it never does.
 */
export function project(view: AssemblageView, aspect: number, yawDegrees: number = VIEW_YAW): Projection {
  const camera = fitCamera(view, aspect, yawDegrees)
  const faces: ProjectedFace[] = []

  for (const piece of view.pieces) {
    faces.push(
      ...facesOf(
        piece,
        camera,
        piece.definition.mesh.positions,
        piece.definition.mesh.normals,
        piece.bodyColour,
        'piece',
        (p) => transformPoint(piece.matrix, p),
        (n) => transformDirection(piece.matrix, n),
      ),
    )
    for (const marker of piece.markers) {
      const inlay = markerInlay(marker.shape as MarkerShape)
      const scale = marker.size / 0.06
      faces.push(
        ...facesOf(
          piece,
          camera,
          inlay.positions,
          inlay.normals,
          marker.shape === 'pair' ? view.inkColour : view.accentColour,
          'marker',
          (p) => [
            (marker.at[0] ?? 0) + (p[0] ?? 0) * scale,
            (marker.at[1] ?? 0) + (p[1] ?? 0) * scale,
            (marker.at[2] ?? 0) + (p[2] ?? 0) * scale,
          ],
          null,
          marker.id,
        ),
      )
    }
  }

  /**
   * Painter's algorithm in two levels: pieces first, then faces within a piece.
   *
   * A single global sort by face depth is wrong here and visibly so — it painted the bridge
   * through the wedge resting on it and the foundation's near rim over the block standing on
   * that rim, because a large face's mean depth says little about which solid is in front. Two
   * levels is correct for this catalogue for a specific reason: placement validation refuses any
   * composition whose pieces share space, so the solids are disjoint and can be ordered as whole
   * objects. Within one convex-ish solid, back faces are already culled and a face sort is
   * enough.
   *
   * It is still not a general depth sort. A concave piece wrapped around another, or two pieces
   * allowed to interlock, would need a depth buffer — which is the honest reason the GPU path
   * exists rather than this being the only renderer.
   */
  const byPiece = new Map<string, ProjectedFace[]>()
  for (const face of faces) {
    const group = byPiece.get(face.instanceId)
    if (group) group.push(face)
    else byPiece.set(face.instanceId, [face])
  }
  const pieceDepth = new Map<string, number>()
  for (const piece of view.pieces) {
    const corners = piece.definition.corners.map((c) => transformPoint(piece.matrix, c))
    const mean = corners.reduce((sum, p) => sum + dot(sub(p, camera.centre), camera.eye), 0) / Math.max(1, corners.length)
    pieceDepth.set(piece.instanceId, mean)
  }
  const sorted: ProjectedFace[] = []
  for (const [instanceId, group] of [...byPiece.entries()].sort(
    (a, b) => (pieceDepth.get(a[0]) ?? 0) - (pieceDepth.get(b[0]) ?? 0),
  )) {
    void instanceId
    // Markers sit on a face of their own piece, so they are always painted after it.
    const own = group.filter((f) => f.kind === 'piece').sort((a, b) => a.depth - b.depth)
    const inlays = group.filter((f) => f.kind === 'marker').sort((a, b) => a.depth - b.depth)
    sorted.push(...own, ...inlays)
  }
  faces.length = 0
  faces.push(...sorted)

  const groundY = view.bounds.min[1] ?? 0
  const footprint = view.pieces.filter((p) => (p.bounds.min[1] ?? 0) < groundY + 0.05)
  const fx = footprint.flatMap((p) => [p.bounds.min[0] ?? 0, p.bounds.max[0] ?? 0])
  const fz = footprint.flatMap((p) => [p.bounds.min[2] ?? 0, p.bounds.max[2] ?? 0])
  const shadowCentre: Vec3 =
    fx.length > 0
      ? [(Math.min(...fx) + Math.max(...fx)) / 2, groundY, (Math.min(...fz) + Math.max(...fz)) / 2]
      : [camera.centre[0] ?? 0, groundY, camera.centre[2] ?? 0]
  const shadowScreen = toScreen(camera, shadowCentre)
  const radius = fx.length > 0 ? Math.max(Math.max(...fx) - Math.min(...fx), Math.max(...fz) - Math.min(...fz)) / 2 : 1

  return {
    faces,
    viewBox: {
      x: -camera.halfWidth,
      y: -camera.halfHeight,
      width: camera.halfWidth * 2,
      height: camera.halfHeight * 2,
    },
    groundShadow: {
      cx: shadowScreen[0],
      cy: shadowScreen[1],
      rx: radius * 1.12,
      ry: radius * 1.12 * Math.sin((VIEW_PITCH * Math.PI) / 180),
    },
  }
}

/** An SVG path for one face. Rounded so the markup does not carry meaningless precision. */
export function facePath(face: ProjectedFace): string {
  return (
    face.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(4)} ${p[1].toFixed(4)}`).join('') + 'Z'
  )
}
