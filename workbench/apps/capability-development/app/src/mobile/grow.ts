/**
 * Grown arrangements: the same grammar, for as many things as there are.
 *
 * The three authored arrangements carry five sheets. A set of skills is larger and has a shape of
 * its own — a dozen today, thirty or more in several branches tomorrow — so its mobile is grown
 * from that shape instead of drawn by hand: one bough per branch, one sheet per skill.
 *
 * It is built the way a mobile is built, from the bottom up. A small branch is a bow with a sheet
 * at each end; a fuller one is a hoop with its sheets in a ring. The boughs are then gathered by
 * halving: a group hangs from an arm with half of it at each end, and the arm is hung off-centre by the lever rule —
 * the heavier side gets the shorter reach — so it looks balanced because, as drawn, it is. A
 * branch keeps one sheet shape and one tone throughout, so branches are told apart by form as
 * well as colour.
 *
 * Deterministic: the same branches always grow the same mobile. Nothing here is random and
 * nothing depends on a record.
 */
import type { Hang, MobileComposition, MobileShape, ShapeKind } from './catalogue'
import { drawMobile } from './scene'

export interface Branch {
  /** A word for the branch, used in labels. */
  title: string
  /** One name per leaf, in order. */
  leaves: string[]
}

const KINDS: readonly ShapeKind[] = ['disc', 'leaf', 'drop', 'ring', 'crescent', 'bar']
/** Resting angles spread by the golden angle, so neighbours never rest parallel. */
const spread = (i: number, amount: number) => (((i * 2.39996) % Math.PI) - Math.PI / 2) * amount

interface Item {
  hang: (level: number) => Hang
  weight: number
  /** Roughly how wide this hangs, so whatever carries it can give it room. */
  width: number
}

export function growMobile(id: string, title: string, branches: readonly Branch[]): MobileComposition {
  const total = branches.reduce((sum, b) => sum + b.leaves.length, 0)
  const r = Math.max(10, Math.min(17, 19 - total * 0.22))
  const shapes: MobileShape[] = []
  let arms = 0

  /**
   * Hang a list of things from one point: one alone, or an arm with half at each end.
   * `room` is how generously the two halves are kept apart; boughs get more than sheets, because
   * a mobile turns and its parts pass in front of each other, but a bough should still read as one.
   */
  const gather = (items: Item[], room: number, centre: boolean): Item => {
    if (items.length === 1) return items[0]!
    // Three sheets hang two at the ends and one from the middle; boughs never share a middle.
    const odd = centre && items.length === 3
    const half = odd ? 1 : Math.ceil(items.length / 2)
    const left = gather(items.slice(0, half), room, centre)
    const right = gather(items.slice(odd ? 2 : half), room, centre)
    const middle = odd ? items[1] : undefined
    const index = arms++
    const sum = left.weight + right.weight
    const span = Math.max(r * 2.6, (left.width + right.width) * room + (middle ? r * 1.6 : 0))
    // The lever rule: reach is inversely proportional to what hangs there.
    const reachLeft = Math.max(r * 1.3, (span * right.weight) / sum)
    const reachRight = Math.max(r * 1.3, (span * left.weight) / sum)
    return {
      weight: sum + (middle?.weight ?? 0),
      width: Math.max(reachLeft + left.width / 2, reachRight + right.width / 2) * 2,
      hang: (level) => ({
        thread: 14 + (index % 3) * 7 + level * 2,
        node: {
          kind: 'arm',
          left: reachLeft,
          right: reachRight,
          // A bow, never a hairpin: the rise stays a modest share of the reach.
          drop: Math.max(5, Math.min(26, (reachLeft + reachRight) * 0.16)),
          turn: spread(index + 1, centre ? 0.5 : 0.22),
          ends: [left.hang(level + 1), right.hang(level + 1)],
          ...(middle ? { centre: middle.hang(level + 1) } : {}),
        },
      }),
    }
  }

  const boughs: Item[] = branches
    .filter((branch) => branch.leaves.length > 0)
    .map((branch, b) => {
      const leaves: Item[] = branch.leaves.map((leaf, k) => {
        const slot = shapes.length
        shapes.push({ kind: KINDS[b % KINDS.length]!, r, rot: ((slot * 37) % 30) - 15, tone: (b % 3) as 0 | 1 | 2, name: leaf })
        return {
          weight: 1,
          width: r * 2.3,
          hang: () => ({ thread: 12 + ((k * 2) % 3) * (r * 1.7), node: { kind: 'shape', slot, turn: spread(slot + 3, 0.6) } }),
        }
      })
      if (leaves.length <= 3) return gather(leaves, 0.56, true)
      // A fuller branch hangs from a hoop: its sheets in a ring at staggered lengths, which keeps
      // a dozen skills readable where a dozen nested arms would not be.
      const radius = Math.max(r * 1.9, r * 0.62 * leaves.length)
      return {
        weight: leaves.length,
        width: (radius + r) * 2,
        hang: (level: number) => ({
          // Alternate boughs hang high and low, in two tiers, so neighbours pass under each other.
          thread: b % 2 === 0 ? 12 : 30 + r * 5.5,
          node: {
            kind: 'hoop' as const,
            radius,
            drop: radius * 0.42 + 8,
            turn: spread(b + 2, 0.9),
            hangs: leaves.map((leaf, k) => ({ at: (k * 2 * Math.PI) / leaves.length, hang: leaf.hang(level + 1) })),
          },
        }),
      }
    })

  if (boughs.length === 0) {
    return { id, title, description: 'Nothing to hang yet.', hookX: 160, root: { thread: 20, node: { kind: 'arm', left: 60, right: 60, drop: 16, turn: 0.3, ends: [null, null] } }, shapes: [], viewBox: '0 0 320 120' }
  }
  const top = gather(boughs, 0.5, false)
  const composition: MobileComposition = {
    id,
    title,
    description: `${total} sheets on ${boughs.length} boughs.`,
    hookX: 0,
    root: { ...top.hang(0), thread: 22 },
    shapes,
    // Seen from far enough away that the near side does not loom.
    focal: 760 + top.width * 3,
    armTurn: 0.3,
  }
  return { ...composition, viewBox: frame(composition) }
}

/** A frame that holds the mobile however it is turned: measured, not guessed. */
function frame(composition: MobileComposition): string {
  let reach = 60
  let bottom = 100
  for (let turned = 0; turned < Math.PI * 2; turned += Math.PI / 7) {
    for (const part of drawMobile(composition, 0, turned)) {
      if (part.kind !== 'shape') continue
      const size = (composition.shapes[part.slot]?.r ?? 0) * part.scale
      reach = Math.max(reach, Math.abs(part.x) + size)
      bottom = Math.max(bottom, part.y + size)
    }
  }
  const pad = 18
  return `${Math.floor(-reach - pad)} -6 ${Math.ceil((reach + pad) * 2)} ${Math.ceil(bottom + pad + 34)}`
}
