/**
 * Placement, validation and composition round trips.
 *
 * These run in Node with no canvas and no GPU, which is the point of keeping the geometry and the
 * placement rules free of Three.js.
 */
import { describe, expect, it } from 'vitest'
import { CATALOGUE, CATALOGUE_VERSION, PALETTE_IDS, PIECE_IDS, isPermitted, piece } from './catalogue'
import { buildPierced, buildSolid, meshBounds } from './geometry'
import {
  OVERLAP_TOLERANCE,
  alignedTransform,
  candidatesFor,
  canTurn,
  descendantIds,
  groundCandidatesFor,
  resolveComposition,
  validateComposition,
  yawOf,
} from './placement'
import {
  addMarker,
  defaultComposition,
  emptyComposition,
  MAX_MARKERS_PER_PIECE,
  placeOnContact,
  placeOnGround,
  removeMarker,
  removePiece,
  setMarkerHidden,
  setPalette,
  trayFor,
  unlinkMissingEvidence,
} from './compose'
import { ASSEMBLAGE_SCHEMA_VERSION, type AssemblageComposition } from './types'
import { boxesOverlap, frameBasis, length, sub, transformDirection, transformPoint, type Vec3 } from './math'

describe('authored geometry', () => {
  it('builds a closed solid for every catalogue piece', () => {
    for (const id of PIECE_IDS) {
      const definition = CATALOGUE[id]
      expect(definition.mesh.triangles, `${id} has triangles`).toBeGreaterThan(8)
      // Every triangle must have three vertices and a matching normal per vertex.
      expect(definition.mesh.positions.length).toBe(definition.mesh.triangles * 9)
      expect(definition.mesh.normals.length).toBe(definition.mesh.positions.length)
      for (let i = 0; i < definition.mesh.normals.length; i += 3) {
        const n: Vec3 = [
          definition.mesh.normals[i] ?? 0,
          definition.mesh.normals[i + 1] ?? 0,
          definition.mesh.normals[i + 2] ?? 0,
        ]
        expect(length(n)).toBeCloseTo(1, 5)
      }
    }
  })

  it('is deterministic: the same spec builds byte-identical vertex data', () => {
    const spec = {
      outline: [[1, 0] as const, [0, -1] as const, [-1, 0] as const, [0, 1] as const],
      height: 0.5,
      topScale: 0.8,
      topOffset: [0.1, 0] as const,
      bevel: 0.07,
      bevelInset: 0.05,
    }
    const a = buildSolid(spec)
    const b = buildSolid(spec)
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions))
    expect(Array.from(a.normals)).toEqual(Array.from(b.normals))
  })

  it('bevelling keeps every face flat and does not change the footprint', () => {
    const base = {
      outline: [[1, 0] as const, [0, -1] as const, [-1, 0] as const, [0, 1] as const],
      height: 0.5,
      topScale: 1,
      topOffset: [0, 0] as const,
      bevelInset: 0.05,
    }
    const sharp = buildSolid({ ...base, bevel: 0 })
    const bevelled = buildSolid({ ...base, bevel: 0.08 })
    expect(bevelled.triangles).toBeGreaterThan(sharp.triangles)
    const a = meshBounds(sharp)
    const b = meshBounds(bevelled)
    expect(b.max[0]).toBeCloseTo(a.max[0], 6)
    expect(b.max[1]).toBeCloseTo(a.max[1], 6)
  })

  it('gives the signature form a genuine opening', () => {
    const mesh = buildPierced({
      outer: [[1, 0], [0, -1], [-1, 0], [0, 1]],
      inner: [[0.4, 0], [0, -0.4], [-0.4, 0], [0, 0.4]],
      height: 0.3,
      topScale: 1,
    })
    const bounds = meshBounds(mesh)
    expect(bounds.max[0]).toBeCloseTo(1, 6)
    // No vertex sits in the middle of the hole.
    let insideHole = 0
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i] ?? 0
      const z = mesh.positions[i + 2] ?? 0
      if (Math.abs(x) + Math.abs(z) < 0.3) insideHole += 1
    }
    expect(insideHole).toBe(0)
  })
})

describe('contact-frame alignment', () => {
  it('puts the resting frame exactly on the receiving frame, facing into it', () => {
    const parent = CATALOGUE.foundation
    const child = CATALOGUE['squat-solid']
    const receiving = parent.frames.find((f) => f.id === 'crown')
    const resting = child.frames.find((f) => f.id === 'base')
    expect(receiving && resting).toBeTruthy()
    if (!receiving || !resting) return

    for (const yaw of [0, 45, 137.5, 270]) {
      const world = alignedTransform(
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        receiving,
        resting,
        yaw,
      )
      const landed = transformPoint(world, resting.origin)
      expect(length(sub(landed, receiving.origin))).toBeLessThan(1e-6)
      const normal = transformDirection(world, resting.normal)
      // The underside points the opposite way to the surface it rests on.
      expect(normal[0]).toBeCloseTo(-receiving.normal[0], 6)
      expect(normal[1]).toBeCloseTo(-receiving.normal[1], 6)
      expect(normal[2]).toBeCloseTo(-receiving.normal[2], 6)
    }
  })

  it('keeps the transform rigid: no scale and no shear', () => {
    const parent = CATALOGUE['tall-solid']
    const receiving = parent.frames.find((f) => f.id === 'cap')
    const resting = CATALOGUE.bridge.frames.find((f) => f.id === 'base')
    if (!receiving || !resting) throw new Error('fixture frames missing')
    const world = alignedTransform([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], receiving, resting, 30)
    const columns: Vec3[] = [
      [world[0] ?? 0, world[1] ?? 0, world[2] ?? 0],
      [world[4] ?? 0, world[5] ?? 0, world[6] ?? 0],
      [world[8] ?? 0, world[9] ?? 0, world[10] ?? 0],
    ]
    for (const c of columns) expect(length(c)).toBeCloseTo(1, 6)
  })

  it('re-orthogonalises a sloppily authored tangent instead of shearing', () => {
    const basis = frameBasis([0, 1, 0], [0.3, 0.9, 0])
    expect(basis.x[1]).toBeCloseTo(0, 6)
    expect(length(basis.x)).toBeCloseTo(1, 6)
    expect(length(basis.z)).toBeCloseTo(1, 6)
  })
})

describe('the day-one composition', () => {
  const composition = defaultComposition()

  it('has six pieces, one of each form', () => {
    expect(composition.pieces).toHaveLength(6)
    expect(new Set(composition.pieces.map((p) => p.pieceId)).size).toBe(6)
  })

  it('validates with no problems at all', () => {
    expect(validateComposition(composition)).toEqual([])
  })

  it('resolves every piece and leaves nothing unresolved', () => {
    const { resolved, unresolved } = resolveComposition(composition)
    expect(unresolved).toEqual([])
    expect(resolved).toHaveLength(6)
  })

  it('stands on the ground and does not sink through it', () => {
    const { resolved } = resolveComposition(composition)
    for (const entry of resolved) {
      expect(entry.bounds.min[1], entry.placed.instanceId).toBeGreaterThan(-OVERLAP_TOLERANCE)
    }
    const lowest = Math.min(...resolved.map((e) => e.bounds.min[1] ?? 0))
    expect(lowest).toBeCloseTo(0, 5)
  })

  it('is asymmetric and has real height, so the silhouette is not a pyramid', () => {
    const { resolved } = resolveComposition(composition)
    const top = Math.max(...resolved.map((e) => e.bounds.max[1] ?? 0))
    expect(top).toBeGreaterThan(1.6)
    const xs = resolved.flatMap((e) => [e.bounds.min[0] ?? 0, e.bounds.max[0] ?? 0])
    const centre = (Math.min(...xs) + Math.max(...xs)) / 2
    // The tall part is off-centre: a composition centred on its own bounding box reads as a tower.
    const tallest = resolved.reduce((a, b) => ((a.bounds.max[1] ?? 0) > (b.bounds.max[1] ?? 0) ? a : b))
    const tallestCentre = (((tallest.bounds.min[0] ?? 0) + (tallest.bounds.max[0] ?? 0)) / 2)
    expect(Math.abs(tallestCentre - centre)).toBeGreaterThan(0.05)
  })

  it('leaves no piece in the tray', () => {
    expect(trayFor(composition, PIECE_IDS)).toEqual([])
  })
})

describe('validation refuses impossible compositions', () => {
  const base = defaultComposition()

  it('refuses a piece resting on a parent that is not there', () => {
    const broken: AssemblageComposition = {
      ...base,
      pieces: base.pieces.filter((p) => p.instanceId !== 'column'),
    }
    const problems = validateComposition(broken)
    expect(problems.some((p) => p.kind === 'missing-parent')).toBe(true)
  })

  it('refuses a cycle', () => {
    const cyclic: AssemblageComposition = {
      ...base,
      pieces: base.pieces.map((p) =>
        p.instanceId === 'base' ? { ...p, parentInstanceId: 'column', receiverFrameId: 'cap' } : p,
      ),
    }
    const problems = validateComposition(cyclic)
    expect(problems.some((p) => p.kind === 'cycle')).toBe(true)
  })

  it('refuses two pieces on the same contact position', () => {
    const result = placeOnContact(base, {
      instanceId: 'second-column',
      pieceId: 'squat-solid',
      parentInstanceId: 'base',
      receiverFrameId: 'crown',
      restingFrameId: 'base',
      orientationIndex: 0,
    })
    expect(result.ok).toBe(false)
  })

  it('refuses a piece the contact position does not carry', () => {
    // Nothing rests on the wedge's narrow ridge: it is a terminal form.
    expect(isPermitted('wedge', 'ridge', 'squat-solid', 'base')).toBe(false)
    const withWedge = placeOnGround(emptyComposition(), {
      instanceId: 'w',
      pieceId: 'wedge',
      restingFrameId: 'base',
      orientationIndex: 0,
      groundX: 0,
      groundZ: 0,
    })
    expect(withWedge.ok).toBe(true)
    if (!withWedge.ok) return
    const result = placeOnContact(withWedge.composition, {
      instanceId: 's',
      pieceId: 'squat-solid',
      parentInstanceId: 'w',
      receiverFrameId: 'ridge',
      restingFrameId: 'base',
      orientationIndex: 0,
    })
    expect(result.ok).toBe(false)
  })

  it('refuses a root that cannot stand on its own', () => {
    const result = placeOnGround(emptyComposition(), {
      instanceId: 'b',
      pieceId: 'bridge',
      restingFrameId: 'base',
      orientationIndex: 0,
      groundX: 0,
      groundZ: 0,
    })
    expect(result.ok).toBe(false)
  })

  it('refuses an orientation outside the piece\'s bounded set', () => {
    const broken: AssemblageComposition = {
      ...base,
      pieces: base.pieces.map((p) => (p.instanceId === 'column' ? { ...p, orientationIndex: 99 } : p)),
    }
    expect(validateComposition(broken).some((p) => p.kind === 'orientation-out-of-range')).toBe(true)
  })

  it('refuses a composition saved in a format this build cannot read', () => {
    const future = { ...base, schemaVersion: 7 } as unknown as AssemblageComposition
    const problems = validateComposition(future)
    expect(problems).toEqual([{ kind: 'unsupported-schema', version: 7 }])
  })

  it('reports an unknown catalogue version rather than redrawing it as something else', () => {
    const other = { ...base, catalogueVersion: CATALOGUE_VERSION + 1 }
    expect(validateComposition(other).some((p) => p.kind === 'unknown-catalogue')).toBe(true)
  })

  it('detects two pieces sharing space', () => {
    const a = { min: [0, 0, 0] as const, max: [1, 1, 1] as const }
    const b = { min: [0.5, 0.5, 0.5] as const, max: [1.5, 1.5, 1.5] as const }
    expect(boxesOverlap(a, b, OVERLAP_TOLERANCE)) .toBe(true)
    // Stacked exactly: the shared face must not read as interpenetration.
    const c = { min: [0, 1, 0] as const, max: [1, 2, 1] as const }
    expect(boxesOverlap(a, c, OVERLAP_TOLERANCE)).toBe(false)
  })
})

describe('assisted placement', () => {
  it('offers only contacts that are free and permitted', () => {
    const start = placeOnGround(emptyComposition(), {
      instanceId: 'base',
      pieceId: 'foundation',
      restingFrameId: 'base',
      orientationIndex: 0,
      groundX: 0,
      groundZ: 0,
    })
    expect(start.ok).toBe(true)
    if (!start.ok) return
    const candidates = candidatesFor(start.composition, 'tall-solid')
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every((c) => c.parentInstanceId === 'base')).toBe(true)
    expect(candidates.some((c) => c.receiverFrameId === 'crown')).toBe(true)
    // The east shelf does not carry a column.
    expect(candidates.some((c) => c.receiverFrameId === 'east-shelf')).toBe(false)
  })

  it('offers the contact a removed piece came from, so a recomposition is reversible', () => {
    const removed = removePiece(defaultComposition(), 'ring')
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    const candidates = candidatesFor(removed.composition, 'signature-open')
    expect(
      candidates.some((c) => c.parentInstanceId === 'base' && c.receiverFrameId === 'east-shelf'),
    ).toBe(true)
  })

  it('leaves out contacts that are already carrying something', () => {
    // Every contact on the day-one composition that is in use must be absent from the offers for
    // a piece the tray does not hold, which is why the interface asks the tray first.
    const candidates = candidatesFor(defaultComposition(), 'wedge')
    expect(candidates.some((c) => c.parentInstanceId === 'lintel' && c.receiverFrameId === 'deck')).toBe(false)
  })

  it('every offered candidate is actually accepted', () => {
    const start = placeOnGround(emptyComposition(), {
      instanceId: 'base',
      pieceId: 'foundation',
      restingFrameId: 'base',
      orientationIndex: 0,
      groundX: 0,
      groundZ: 0,
    })
    if (!start.ok) throw new Error('fixture failed')
    for (const pieceId of PIECE_IDS) {
      for (const candidate of candidatesFor(start.composition, pieceId)) {
        const result = placeOnContact(start.composition, {
          instanceId: `trial-${pieceId}-${candidate.receiverFrameId}`,
          pieceId,
          parentInstanceId: candidate.parentInstanceId,
          receiverFrameId: candidate.receiverFrameId,
          restingFrameId: candidate.restingFrameId,
          orientationIndex: candidate.orientationIndex,
        })
        expect(result.ok, `${pieceId} on ${candidate.receiverFrameId}: ${result.ok ? '' : result.message}`).toBe(true)
      }
    }
  })

  it('offers free ground spots for pieces that stand on their own', () => {
    const spots = groundCandidatesFor(emptyComposition(), 'foundation')
    expect(spots.length).toBeGreaterThan(0)
    expect(groundCandidatesFor(emptyComposition(), 'bridge')).toEqual([])
  })
})

describe('turning, removing and recomposing', () => {
  it('turns a piece to another bounded orientation', () => {
    const composition = defaultComposition()
    const before = composition.pieces.find((p) => p.instanceId === 'perch')?.orientationIndex
    const turned = turnOnce(composition, 'perch')
    expect(turned.pieces.find((p) => p.instanceId === 'perch')?.orientationIndex).not.toBe(before)
    expect(validateComposition(turned)).toEqual([])
  })

  it('turning stays inside the authored orientation list', () => {
    const composition = defaultComposition()
    const definition = piece('perch') ?? CATALOGUE.wedge
    const index = canTurn(composition, 'perch', 1)
    expect(index).not.toBeNull()
    if (index === null) return
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index).toBeLessThan(CATALOGUE.wedge.orientations.length)
    expect(yawOf(CATALOGUE.wedge, index)).toBe(CATALOGUE.wedge.orientations[index])
    expect(definition).toBeTruthy()
  })

  it('removing a piece takes everything resting on it', () => {
    const composition = defaultComposition()
    expect(descendantIds(composition, 'column')).toEqual(new Set(['lintel', 'perch']))
    const result = removePiece(composition, 'column')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.composition.pieces.map((p) => p.instanceId).sort()).toEqual(
      ['base', 'counterweight', 'ring'].sort(),
    )
    expect(trayFor(result.composition, PIECE_IDS).sort()).toEqual(['bridge', 'tall-solid', 'wedge'].sort())
  })

  it('a five-piece composition is still a valid, complete composition', () => {
    const result = removePiece(defaultComposition(), 'perch')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.composition.pieces).toHaveLength(5)
    expect(validateComposition(result.composition)).toEqual([])
  })

  it('accepts every palette and rejects anything else', () => {
    for (const id of PALETTE_IDS) expect(setPalette(defaultComposition(), id).ok).toBe(true)
    expect(setPalette(defaultComposition(), 'neon').ok).toBe(false)
  })
})

describe('markers', () => {
  it('adds, hides and removes a marker without touching the evidence identifier', () => {
    const added = addMarker(defaultComposition(), {
      instanceId: 'ring',
      markerId: 'm1',
      designId: 'linked-loop',
      evidenceId: 'ev-1',
    })
    expect(added.ok).toBe(true)
    if (!added.ok) return
    const marker = added.composition.pieces.flatMap((p) => p.markers).find((m) => m.id === 'm1')
    expect(marker?.evidenceId).toBe('ev-1')

    const hidden = setMarkerHidden(added.composition, 'm1', true)
    expect(hidden.ok).toBe(true)
    if (!hidden.ok) return
    const stillLinked = hidden.composition.pieces.flatMap((p) => p.markers).find((m) => m.id === 'm1')
    // Hiding is not deleting: the link survives.
    expect(stillLinked?.hidden).toBe(true)
    expect(stillLinked?.evidenceId).toBe('ev-1')

    const removed = removeMarker(hidden.composition, 'm1')
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.composition.pieces.flatMap((p) => p.markers)).toEqual([])
  })

  it('refuses an unknown design and a duplicate identifier', () => {
    const base = defaultComposition()
    expect(addMarker(base, { instanceId: 'ring', markerId: 'm', designId: 'sticker', evidenceId: null }).ok).toBe(false)
    const once = addMarker(base, { instanceId: 'ring', markerId: 'm', designId: 'turned-route', evidenceId: null })
    expect(once.ok).toBe(true)
    if (!once.ok) return
    expect(addMarker(once.composition, { instanceId: 'base', markerId: 'm', designId: 'turned-route', evidenceId: null }).ok).toBe(false)
  })

  it('caps markers per piece, so a composition cannot fill with ornament', () => {
    let composition = defaultComposition()
    for (let i = 0; i < MAX_MARKERS_PER_PIECE; i += 1) {
      const result = addMarker(composition, { instanceId: 'ring', markerId: `m${i}`, designId: 'paired-inlay', evidenceId: null })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      composition = result.composition
    }
    expect(addMarker(composition, { instanceId: 'ring', markerId: 'over', designId: 'paired-inlay', evidenceId: null }).ok).toBe(false)
  })

  it('removing a piece reports the markers that left with it', () => {
    const added = addMarker(defaultComposition(), {
      instanceId: 'perch',
      markerId: 'm1',
      designId: 'linked-loop',
      evidenceId: 'ev-1',
    })
    if (!added.ok) throw new Error('fixture failed')
    const removed = removePiece(added.composition, 'lintel')
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.removedMarkers?.map((m) => m.id)).toEqual(['m1'])
  })

  it('unlinks a marker whose record is gone, and keeps the marker', () => {
    const added = addMarker(defaultComposition(), {
      instanceId: 'ring',
      markerId: 'm1',
      designId: 'paired-inlay',
      evidenceId: 'deleted-record',
    })
    if (!added.ok) throw new Error('fixture failed')
    const { composition, unlinked } = unlinkMissingEvidence(added.composition, () => false)
    expect(unlinked).toBe(1)
    const marker = composition.pieces.flatMap((p) => p.markers).find((m) => m.id === 'm1')
    expect(marker).toBeTruthy()
    expect(marker?.evidenceId).toBeNull()
  })

  it('leaves a marker alone while its record still exists', () => {
    const added = addMarker(defaultComposition(), {
      instanceId: 'ring',
      markerId: 'm1',
      designId: 'paired-inlay',
      evidenceId: 'ev-1',
    })
    if (!added.ok) throw new Error('fixture failed')
    const { unlinked } = unlinkMissingEvidence(added.composition, (id) => id === 'ev-1')
    expect(unlinked).toBe(0)
  })
})

describe('round trips', () => {
  it('survives JSON exactly, with no renderer state to lose', () => {
    const composition = defaultComposition('moss-ink')
    const copy = JSON.parse(JSON.stringify(composition)) as AssemblageComposition
    expect(copy).toEqual(composition)
    expect(validateComposition(copy)).toEqual([])
    // The same input resolves to the same transforms: no clock, no random, no renderer.
    const a = resolveComposition(composition).resolved.map((e) => e.world)
    const b = resolveComposition(copy).resolved.map((e) => e.world)
    expect(b).toEqual(a)
  })

  it('declares its versions', () => {
    const composition = defaultComposition()
    expect(composition.schemaVersion).toBe(ASSEMBLAGE_SCHEMA_VERSION)
    expect(composition.catalogueVersion).toBe(CATALOGUE_VERSION)
  })
})

function turnOnce(composition: AssemblageComposition, instanceId: string): AssemblageComposition {
  const index = canTurn(composition, instanceId, 1)
  if (index === null) throw new Error('nothing to turn to')
  return {
    ...composition,
    pieces: composition.pieces.map((p) => (p.instanceId === instanceId ? { ...p, orientationIndex: index } : p)),
  }
}
