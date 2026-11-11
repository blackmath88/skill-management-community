/**
 * The compare-and-set contract of the in-memory store.
 *
 * This store stands in for browser storage when IndexedDB is unavailable and the user chooses to
 * continue unsaved, so the guarantees pinned here are the ones they rely on in that mode: a write
 * from a stale view of the data is refused rather than applied, revisions never go backwards, and
 * personal records never mix with the fictional demo records.
 */
import { describe, expect, it } from 'vitest'
import { emptyUserData } from '~/domain/empty'
import { reviewedRealAttempt, withSituation } from '~/test-helpers/fixtures'
import { createMemoryStore } from './memory'
import { StorageError } from './types'

/**
 * Asserts the operation rejected with a StorageError and hands it back narrowed. A resolved
 * promise fails the test: a storage operation that cannot be honoured must never resolve, because
 * the caller would then report unsaved work as saved.
 */
async function rejection(operation: Promise<unknown>): Promise<StorageError> {
  try {
    await operation
  } catch (error) {
    if (error instanceof StorageError) return error
    throw error
  }
  throw new Error('expected the operation to reject with a StorageError, but it resolved')
}

describe('createMemoryStore', () => {
  it('reports an untouched namespace as revision 0 with no records and no save time', async () => {
    const store = createMemoryStore()

    const snapshot = await store.load('personal')

    // Revision 0 is how the app tells "nothing stored yet" from "stored and empty"; getting this
    // wrong would make a first save look like a conflict.
    expect(snapshot.revision).toBe(0)
    expect(snapshot.savedAt).toBeNull()
    expect(snapshot.data).toEqual(emptyUserData())
  })

  it('increments the revision by exactly one on a save from the expected revision', async () => {
    const store = createMemoryStore({ now: () => '2026-11-11T09:30:00.000Z' })
    const data = reviewedRealAttempt()

    const snapshot = await store.save('personal', data, 0)

    expect(snapshot.revision).toBe(1)
    expect(snapshot.savedAt).toBe('2026-11-11T09:30:00.000Z')
    expect(snapshot.data).toEqual(data)
  })

  it('refuses a save from a stale revision and leaves the stored records untouched', async () => {
    const store = createMemoryStore()
    const stored = reviewedRealAttempt()
    await store.save('personal', stored, 0)

    const error = await rejection(store.save('personal', withSituation(), 0))

    expect(error.kind).toBe('conflict')
    // The whole point of the contract: the losing write must not have landed. Reading again is
    // the only honest check, because a silent overwrite would lose the other tab's work.
    const after = await store.load('personal')
    expect(after.revision).toBe(1)
    expect(after.data).toEqual(stored)
  })

  it('keeps personal and demo records in separate namespaces', async () => {
    const store = createMemoryStore()

    await store.save('demo', reviewedRealAttempt(), 0)

    // Demo records are fiction. If they leaked into the personal namespace the user's own journal
    // would show invented situations as their own history.
    const personal = await store.load('personal')
    expect(personal.revision).toBe(0)
    expect(personal.data.situations).toEqual([])
  })

  it('clears by storing empty records at the next revision rather than resetting to 0', async () => {
    const store = createMemoryStore()
    await store.save('personal', reviewedRealAttempt(), 0)

    await store.clear('personal')

    // Monotonic revisions are what stop a tab still holding revision 1 from overwriting the clear.
    const after = await store.load('personal')
    expect(after.revision).toBe(2)
    expect(after.data.situations).toEqual([])
    expect(after.data.activities).toEqual([])
  })

  it('returns a copy from load, so mutating it cannot change what is stored', async () => {
    const store = createMemoryStore()
    await store.save('personal', reviewedRealAttempt(), 0)

    const loaded = await store.load('personal')
    loaded.data.situations.length = 0
    loaded.data.profile.displayName = 'edited in place'

    // A live reference would let a half-finished edit in the UI become stored data without a save.
    const again = await store.load('personal')
    expect(again.data.situations).toHaveLength(1)
    expect(again.data.profile.displayName).toBeUndefined()
  })

  it('copies the records handed to save, so later edits to that object are not stored', async () => {
    const store = createMemoryStore()
    const data = reviewedRealAttempt()
    await store.save('personal', data, 0)

    data.situations.length = 0

    const after = await store.load('personal')
    expect(after.data.situations).toHaveLength(1)
  })

  it('fails exactly the requested number of operations and then works normally', async () => {
    const quotaFull = new StorageError('quota', 'Your browser has no storage space left.')
    const store = createMemoryStore({ failWith: quotaFull, failCount: 2 })

    // Injected failure is how the app's own handling of a truthful "this was not saved" is tested;
    // a failure count that leaks into later operations would make those tests meaningless.
    expect(await rejection(store.load('personal'))).toBe(quotaFull)
    expect(await rejection(store.save('personal', withSituation(), 0))).toBe(quotaFull)
    const snapshot = await store.save('personal', withSituation(), 0)
    expect(snapshot.revision).toBe(1)
  })

  it('notifies subscribers of an external write and stops once unsubscribed', async () => {
    const store = createMemoryStore()
    const seen: number[] = []
    const unsubscribe = store.subscribe('personal', (revision) => seen.push(revision))
    const otherNamespace: number[] = []
    store.subscribe('demo', (revision) => otherNamespace.push(revision))

    store.externalWrite('personal', withSituation())
    unsubscribe()
    store.externalWrite('personal', withSituation())

    // The subscriber is how a stale tab learns to reload instead of saving over newer records.
    expect(seen).toEqual([1])
    expect(otherNamespace).toEqual([])
  })
})
