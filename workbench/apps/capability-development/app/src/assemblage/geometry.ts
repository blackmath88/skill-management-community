import { part, type PartId, type Vec } from './model'
export interface Polyhedron {
  vertices: Vec[]
  faces: number[][]
}
/** Original authored rings, flat resting faces, asymmetric shoulders. No external assets. */
export function geometry(id: PartId): Polyhedron {
  const [w, h, d] = part(id).size
  if (id === 'wedge') {
    const outline = [
      [-0.5, 0],
      [0.5, 0],
      [0.48, 0.12],
      [-0.12, 1],
      [-0.35, 0.95],
      [-0.5, 0.65],
    ]
    const vertices: Vec[] = [-d / 2, d / 2].flatMap((z) => outline.map(([x, y]): Vec => [x! * w, y! * h, z]))
    const n = outline.length
    const faces: number[][] = [
      Array.from({ length: n }, (_, i) => n - 1 - i),
      Array.from({ length: n }, (_, i) => n + i),
    ]
    for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, ((i + 1) % n) + n, i + n])
    return { vertices, faces }
  }
  if (id === 'bridge' || id === 'portal') {
    const outer: [number, number][] =
      id === 'bridge'
        ? [
            [-0.5, 0],
            [0.5, 0],
            [0.5, 0.7],
            [0.34, 1],
            [-0.34, 1],
            [-0.5, 0.7],
          ]
        : [
            [-0.25, 0],
            [0.25, 0],
            [0.5, 0.24],
            [0.5, 0.75],
            [0.25, 1],
            [-0.25, 1],
            [-0.5, 0.75],
            [-0.5, 0.24],
          ]
    const inner: [number, number][] =
      id === 'bridge'
        ? [
            [-0.23, 0],
            [0.23, 0],
            [0.23, 0.55],
            [0.16, 0.65],
            [-0.16, 0.65],
            [-0.23, 0.55],
          ]
        : [
            [-0.13, 0.25],
            [0.13, 0.25],
            [0.27, 0.36],
            [0.27, 0.65],
            [0.13, 0.78],
            [-0.13, 0.78],
            [-0.27, 0.65],
            [-0.27, 0.36],
          ]
    const n = outer.length
    const vertices: Vec[] = []
    for (const z of [-d / 2, d / 2])
      for (const ring of [outer, inner]) for (const [x, y] of ring) vertices.push([x * w, y * h, z])
    const faces: number[][] = []
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      if (!(id === 'bridge' && i === 0)) {
        faces.push([i, i + n, j + n, j], [i + 2 * n, j + 2 * n, j + 3 * n, i + 3 * n])
        faces.push([i, j, j + 2 * n, i + 2 * n], [i + n, i + 3 * n, j + 3 * n, j + n])
      }
    }
    return { vertices, faces }
  }
  const ring: [number, number][] = [
    [-0.32, -0.5],
    [0.28, -0.5],
    [0.5, -0.28],
    [0.5, 0.26],
    [0.27, 0.5],
    [-0.3, 0.5],
    [-0.5, 0.23],
    [-0.5, -0.29],
  ]
  const layers =
    id === 'foundation'
      ? [
          [0, 0.87, 0],
          [0.22, 1, 0],
          [0.78, 0.98, 0],
          [1, 0.94, 0],
        ]
      : [
          [0, 0.74, 0],
          [0.23, 1, -0.035],
          [0.71, 0.94, 0.035],
          [1, 0.63, -0.02],
        ]
  const vertices: Vec[] = layers.flatMap(([y, s, shift]) =>
    ring.map(([x, z]): Vec => [(x * s! + shift!) * w, y! * h, z * s! * d]),
  )
  const faces: number[][] = [[7, 6, 5, 4, 3, 2, 1, 0]]
  for (let l = 0; l < layers.length - 1; l++)
    for (let i = 0; i < 8; i++)
      faces.push([l * 8 + i, l * 8 + ((i + 1) % 8), (l + 1) * 8 + ((i + 1) % 8), (l + 1) * 8 + i])
  faces.push(Array.from({ length: 8 }, (_, i) => (layers.length - 1) * 8 + i))
  return { vertices, faces: faces.map((f) => f.reverse()) }
}
