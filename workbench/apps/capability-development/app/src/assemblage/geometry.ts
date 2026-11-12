/**
 * Deterministic authored geometry for the assemblage pieces.
 *
 * Every solid is built from hand-written outlines in this file. There is no randomness, no
 * external model file, no imported texture and no generator seeded from the clock: the same
 * catalogue version always produces byte-identical vertex data, which is what lets a saved
 * composition still mean the same shape on a later visit. See ../../ASSET-RIGHTS.md.
 *
 * Shading is flat on purpose. Each triangle carries its own vertices and its own face normal, so
 * facets read as facets — the painted-timber look the visual direction asks for — rather than as
 * a smoothed blob. It costs vertices (a few thousand per piece at most) and buys the silhouette.
 *
 * No Three.js import: a builder returns plain arrays, so these shapes can be measured and tested
 * in Node, and the renderer is the only thing that needs a GPU.
 */
import { aabbOf, cross, normalise, sub, type Aabb, type Vec3 } from './math'

/** A point on an outline, in the piece's local XZ plane. */
export type Vec2 = readonly [number, number]

export interface MeshData {
  /** Flat xyz triples, three vertices per triangle. */
  positions: Float32Array
  /** Flat xyz triples, one face normal repeated per vertex of the triangle. */
  normals: Float32Array
  /** Triangle count, for reporting. */
  triangles: number
}

class MeshBuilder {
  private readonly pos: number[] = []
  private readonly nrm: number[] = []

  triangle(a: Vec3, b: Vec3, c: Vec3): void {
    const n = normalise(cross(sub(b, a), sub(c, a)))
    for (const p of [a, b, c]) {
      this.pos.push(p[0], p[1], p[2])
      this.nrm.push(n[0], n[1], n[2])
    }
  }

  /** Two triangles, wound so the quad's outward face follows a-b-c-d. */
  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3): void {
    this.triangle(a, b, c)
    this.triangle(a, c, d)
  }

  /** Fan triangulation from a centroid. Correct for the convex outlines authored here. */
  cap(ring: readonly Vec3[], up: boolean): void {
    if (ring.length < 3) return
    let cx = 0
    let cy = 0
    let cz = 0
    for (const p of ring) {
      cx += p[0]
      cy += p[1]
      cz += p[2]
    }
    const centre: Vec3 = [cx / ring.length, cy / ring.length, cz / ring.length]
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i] as Vec3
      const b = ring[(i + 1) % ring.length] as Vec3
      if (up) this.triangle(centre, a, b)
      else this.triangle(centre, b, a)
    }
  }

  build(): MeshData {
    return {
      positions: new Float32Array(this.pos),
      normals: new Float32Array(this.nrm),
      triangles: this.pos.length / 9,
    }
  }
}

function ringAt(outline: readonly Vec2[], y: number, scaleXz: number, offset: Vec2): Vec3[] {
  return outline.map(([x, z]) => [x * scaleXz + offset[0], y, z * scaleXz + offset[1]] as Vec3)
}

export interface SolidSpec {
  /** Outline in the local XZ plane, counter-clockwise seen from above. */
  outline: readonly Vec2[]
  height: number
  /** Scale applied to the outline at the top face. Below 1 tapers the solid inwards. */
  topScale: number
  /**
   * An explicitly authored top face, with the same point count as `outline`.
   *
   * `topScale` can only shrink a shape towards its own centre, which turns a triangle into a
   * point rather than into a ridge. A wedge needs its top to collapse along one axis and not the
   * other, so it gets a top outline of its own.
   */
  topOutline?: readonly Vec2[] | undefined
  /** Lateral shift of the top face, which is what makes a solid lean rather than stand square. */
  topOffset: Vec2
  /**
   * Chamfer height, as a fraction of `height`, for the top and bottom rims. Zero gives a sharp
   * arris; a small value gives the restrained bevel the visual direction asks to be compared.
   */
  bevel: number
  /** How far the chamfer pulls the rim in, as a fraction of the outline. */
  bevelInset: number
}

/**
 * A closed irregular prism: a bottom face, a top face, and a wall of quads between them.
 *
 * With `bevel` above zero the wall becomes three bands — a chamfer off the bottom rim, the main
 * wall, and a chamfer into the top rim. That is the cheapest edge treatment that still catches
 * light along a silhouette, and unlike a smoothing pass it keeps every face flat.
 */
export function buildSolid(spec: SolidSpec): MeshData {
  const mesh = new MeshBuilder()
  const { outline, height, topScale, topOffset, bevel, bevelInset } = spec
  const bevelHeight = Math.min(Math.max(bevel, 0), 0.4) * height
  const hasBevel = bevelHeight > 1e-6 && bevelInset > 1e-6

  const top = spec.topOutline && spec.topOutline.length === outline.length ? spec.topOutline : null
  /** The outline at height fraction t: interpolated towards the authored top face if there is one. */
  const ringFor = (t: number): Vec3[] => {
    const y = t * height
    const ox = topOffset[0] * t
    const oz = topOffset[1] * t
    if (top) {
      return outline.map(([x, z], i) => {
        const target = top[i] ?? [x, z]
        return [x + ((target[0] ?? x) - x) * t + ox, y, z + ((target[1] ?? z) - z) * t + oz] as Vec3
      })
    }
    const s = 1 + (topScale - 1) * t
    return outline.map(([x, z]) => [x * s + ox, y, z * s + oz] as Vec3)
  }
  /** Same, but pulled towards the shape's own centre by `inset` — used for the chamfer rims. */
  const insetRing = (t: number, inset: number): Vec3[] => {
    const ring = ringFor(t)
    if (inset <= 0) return ring
    let cx = 0
    let cz = 0
    for (const p of ring) {
      cx += p[0]
      cz += p[2]
    }
    cx /= ring.length
    cz /= ring.length
    return ring.map((p) => [cx + (p[0] - cx) * (1 - inset), p[1], cz + (p[2] - cz) * (1 - inset)] as Vec3)
  }

  if (!hasBevel) {
    const bottom = ringFor(0)
    const topRing = ringFor(1)
    mesh.cap(bottom, false)
    mesh.cap(topRing, true)
    for (let i = 0; i < outline.length; i += 1) {
      const j = (i + 1) % outline.length
      mesh.quad(bottom[i] as Vec3, bottom[j] as Vec3, topRing[j] as Vec3, topRing[i] as Vec3)
    }
    return mesh.build()
  }

  const t0 = bevelHeight / height
  const t1 = 1 - t0

  // The two rims sit inside the wall; the wall itself keeps the authored outline.
  const bottomRim = insetRing(0, bevelInset)
  const wallLow = ringFor(t0)
  const wallHigh = ringFor(t1)
  const topRim = insetRing(1, bevelInset)

  mesh.cap(bottomRim, false)
  mesh.cap(topRim, true)
  for (let i = 0; i < outline.length; i += 1) {
    const j = (i + 1) % outline.length
    mesh.quad(bottomRim[i] as Vec3, bottomRim[j] as Vec3, wallLow[j] as Vec3, wallLow[i] as Vec3)
    mesh.quad(wallLow[i] as Vec3, wallLow[j] as Vec3, wallHigh[j] as Vec3, wallHigh[i] as Vec3)
    mesh.quad(wallHigh[i] as Vec3, wallHigh[j] as Vec3, topRim[j] as Vec3, topRim[i] as Vec3)
  }
  return mesh.build()
}

export interface PiercedSpec {
  outer: readonly Vec2[]
  /** Must have the same number of points as `outer`: point i pairs with point i. */
  inner: readonly Vec2[]
  height: number
  topScale: number
}

/**
 * A solid with an opening through it: the signature form.
 *
 * The hole is not cut by a boolean operation. Outer and inner rings are authored with the same
 * point count, so the top and bottom faces are a ring of quads between matched points and the
 * inner wall is another ring — deterministic, flat-faced, and free of the degenerate triangles a
 * general-purpose polygon-with-hole triangulator produces on a hand-authored outline.
 */
export function buildPierced(spec: PiercedSpec): MeshData {
  const mesh = new MeshBuilder()
  const { outer, inner, height, topScale } = spec
  const n = Math.min(outer.length, inner.length)
  const outerBottom = ringAt(outer, 0, 1, [0, 0])
  const outerTop = ringAt(outer, height, topScale, [0, 0])
  const innerBottom = ringAt(inner, 0, 1, [0, 0])
  const innerTop = ringAt(inner, height, topScale, [0, 0])

  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n
    // Top face: outward-facing ring of quads between the two rings.
    mesh.quad(innerTop[i] as Vec3, outerTop[i] as Vec3, outerTop[j] as Vec3, innerTop[j] as Vec3)
    // Bottom face, wound the other way.
    mesh.quad(innerBottom[j] as Vec3, outerBottom[j] as Vec3, outerBottom[i] as Vec3, innerBottom[i] as Vec3)
    // Outer wall.
    mesh.quad(outerBottom[i] as Vec3, outerBottom[j] as Vec3, outerTop[j] as Vec3, outerTop[i] as Vec3)
    // Inner wall, facing into the opening.
    mesh.quad(innerBottom[j] as Vec3, innerBottom[i] as Vec3, innerTop[i] as Vec3, innerTop[j] as Vec3)
  }
  return mesh.build()
}

/** The solid's extent, used by placement validation and by the static drawing. */
export function meshBounds(mesh: MeshData): Aabb {
  const points: Vec3[] = []
  for (let i = 0; i < mesh.positions.length; i += 3) {
    points.push([mesh.positions[i] ?? 0, mesh.positions[i + 1] ?? 0, mesh.positions[i + 2] ?? 0])
  }
  return aabbOf(points)
}

/** Every distinct corner of the solid, for an overlap test that does not need the triangles. */
export function meshCorners(mesh: MeshData): Vec3[] {
  const seen = new Set<string>()
  const out: Vec3[] = []
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const p: Vec3 = [mesh.positions[i] ?? 0, mesh.positions[i + 1] ?? 0, mesh.positions[i + 2] ?? 0]
    const key = `${p[0].toFixed(4)},${p[1].toFixed(4)},${p[2].toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}
