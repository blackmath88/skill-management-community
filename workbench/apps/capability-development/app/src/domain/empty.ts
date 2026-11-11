import { SCHEMA_VERSION, type UserData } from './types'

/** A brand-new record set: no directions, no evidence, no progress. */
export function emptyUserData(now: string = new Date(0).toISOString()): UserData {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: { selectedPackIds: [], updatedAt: now },
    directions: [],
    situations: [],
    campaigns: [],
    hypotheses: [],
    activities: [],
    attempts: [],
    evidence: [],
    reviews: [],
    perks: [],
    proposals: [],
    sharePackages: [],
  }
}

/** Replace the record with the same id, or append it. Returns a new array. */
export function upsertById<T extends { id: string }>(items: readonly T[], item: T): T[] {
  const index = items.findIndex((x) => x.id === item.id)
  if (index === -1) return [...items, item]
  const next = items.slice()
  next[index] = item
  return next
}
