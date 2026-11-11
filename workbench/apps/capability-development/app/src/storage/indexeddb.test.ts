/**
 * The same compare-and-set contract as the in-memory store, but through real IndexedDB semantics
 * (transactions, aborts and structured clones) using an injected fake-indexeddb factory.
 *
 * This is the store the app actually saves to, so the cases here are the ones that decide whether
 * a user's records survive two tabs, a corrupted database or a browser with storage switched off.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { reviewedRealAttempt, withSituation } from '~/test-helpers/fixtures'
import { createIndexedDbStore, DB_VERSION, STORE_NAME } from './indexeddb'
import { StorageError, type Namespace } from './types'

let databaseCounter = 0

/** A private database per test: a shared one would let one test's records answer another's load. */
function freshDatabase(): { factory: IDBFactory; dbName: string } {
  databaseCounter += 1
  return { factory: new IDBFactory(), dbName: `storage-test-${databaseCounter}` }
}

/**
 * Asserts the operation rejected with a StorageError and hands it back narrowed. A resolved
 * promise fails the test: a storage operation that cannot be honoured must never resolve, or the
 * app would tell the user their records are saved when they are not.
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

function openRaw(factory: IDBFactory, dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(dbName, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('the test database could not be opened'))
  })
}

/** Writes straight into the object store, bypassing the store, to simulate a corrupted database. */
async function putRaw(factory: IDBFactory, dbName: string, ns: Namespace, record: unknown): Promise<void> {
  const db = await openRaw(factory, dbName)
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(record, ns)
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error ?? new Error('the test write was aborted'))
    })
  } finally {
    db.close()
  }
}

async function readRaw(factory: IDBFactory, dbName: string, ns: Namespace): Promise<unknown> {
  const db = await openRaw(factory, dbName)
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(ns)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('the test read failed'))
    })
  } finally {
    db.close()
  }
}

describe('createIndexedDbStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the same records on load as were saved, at revision 1', async () => {
    const { factory, dbName } = freshDatabase()
    const store = createIndexedDbStore({ factory, dbName })
    const data = reviewedRealAttempt()

    await store.save('personal', data, 0)

    const snapshot = await store.load('personal')
    expect(snapshot.revision).toBe(1)
    expect(snapshot.data).toEqual(data)
  })

  it('refuses a save from a stale revision and leaves the earlier records in place', async () => {
    const { factory, dbName } = freshDatabase()
    const store = createIndexedDbStore({ factory, dbName })
    const stored = reviewedRealAttempt()
    await store.save('personal', stored, 0)

    const error = await rejection(store.save('personal', withSituation(), 0))

    expect(error.kind).toBe('conflict')
    // A conflict must abort the transaction, not just report one: if the put had already landed,
    // the other tab's records would be gone even though the user was told the save failed.
    const after = await store.load('personal')
    expect(after.revision).toBe(1)
    expect(after.data).toEqual(stored)
  })

  it('clears by writing empty records at the next revision rather than resetting to 0', async () => {
    const { factory, dbName } = freshDatabase()
    const store = createIndexedDbStore({ factory, dbName })
    await store.save('personal', reviewedRealAttempt(), 0)

    await store.clear('personal')

    // Deleting the row instead would send the revision back to 0 and let a tab holding revision 1
    // overwrite the clear with the records the user had just deleted.
    const after = await store.load('personal')
    expect(after.revision).toBe(2)
    expect(after.data.situations).toEqual([])
    expect(after.data.activities).toEqual([])
  })

  it('keeps personal and demo records in separate namespaces', async () => {
    const { factory, dbName } = freshDatabase()
    const store = createIndexedDbStore({ factory, dbName })

    await store.save('demo', reviewedRealAttempt(), 0)

    // Demo records are fiction; showing them as personal history would be a false record.
    const personal = await store.load('personal')
    expect(personal.revision).toBe(0)
    expect(personal.data.situations).toEqual([])
  })

  it('reports browser storage as unavailable when there is no IndexedDB to use', async () => {
    // No factory injected and no global indexedDB, which is what a private window or a browser
    // with site data disabled looks like. The user must be told storage is off, not shown a crash.
    const store = createIndexedDbStore({ dbName: 'storage-test-no-global' })

    const error = await rejection(store.load('personal'))

    expect(error.kind).toBe('unavailable')
  })

  it('reports browser storage as unavailable when opening the database is refused', async () => {
    const refuse = (): never => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    }
    const factory: IDBFactory = { open: refuse, deleteDatabase: refuse, databases: refuse, cmp: refuse }
    const store = createIndexedDbStore({ factory, dbName: 'storage-test-refused' })

    const error = await rejection(store.save('personal', withSituation(), 0))

    // A blocked database is a known condition with its own message, not an unknown failure.
    expect(error.kind).toBe('unavailable')
  })

  it('refuses to load records that do not pass validation instead of showing them', async () => {
    const { factory, dbName } = freshDatabase()
    const corrupted = { ...reviewedRealAttempt(), situations: 'no longer a list of situations' }
    await putRaw(factory, dbName, 'personal', { data: corrupted, revision: 4, savedAt: '2026-11-11T09:00:00.000Z' })
    const store = createIndexedDbStore({ factory, dbName })

    // Resolving with whatever could be salvaged would present a half-read journal as complete;
    // `rejection` fails the test if load resolves at all, so no partial data reaches the caller.
    const error = await rejection(store.load('personal'))

    expect(error).toBeInstanceOf(StorageError)
    // The unreadable row is left as it was, so the records can still be recovered or exported.
    expect(await readRaw(factory, dbName, 'personal')).toMatchObject({ revision: 4 })
  })

  it('still saves and subscribes where BroadcastChannel does not exist', async () => {
    const { factory, dbName } = freshDatabase()
    vi.stubGlobal('BroadcastChannel', undefined)
    const store = createIndexedDbStore({ factory, dbName })

    const snapshot = await store.save('personal', withSituation(), 0)
    const unsubscribe = store.subscribe('personal', () => {
      throw new Error('no cross-tab message can arrive without BroadcastChannel')
    })
    unsubscribe()

    // Cross-tab notification is best effort: without it the revision check still prevents an
    // overwrite, so saving must keep working rather than failing on an optional nicety.
    expect(snapshot.revision).toBe(1)
  })
})
