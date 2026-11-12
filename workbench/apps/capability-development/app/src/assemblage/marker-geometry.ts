/**
 * The three marker inlays, built the same deterministic way as the pieces.
 *
 * Each is a shallow solid that sits on a face, read as inlaid rather than stuck on. They are
 * distinguishable by outline alone — a ring, an angle, two discs — because a marker that can only
 * be told apart by colour is not distinguishable at all for a good number of people. The
 * interface names each one in text next to it as well.
 *
 * Nominal radius is 0.06 catalogue units; the renderer scales from that.
 */
import { buildPierced, buildSolid, type MeshData, type Vec2 } from './geometry'

export type MarkerShape = 'loop' | 'turn' | 'pair'

const NOMINAL = 0.06
const THICKNESS = 0.022

function disc(radius: number, sides: number, centre: Vec2 = [0, 0]): Vec2[] {
  return Array.from({ length: sides }, (_, i) => {
    const theta = (i / sides) * Math.PI * 2
    return [centre[0] + radius * Math.cos(theta), centre[1] - radius * Math.sin(theta)] as Vec2
  })
}

function merge(parts: readonly MeshData[]): MeshData {
  const positions: number[] = []
  const normals: number[] = []
  for (const part of parts) {
    positions.push(...part.positions)
    normals.push(...part.normals)
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    triangles: positions.length / 9,
  }
}

function shifted(mesh: MeshData, dx: number, dz: number): MeshData {
  const positions = Float32Array.from(mesh.positions)
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] ?? 0) + dx
    positions[i + 2] = (positions[i + 2] ?? 0) + dz
  }
  return { positions, normals: Float32Array.from(mesh.normals), triangles: mesh.triangles }
}

/** 'Linked loop': a ring, for something done with another person's help. */
function loop(): MeshData {
  return buildPierced({
    outer: disc(NOMINAL, 12),
    inner: disc(NOMINAL * 0.52, 12),
    height: THICKNESS,
    topScale: 0.96,
  })
}

/** 'Turned route': one chevron plate, for an attempt that changed direction. */
function turn(): MeshData {
  const w = NOMINAL * 0.3
  // An L drawn as a single six-point outline, so it is one flat plate rather than two bars with
  // a seam down the join.
  return buildSolid({
    outline: [
      [NOMINAL, -w],
      [NOMINAL, w],
      [-w, w],
      [-w, NOMINAL],
      [-NOMINAL - w * 0.2, NOMINAL],
      [-NOMINAL - w * 0.2, -w],
    ],
    height: THICKNESS,
    topScale: 1,
    topOffset: [0, 0],
    bevel: 0,
    bevelInset: 0,
  })
}

/** 'Paired inlay': two discs that do not touch, for two accounts that do not agree. */
function pair(): MeshData {
  const one = buildSolid({
    outline: disc(NOMINAL * 0.5, 10),
    height: THICKNESS,
    topScale: 0.9,
    topOffset: [0, 0],
    bevel: 0,
    bevelInset: 0,
  })
  return merge([shifted(one, -NOMINAL * 0.52, 0), shifted(one, NOMINAL * 0.52, 0)])
}

const CACHE = new Map<MarkerShape, MeshData>()

export function markerInlay(shape: MarkerShape): MeshData {
  const existing = CACHE.get(shape)
  if (existing) return existing
  const made = shape === 'loop' ? loop() : shape === 'turn' ? turn() : pair()
  CACHE.set(shape, made)
  return made
}
