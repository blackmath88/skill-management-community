/**
 * A way for the rest of the interface to give the mobile a small push.
 *
 * Saving something is an event in the room, and a mobile answers to the air moving. This is the
 * whole mechanism: a window event with a strength. It carries no data about what was saved, and
 * a mobile that is not on screen, or a person who asked for reduced motion, simply never moves.
 */
const EVENT = 'skilling-me-softly:mobile-nudge'

export function nudgeMobile(strength = 1): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<number>(EVENT, { detail: strength }))
}

export function onMobileNudge(listener: (strength: number) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handle = (event: Event) => listener((event as CustomEvent<number>).detail ?? 1)
  window.addEventListener(EVENT, handle)
  return () => window.removeEventListener(EVENT, handle)
}
