import { emptyUserData } from '~/domain/empty'
import type { UserData } from '~/domain/types'
import { validateUserData } from '~/domain/validation'
import { StorageError, type Namespace, type RecordStore, type StoredSnapshot } from './types'

interface Slot {
  data: UserData
  revision: number
  savedAt: string | null
}

export interface MemoryStoreOptions {
  /** Fail the next N operations with this error, for testing truthful failure handling. */
  failWith?: StorageError
  /** Number of operations to fail. Defaults to Infinity while `failWith` is set. */
  failCount?: number
  now?: () => string
}

/**
 * In-memory store with the same compare-and-set contract as the IndexedDB store. Used by tests
 * and by the app when browser storage is unavailable and the user chooses to continue unsaved.
 */
export function createMemoryStore(options: MemoryStoreOptions = {}): RecordStore & {
  /** Simulates another tab writing, so stale-tab handling can be tested. */
  externalWrite(ns: Namespace, data: UserData): void
} {
  const now = options.now ?? (() => new Date().toISOString())
  const slots = new Map<Namespace, Slot>()
  const listeners = new Map<Namespace, Set<(revision: number) => void>>()
  let remainingFailures = options.failWith ? (options.failCount ?? Number.POSITIVE_INFINITY) : 0

  const maybeFail = () => {
    if (options.failWith && remainingFailures > 0) {
      remainingFailures -= 1
      throw options.failWith
    }
  }

  const slot = (ns: Namespace): Slot => slots.get(ns) ?? { data: emptyUserData(), revision: 0, savedAt: null }

  const notify = (ns: Namespace, revision: number) => {
    for (const listener of listeners.get(ns) ?? []) listener(revision)
  }

  return {
    async load(ns) {
      maybeFail()
      const current = slot(ns)
      return { data: structuredClone(current.data), revision: current.revision, savedAt: current.savedAt }
    },
    async save(ns, data, expectedRevision) {
      maybeFail()
      // The same refusal as the IndexedDB store: both implementations honour one contract, so a
      // test against this store exercises the behaviour the real one has.
      const checked = validateUserData(data)
      if (!checked.ok) {
        throw new StorageError(
          'invalid',
          `These changes were not saved, because saving them would make your records unreadable. Nothing was changed. (${checked.errors.slice(0, 2).join('; ')})`,
        )
      }
      const current = slot(ns)
      if (current.revision !== expectedRevision) {
        throw new StorageError(
          'conflict',
          `Another tab saved revision ${current.revision} while you were working from revision ${expectedRevision}.`,
        )
      }
      const next: Slot = { data: structuredClone(data), revision: current.revision + 1, savedAt: now() }
      slots.set(ns, next)
      const snapshot: StoredSnapshot = { data: structuredClone(next.data), revision: next.revision, savedAt: next.savedAt }
      return snapshot
    },
    async clear(ns) {
      maybeFail()
      const current = slot(ns)
      slots.set(ns, { data: emptyUserData(), revision: current.revision + 1, savedAt: now() })
    },
    subscribe(ns, onExternalChange) {
      const set = listeners.get(ns) ?? new Set()
      set.add(onExternalChange)
      listeners.set(ns, set)
      return () => set.delete(onExternalChange)
    },
    externalWrite(ns, data) {
      const current = slot(ns)
      const revision = current.revision + 1
      slots.set(ns, { data: structuredClone(data), revision, savedAt: now() })
      notify(ns, revision)
    },
  }
}
