import { initialComposition, parseComposition, type Composition } from '~/assemblage/model'
import type { UserData } from '~/domain/types'
import type { CommandDeps } from './ports'
import { fail, ok } from './results'
/** Optimistic appearance check plus the existing session revision queue: no parallel store. */
export function saveAssemblage(data: UserData, value: unknown, expected: Composition, deps: CommandDeps) {
  if (JSON.stringify(data.profile.assemblage ?? initialComposition()) !== JSON.stringify(expected))
    return fail('conflict', 'The composition changed. Reload it before applying this edit.')
  try {
    const composition = parseComposition(value)
    if (composition.markers.some((m) => m.evidenceId && !data.evidence.some((e) => e.id === m.evidenceId)))
      return fail('validation', 'A memory refers to evidence that no longer exists.')
    return ok(
      { ...data, profile: { ...data.profile, assemblage: composition, updatedAt: deps.clock.now() } },
      composition,
    )
  } catch (error) {
    return fail('validation', error instanceof Error ? error.message : 'Invalid composition')
  }
}
