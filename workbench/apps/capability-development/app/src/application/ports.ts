import type { Clock, IdFactory } from '~/domain/ids'
import type { ContentRegistry } from '~/content/registry'

/**
 * Everything a command needs from outside itself. Passing these in rather than importing them
 * keeps commands pure and testable, and it is what lets a different content pack be loaded
 * without touching command code.
 */
export interface CommandDeps {
  clock: Clock
  newId: IdFactory
  content: ContentRegistry
}
