/** Authored, bounded placements. Coordinates are metres in a toy-sized world, not physics. */
export type Vec = [number, number, number]
export type PartId = 'foundation' | 'spire' | 'pebble' | 'wedge' | 'bridge' | 'portal'
export type PaletteId = 'earth' | 'tidal' | 'chalk' | 'orchard'
export interface Contact {
  id: string
  at: Vec
  accepts: PartId[]
}
export interface Part {
  id: PartId
  name: string
  size: Vec
  color: number
  contacts: Contact[]
}
export const CATALOGUE: Part[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    size: [4.6, 0.65, 1.9],
    color: 0,
    contacts: [
      { id: 'left', at: [-1.15, 0.65, 0], accepts: ['spire', 'bridge', 'pebble'] },
      { id: 'right', at: [1.1, 0.65, 0], accepts: ['spire', 'bridge', 'pebble'] },
    ],
  },
  {
    id: 'spire',
    name: 'Standing stone',
    size: [1.25, 1.45, 1.15],
    color: 1,
    contacts: [{ id: 'crown', at: [0, 1.45, 0], accepts: ['pebble', 'portal', 'wedge'] }],
  },
  {
    id: 'pebble',
    name: 'River stone',
    size: [1.55, 0.75, 1.2],
    color: 2,
    contacts: [{ id: 'crown', at: [0, 0.75, 0], accepts: ['wedge', 'portal'] }],
  },
  { id: 'wedge', name: 'Turning wedge', size: [1.1, 0.55, 0.95], color: 3, contacts: [] },
  {
    id: 'bridge',
    name: 'Little bridge',
    size: [1.8, 1.05, 1.1],
    color: 3,
    contacts: [{ id: 'crown', at: [0, 1.05, 0], accepts: ['portal', 'pebble', 'wedge'] }],
  },
  { id: 'portal', name: 'Open circle', size: [1.05, 1.15, 0.65], color: 4, contacts: [] },
]
export const PALETTES: Record<PaletteId, { name: string; colors: string[] }> = {
  earth: { name: 'Clay & chalk', colors: ['#d5c7ad', '#b76448', '#d9d7c8', '#53645a', '#e6b744'] },
  tidal: { name: 'Tidal blue', colors: ['#d6d1c1', '#426d7e', '#9ab3ad', '#303f47', '#dc9478'] },
  chalk: { name: 'Quiet mineral', colors: ['#cec9bd', '#797c74', '#e4dfd2', '#414946', '#b89465'] },
  orchard: { name: 'Late orchard', colors: ['#d0bd9e', '#6c7754', '#dcaa8f', '#733e3b', '#dfb842'] },
}
export interface Instance {
  id: string
  partId: PartId
  parentId: string | null
  contactId: string
  restingFrame: 'foot'
  orientation: 0 | 180
}
export type Motif = 'loop' | 'route' | 'inlay'
export interface Marker {
  id: string
  instanceId: string
  motif: Motif
  visible: boolean
  evidenceId?: string
  exampleId?: 'help' | 'adapt' | 'voices'
  retainUnlinked: boolean
}
export interface Composition {
  schemaVersion: 1
  catalogueVersion: 1
  palette: PaletteId
  motionOff: boolean
  pieces: Instance[]
  tray: { id: string; partId: PartId }[]
  markers: Marker[]
}
export const part = (id: PartId): Part => CATALOGUE.find((p) => p.id === id)!
export function initialComposition(): Composition {
  return {
    schemaVersion: 1,
    catalogueVersion: 1,
    palette: 'earth',
    motionOff: false,
    tray: [],
    pieces: [
      {
        id: 'base',
        partId: 'foundation',
        parentId: null,
        contactId: 'ground',
        restingFrame: 'foot',
        orientation: 0,
      },
      {
        id: 'standing',
        partId: 'spire',
        parentId: 'base',
        contactId: 'left',
        restingFrame: 'foot',
        orientation: 0,
      },
      {
        id: 'river',
        partId: 'pebble',
        parentId: 'standing',
        contactId: 'crown',
        restingFrame: 'foot',
        orientation: 0,
      },
      {
        id: 'turn',
        partId: 'wedge',
        parentId: 'river',
        contactId: 'crown',
        restingFrame: 'foot',
        orientation: 0,
      },
      {
        id: 'span',
        partId: 'bridge',
        parentId: 'base',
        contactId: 'right',
        restingFrame: 'foot',
        orientation: 0,
      },
      {
        id: 'opening',
        partId: 'portal',
        parentId: 'span',
        contactId: 'crown',
        restingFrame: 'foot',
        orientation: 0,
      },
    ],
    markers: [
      {
        id: 'm-help',
        instanceId: 'standing',
        motif: 'loop',
        visible: true,
        exampleId: 'help',
        retainUnlinked: false,
      },
      {
        id: 'm-adapt',
        instanceId: 'river',
        motif: 'route',
        visible: true,
        exampleId: 'adapt',
        retainUnlinked: false,
      },
      {
        id: 'm-voices',
        instanceId: 'span',
        motif: 'inlay',
        visible: true,
        exampleId: 'voices',
        retainUnlinked: false,
      },
    ],
  }
}
export interface Pose {
  at: Vec
  angle: number
}
/** Resting frame is [0,0,0]; align it to the parent's authored receiving frame. */
export function poses(c: Composition): Map<string, Pose> {
  const result = new Map<string, Pose>()
  const visit = (p: Instance, seen: Set<string>): Pose => {
    if (seen.has(p.id)) throw new Error('Cyclic assembly')
    const cached = result.get(p.id)
    if (cached) return cached
    const trail = new Set(seen).add(p.id)
    let at: Vec = [0, 0, 0]
    let angle = p.orientation
    if (p.parentId) {
      const parent = c.pieces.find((x) => x.id === p.parentId)
      if (!parent) throw new Error('Missing support')
      const contact = part(parent.partId).contacts.find((f) => f.id === p.contactId)
      if (!contact) throw new Error('Unknown contact')
      const pose = visit(parent, trail)
      const sign = pose.angle % 360 === 0 ? 1 : -1
      at = [pose.at[0] + contact.at[0] * sign, pose.at[1] + contact.at[1], pose.at[2] + contact.at[2] * sign]
      angle += pose.angle
    }
    const value = { at, angle }
    result.set(p.id, value)
    return value
  }
  c.pieces.forEach((p) => visit(p, new Set()))
  return result
}
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v)
export function parseComposition(v: unknown): Composition {
  if (!obj(v) || v.schemaVersion !== 1 || v.catalogueVersion !== 1)
    throw new Error('Unsupported assemblage schema or catalogue. Original data was not changed.')
  if (
    typeof v.palette !== 'string' ||
    !Object.hasOwn(PALETTES, v.palette) ||
    typeof v.motionOff !== 'boolean'
  )
    throw new Error('Invalid palette or motion preference')
  if (
    !Array.isArray(v.pieces) ||
    v.pieces.length < 1 ||
    v.pieces.length > 6 ||
    !Array.isArray(v.markers) ||
    v.markers.length > 12
  )
    throw new Error('Use one to six pieces and at most twelve markers')
  const pieces: Instance[] = v.pieces.map((p: unknown) => {
    if (
      !obj(p) ||
      !id(p.id) ||
      !CATALOGUE.some((x) => x.id === p.partId) ||
      !(p.parentId === null || id(p.parentId)) ||
      !id(p.contactId) ||
      p.restingFrame !== 'foot' ||
      ![0, 180].includes(p.orientation as number)
    )
      throw new Error('Invalid piece or orientation')
    return {
      id: p.id,
      partId: p.partId as PartId,
      parentId: p.parentId,
      contactId: p.contactId,
      restingFrame: 'foot',
      orientation: p.orientation as 0 | 180,
    }
  })
  if (
    new Set(pieces.map((p) => p.id)).size !== pieces.length ||
    new Set(pieces.map((p) => p.partId)).size !== pieces.length
  )
    throw new Error('Duplicate piece')
  if (
    pieces.filter((p) => p.parentId === null).length !== 1 ||
    !pieces.some((p) => p.partId === 'foundation' && p.parentId === null && p.contactId === 'ground')
  )
    throw new Error('One foundation root is required')
  const occupied = new Set<string>()
  for (const p of pieces.filter((p) => p.parentId !== null)) {
    const parent = pieces.find((x) => x.id === p.parentId)
    const contact = parent && part(parent.partId).contacts.find((f) => f.id === p.contactId)
    if (!contact?.accepts.includes(p.partId)) throw new Error('Unsupported placement')
    const key = `${p.parentId}/${p.contactId}`
    if (occupied.has(key)) throw new Error('Contact is occupied')
    occupied.add(key)
  }
  if (!Array.isArray(v.tray) || v.tray.length + pieces.length > 6) throw new Error('Invalid repertoire')
  const tray = v.tray.map((p: unknown) => {
    if (!obj(p) || !id(p.id) || !CATALOGUE.some((x) => x.id === p.partId))
      throw new Error('Invalid repertoire piece')
    return { id: p.id, partId: p.partId as PartId }
  })
  const all = [...pieces, ...tray]
  if (
    new Set(all.map((p) => p.id)).size !== all.length ||
    new Set(all.map((p) => p.partId)).size !== all.length
  )
    throw new Error('Duplicate repertoire piece')
  const markers: Marker[] = v.markers.map((m: unknown) => {
    if (
      !obj(m) ||
      !id(m.id) ||
      !id(m.instanceId) ||
      !['loop', 'route', 'inlay'].includes(m.motif as string) ||
      typeof m.visible !== 'boolean' ||
      typeof m.retainUnlinked !== 'boolean' ||
      (m.evidenceId !== undefined &&
        (typeof m.evidenceId !== 'string' || !m.evidenceId.trim() || m.evidenceId.length > 20000)) ||
      (m.exampleId !== undefined && !['help', 'adapt', 'voices'].includes(m.exampleId as string)) ||
      (m.evidenceId && m.exampleId)
    )
      throw new Error('Invalid memory marker')
    // Hidden pieces retain their markers in the repertoire; no evidence text is stored here.
    return {
      id: m.id,
      instanceId: m.instanceId,
      motif: m.motif as Motif,
      visible: m.visible,
      retainUnlinked: m.retainUnlinked,
      ...(m.evidenceId ? { evidenceId: m.evidenceId as string } : {}),
      ...(m.exampleId ? { exampleId: m.exampleId as Marker['exampleId'] & string } : {}),
    }
  })
  if (markers.some((m) => !all.some((p) => p.id === m.instanceId))) throw new Error('Missing marker piece')
  if (
    new Set(markers.map((m) => m.id)).size !== markers.length ||
    markers.some((m) => all.some((p) => p.id === m.id))
  )
    throw new Error('Duplicate marker')
  const c: Composition = {
    schemaVersion: 1,
    catalogueVersion: 1,
    palette: v.palette as PaletteId,
    motionOff: v.motionOff,
    pieces,
    tray,
    markers,
  }
  const transforms = poses(c)
  // Conservative bounding boxes reject intersections, including some possible arrangements.
  for (let i = 0; i < pieces.length; i++)
    for (let j = i + 1; j < pieces.length; j++) {
      const a = pieces[i]!
      const b = pieces[j]!
      const ap = transforms.get(a.id)!.at
      const bp = transforms.get(b.id)!.at
      const as = part(a.partId).size
      const bs = part(b.partId).size
      if (
        Math.abs(ap[0] - bp[0]) < (as[0] + bs[0]) / 2 - 0.015 &&
        Math.abs(ap[2] - bp[2]) < (as[2] + bs[2]) / 2 - 0.015 &&
        Math.min(ap[1] + as[1], bp[1] + bs[1]) - Math.max(ap[1], bp[1]) > 0.015
      )
        throw new Error('Pieces overlap; choose another contact')
    }
  return c
}
export function appearanceExport(c: Composition): string {
  // Regenerate instance and marker IDs; do not leak opaque evidence-linkable identifiers.
  const ids = new Map([...c.pieces, ...c.tray].map((p, i) => [p.id, `piece-${i}`]))
  return JSON.stringify(
    {
      schemaVersion: c.schemaVersion,
      catalogueVersion: c.catalogueVersion,
      palette: c.palette,
      motionOff: c.motionOff,
      tray: c.tray.map((p) => ({ ...p, id: ids.get(p.id) })),
      pieces: c.pieces.map((p) => ({
        ...p,
        id: ids.get(p.id),
        parentId: p.parentId ? ids.get(p.parentId) : null,
      })),
      markers: c.markers
        .filter((m) => ids.has(m.instanceId))
        .map((m, i) => ({
          id: `decoration-${i}`,
          instanceId: ids.get(m.instanceId),
          motif: m.motif,
          visible: m.visible,
          retainUnlinked: true,
        })),
    },
    null,
    2,
  )
}
export function removePiece(c: Composition, instanceId: string): Composition {
  if (c.pieces.find((p) => p.id === instanceId)?.partId === 'foundation')
    throw new Error('Keep the foundation')
  const gone = new Set([instanceId])
  let changed = true
  while (changed) {
    changed = false
    c.pieces.forEach((p) => {
      if (p.parentId && gone.has(p.parentId) && !gone.has(p.id)) {
        gone.add(p.id)
        changed = true
      }
    })
  }
  return {
    ...c,
    pieces: c.pieces.filter((p) => !gone.has(p.id)),
    tray: [...c.tray, ...c.pieces.filter((p) => gone.has(p.id)).map((p) => ({ id: p.id, partId: p.partId }))],
  }
}
export function placements(
  c: Composition,
  partId: PartId,
): { parentId: string; contactId: string; label: string }[] {
  return c.pieces.flatMap((p) =>
    part(p.partId)
      .contacts.filter((f) => f.accepts.includes(partId))
      .flatMap((f) => {
        try {
          parseComposition({
            ...c,
            tray: c.tray.filter((p) => p.partId !== partId),
            pieces: [
              ...c.pieces,
              {
                id: c.tray.find((p) => p.partId === partId)?.id ?? 'preview',
                partId,
                parentId: p.id,
                contactId: f.id,
                restingFrame: 'foot',
                orientation: 0,
              },
            ],
          })
          return [{ parentId: p.id, contactId: f.id, label: `${part(p.partId).name} · ${f.id}` }]
        } catch {
          return []
        }
      }),
  )
}
