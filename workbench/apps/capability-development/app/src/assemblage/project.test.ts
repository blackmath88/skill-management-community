/**
 * The static drawing.
 *
 * It is a second renderer, not a placeholder, so it gets tested like one: that it draws the same
 * composition, that it culls what faces away, and that the outline it marks a selection with is an
 * outline rather than a wireframe.
 */
import { describe, expect, it } from 'vitest'
import { defaultComposition, removePiece } from './compose'
import { buildView } from './view'
import { convexHull, facePath, project, VIEW_PITCH, VIEW_YAW } from './project'

describe('projection', () => {
  const view = buildView(defaultComposition())

  it('projects every piece and nothing else', () => {
    const projection = project(view, 16 / 10, VIEW_YAW)
    expect(projection.faces.length).toBeGreaterThan(60)
    expect(new Set(projection.faces.map((f) => f.instanceId)).size).toBe(6)
  })

  it('culls back faces, so roughly half the triangles survive', () => {
    const total = view.pieces.reduce((sum, p) => sum + p.definition.mesh.triangles, 0)
    const drawn = project(view, 16 / 10, VIEW_YAW).faces.length
    expect(drawn).toBeLessThan(total)
    expect(drawn).toBeGreaterThan(total * 0.25)
  })

  it('fills the frame at any aspect ratio without cropping', () => {
    for (const aspect of [0.6, 1, 16 / 10, 2.4]) {
      const projection = project(view, aspect, VIEW_YAW)
      expect(projection.viewBox.width / projection.viewBox.height).toBeCloseTo(aspect, 5)
      for (const face of projection.faces) {
        for (const [x, y] of face.points) {
          expect(x).toBeGreaterThanOrEqual(projection.viewBox.x - 1e-6)
          expect(x).toBeLessThanOrEqual(projection.viewBox.x + projection.viewBox.width + 1e-6)
          expect(y).toBeGreaterThanOrEqual(projection.viewBox.y - 1e-6)
          expect(y).toBeLessThanOrEqual(projection.viewBox.y + projection.viewBox.height + 1e-6)
        }
      }
    }
  })

  it('paints pieces back to front, so nothing shows through what is in front of it', () => {
    const projection = project(view, 16 / 10, VIEW_YAW)
    // Faces of one piece are contiguous: the sort is per piece, then within it.
    const order = projection.faces.map((f) => f.instanceId)
    const seen = new Set<string>()
    let previous = ''
    for (const id of order) {
      if (id === previous) continue
      expect(seen.has(id), `${id} appears in two separate runs`).toBe(false)
      seen.add(id)
      previous = id
    }
    expect(seen.size).toBe(6)
  })

  it('follows the orbit, and changes the picture when it does', () => {
    const straight = project(view, 16 / 10, VIEW_YAW)
    const turned = project(view, 16 / 10, VIEW_YAW + 30)
    expect(facePath(turned.faces[0] as never)).not.toBe(facePath(straight.faces[0] as never))
    expect(VIEW_PITCH).toBeGreaterThan(0)
  })

  it('still draws a five-piece composition', () => {
    const smaller = removePiece(defaultComposition(), 'perch')
    expect(smaller.ok).toBe(true)
    if (!smaller.ok) return
    const projection = project(buildView(smaller.composition), 16 / 10, VIEW_YAW)
    expect(new Set(projection.faces.map((f) => f.instanceId)).size).toBe(5)
  })

  it('writes a closed path for a face', () => {
    const face = project(view, 1, VIEW_YAW).faces[0]
    expect(face).toBeTruthy()
    if (!face) return
    const path = facePath(face)
    expect(path.startsWith('M')).toBe(true)
    expect(path.endsWith('Z')).toBe(true)
    expect(path.split('L')).toHaveLength(3)
  })
})

describe('the selection outline', () => {
  it('is a hull, not every edge of every triangle', () => {
    const square: (readonly [number, number])[] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      // Interior points, which is what a triangulated face set is full of.
      [0.5, 0.5],
      [0.3, 0.7],
    ]
    const hull = convexHull(square)
    expect(hull).toHaveLength(4)
    for (const point of hull) expect(point[0] === 0 || point[0] === 1 || point[1] === 0 || point[1] === 1).toBe(true)
  })

  it('copes with degenerate input instead of throwing', () => {
    expect(convexHull([])).toEqual([])
    expect(convexHull([[0, 0]])).toHaveLength(1)
    expect(convexHull([[0, 0], [1, 1]])).toHaveLength(2)
    // Collinear points have no area; the result must still be something a path can be made from.
    expect(convexHull([[0, 0], [1, 0], [2, 0]]).length).toBeLessThanOrEqual(3)
  })

  it('wraps the selected piece and nothing else', () => {
    const view = buildView(defaultComposition())
    const projection = project(view, 16 / 10, VIEW_YAW)
    const ringPoints = projection.faces.filter((f) => f.instanceId === 'ring').flatMap((f) => f.points)
    const hull = convexHull(ringPoints)
    expect(hull.length).toBeGreaterThan(2)
    const xs = ringPoints.map((p) => p[0])
    const hullXs = hull.map((p) => p[0])
    expect(Math.min(...hullXs)).toBeCloseTo(Math.min(...xs), 6)
    expect(Math.max(...hullXs)).toBeCloseTo(Math.max(...xs), 6)
  })
})
