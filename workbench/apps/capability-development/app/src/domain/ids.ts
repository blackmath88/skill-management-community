/** Opaque identifier factory and clock. Both are injected so tests stay deterministic. */

export type IdFactory = () => string

export interface Clock {
  /** ISO-8601 UTC timestamp. */
  now(): string
  /** Local calendar date, YYYY-MM-DD. */
  today(): string
}

export function randomIdFactory(): IdFactory {
  return () => crypto.randomUUID()
}

/** Deterministic ids for tests and the fake AI provider. Never used for stored personal data in the app. */
export function sequentialIdFactory(prefix = 'id'): IdFactory {
  let n = 0
  return () => `${prefix}-${++n}`
}

export function systemClock(): Clock {
  return {
    now: () => new Date().toISOString(),
    today: () => {
      const d = new Date()
      const pad = (v: number) => String(v).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    },
  }
}

export function fixedClock(iso: string): Clock {
  return { now: () => iso, today: () => iso.slice(0, 10) }
}
