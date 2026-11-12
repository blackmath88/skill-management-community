/**
 * The small amount of linear algebra the assemblage needs.
 *
 * This file deliberately has no dependency on Three.js. Placement, validation and the saved
 * composition are computed here, in plain numbers, so that:
 *   - they can be unit-tested in Node without a GPU, a canvas or a renderer,
 *   - the renderer stays a presentation detail that can fail or be swapped without taking the
 *     meaning of a composition with it.
 *
 * Column-major 4x4 matrices, matching the convention Three.js uses, so a matrix computed here can
 * be handed to `Matrix4.fromArray` unchanged.
 */

export type Vec3 = readonly [number, number, number]
/** Column-major 4x4. m[col * 4 + row]. */
export type Mat4 = readonly number[]

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k]
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

export function length(a: Vec3): number {
  return Math.sqrt(dot(a, a))
}

/** Returns [0,1,0] for a zero-length input rather than NaNs: a degenerate frame must not poison a transform. */
export function normalise(a: Vec3): Vec3 {
  const l = length(a)
  if (l < 1e-9) return [0, 1, 0]
  return [a[0] / l, a[1] / l, a[2] / l]
}

export const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** Builds a transform from three basis columns and a translation. */
export function basisMatrix(x: Vec3, y: Vec3, z: Vec3, origin: Vec3): Mat4 {
  return [x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, origin[0], origin[1], origin[2], 1]
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0)
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0
      for (let k = 0; k < 4; k += 1) {
        sum += (a[k * 4 + row] ?? 0) * (b[col * 4 + k] ?? 0)
      }
      out[col * 4 + row] = sum
    }
  }
  return out
}

export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  return [
    (m[0] ?? 0) * p[0] + (m[4] ?? 0) * p[1] + (m[8] ?? 0) * p[2] + (m[12] ?? 0),
    (m[1] ?? 0) * p[0] + (m[5] ?? 0) * p[1] + (m[9] ?? 0) * p[2] + (m[13] ?? 0),
    (m[2] ?? 0) * p[0] + (m[6] ?? 0) * p[1] + (m[10] ?? 0) * p[2] + (m[14] ?? 0),
  ]
}

/** Rotates a direction: translation is ignored. */
export function transformDirection(m: Mat4, v: Vec3): Vec3 {
  return [
    (m[0] ?? 0) * v[0] + (m[4] ?? 0) * v[1] + (m[8] ?? 0) * v[2],
    (m[1] ?? 0) * v[0] + (m[5] ?? 0) * v[1] + (m[9] ?? 0) * v[2],
    (m[2] ?? 0) * v[0] + (m[6] ?? 0) * v[1] + (m[10] ?? 0) * v[2],
  ]
}

export function rotationY(radians: number): Mat4 {
  const c = Math.cos(radians)
  const s = Math.sin(radians)
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]
}

export function translation(t: Vec3): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, t[0], t[1], t[2], 1]
}

/**
 * An orthonormal frame from an origin, a normal and a reference tangent.
 *
 * The tangent is re-orthogonalised against the normal rather than trusted, so a hand-authored
 * contact frame with a slightly-off tangent still produces a rigid transform instead of a
 * sheared one. A tangent parallel to the normal falls back to a stable arbitrary perpendicular.
 */
export function frameBasis(normal: Vec3, tangent: Vec3): { x: Vec3; y: Vec3; z: Vec3 } {
  const y = normalise(normal)
  let x = sub(tangent, scale(y, dot(tangent, y)))
  if (length(x) < 1e-6) {
    const fallback: Vec3 = Math.abs(y[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]
    x = sub(fallback, scale(y, dot(fallback, y)))
  }
  x = normalise(x)
  const z = normalise(cross(x, y))
  return { x, y, z }
}

export interface Aabb {
  min: Vec3
  max: Vec3
}

export function aabbOf(points: readonly Vec3[]): Aabb {
  if (points.length === 0) return { min: [0, 0, 0], max: [0, 0, 0] }
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const p of points) {
    for (let i = 0; i < 3; i += 1) {
      const v = p[i] ?? 0
      if (v < (min[i] ?? Infinity)) min[i] = v
      if (v > (max[i] ?? -Infinity)) max[i] = v
    }
  }
  return { min, max }
}

/**
 * Overlap of two boxes, shrunk by `tolerance` on every side before comparing.
 *
 * This is a deliberately conservative *rejection* test, not a proof of contact or stability:
 * two blocks that touch along a face have boxes that meet exactly, and shrinking both is what
 * stops a legitimate resting contact from being reported as interpenetration. It also means a
 * concave piece's box claims space the piece does not fill, so a placement nestled inside an
 * arch can be refused even though the solids would not actually meet. See `OVERLAP_TOLERANCE`.
 */
export function boxesOverlap(a: Aabb, b: Aabb, tolerance: number): boolean {
  for (let i = 0; i < 3; i += 1) {
    const aMin = (a.min[i] ?? 0) + tolerance
    const aMax = (a.max[i] ?? 0) - tolerance
    const bMin = (b.min[i] ?? 0) + tolerance
    const bMax = (b.max[i] ?? 0) - tolerance
    if (aMax <= bMin || bMax <= aMin) return false
  }
  return true
}

/** Rounds to 6 decimals so a saved composition is stable across builds and platforms. */
export function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6
}
