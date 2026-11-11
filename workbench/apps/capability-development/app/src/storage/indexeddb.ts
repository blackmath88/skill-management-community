// IndexedDB RecordStore. Never touches indexedDB at module evaluation.
//
// Ported from blackmath88/leader-me src/storage/indexeddb.ts (commit 55114f3b) with the database
// name, channel name and user-facing messages changed. The transaction, abort and conflict
// handling is kept as written: it is the part that guarantees a failed write is never reported as
// saved, and rewriting it would have been a regression risk for no benefit. See ../../PROVENANCE.md.
import { validateUserData } from '~/domain/validation'
import { emptyUserData } from '~/domain/empty'
import type { UserData } from '~/domain/types'
import { StorageError, type Namespace, type RecordStore, type StoredSnapshot } from './types'

export const DB_NAME = 'skilling-me-softly'
export const DB_VERSION = 1
export const STORE_NAME = 'snapshots'
export const CHANNEL_NAME = 'skilling-me-softly'

interface StoredRecord {
  data: UserData
  revision: number
  savedAt: string
}

interface ChangeMessage {
  ns: Namespace
  revision: number
  sender: string
}

export interface IndexedDbStoreOptions {
  /** Injected factory for tests; defaults to the global indexedDB, resolved lazily. */
  factory?: IDBFactory
  dbName?: string
}

const UNAVAILABLE_MESSAGE =
  'Browser storage is not available here (for example in a private window, with storage disabled, or or in a tool without browser storage). Nothing can be saved in this browser right now; please use a regular browser window.'

function abortQuietly(tx: IDBTransaction): void {
  try {
    tx.abort()
  } catch {
    // Already finished or aborting.
  }
}

function toStorageError(error: unknown, fallback: string): StorageError {
  if (error instanceof StorageError) return error
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  if (name === 'QuotaExceededError') {
    return new StorageError('quota', 'Your browser has no storage space left for this app. Export your records, then free up space.', { cause: error })
  }
  if (name === 'SecurityError' || name === 'InvalidStateError') {
    return new StorageError('unavailable', UNAVAILABLE_MESSAGE, { cause: error })
  }
  return new StorageError('unknown', fallback, { cause: error })
}

function isNamespace(v: unknown): v is Namespace {
  return v === 'personal' || v === 'demo'
}

export function createIndexedDbStore(options: IndexedDbStoreOptions = {}): RecordStore {
  const dbName = options.dbName ?? DB_NAME
  const senderId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random())
  let dbPromise: Promise<IDBDatabase> | null = null
  let channel: BroadcastChannel | null | undefined

  function getFactory(): IDBFactory {
    if (options.factory) return options.factory
    if (typeof indexedDB === 'undefined') throw new StorageError('unavailable', UNAVAILABLE_MESSAGE)
    return indexedDB
  }

  function openDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise
    const promise = new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest
      try {
        request = getFactory().open(dbName, DB_VERSION)
      } catch (error) {
        reject(toStorageError(error, UNAVAILABLE_MESSAGE))
        return
      }
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
      }
      request.onsuccess = () => {
        const db = request.result
        // Let a newer version in another tab upgrade; reopen lazily next time.
        db.onversionchange = () => {
          db.close()
          dbPromise = null
        }
        resolve(db)
      }
      request.onerror = () => reject(toStorageError(request.error, UNAVAILABLE_MESSAGE))
      request.onblocked = () => reject(new StorageError('unavailable', 'Browser storage is blocked by another tab of this app. Close other tabs and reload.'))
    })
    dbPromise = promise
    promise.catch(() => {
      if (dbPromise === promise) dbPromise = null
    })
    return promise
  }

  function getChannel(): BroadcastChannel | null {
    if (channel !== undefined) return channel
    channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME)
    return channel
  }

  function announce(ns: Namespace, revision: number): void {
    try {
      const message: ChangeMessage = { ns, revision, sender: senderId }
      getChannel()?.postMessage(message)
    } catch {
      // Cross-tab notification is best effort; the revision check still prevents overwrites.
    }
  }

  return {
    async load(ns) {
      const db = await openDb()
      return new Promise<StoredSnapshot>((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly')
          const request = tx.objectStore(STORE_NAME).get(ns)
          request.onsuccess = () => {
            const record = request.result as StoredRecord | undefined
            if (!record) {
              resolve({ data: emptyUserData(), revision: 0, savedAt: null })
              return
            }
            // Never render unchecked records; the raw record is left untouched for recovery.
            const checked = validateUserData(record.data)
            if (!checked.ok) {
              reject(new StorageError('unknown', 'The records saved in this browser could not be read safely, so they are not shown. They have not been changed.'))
              return
            }
            resolve({ data: checked.data, revision: record.revision, savedAt: record.savedAt })
          }
          request.onerror = () => reject(toStorageError(request.error, 'Your saved data could not be read.'))
        } catch (error) {
          reject(toStorageError(error, 'Your saved data could not be read.'))
        }
      })
    },

    async save(ns, data, expectedRevision) {
      const db = await openDb()
      const snapshot = await new Promise<StoredSnapshot>((resolve, reject) => {
        let result: StoredSnapshot | null = null
        let failure: StorageError | null = null
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          const store = tx.objectStore(STORE_NAME)
          const getRequest = store.get(ns)
          getRequest.onsuccess = () => {
            const current = (getRequest.result as StoredRecord | undefined)?.revision ?? 0
            if (current !== expectedRevision) {
              failure = new StorageError('conflict', 'A newer version was saved in another tab. Reload to see it before saving again.')
              tx.abort()
              return
            }
            const record: StoredRecord = { data, revision: current + 1, savedAt: new Date().toISOString() }
            try {
              store.put(record, ns)
              result = { data: record.data, revision: record.revision, savedAt: record.savedAt }
            } catch (error) {
              failure = toStorageError(error, 'Your changes could not be saved.')
              tx.abort()
            }
          }
          tx.oncomplete = () => {
            if (result) resolve(result)
            else reject(failure ?? new StorageError('unknown', 'Your changes could not be saved.'))
          }
          tx.onabort = () => reject(failure ?? toStorageError(tx.error, 'Your changes could not be saved.'))
          tx.onerror = (event) => {
            // preventDefault stops a duplicate uncaught error but would also cancel the abort,
            // so abort explicitly: a failed write must never be reported as saved.
            event.preventDefault()
            if (!failure) failure = toStorageError(tx.error ?? (event.target as IDBRequest | null)?.error, 'Your changes could not be saved.')
            result = null
            abortQuietly(tx)
          }
        } catch (error) {
          reject(toStorageError(error, 'Your changes could not be saved.'))
        }
      })
      announce(ns, snapshot.revision)
      return snapshot
    },

    async clear(ns) {
      // Writes an empty snapshot at the next revision instead of deleting the record, so
      // revisions stay monotonic and a tab holding an old revision can never overwrite.
      const db = await openDb()
      const revision = await new Promise<number>((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          const store = tx.objectStore(STORE_NAME)
          let next = 0
          const getRequest = store.get(ns)
          getRequest.onsuccess = () => {
            next = ((getRequest.result as StoredRecord | undefined)?.revision ?? 0) + 1
            const record: StoredRecord = { data: emptyUserData(new Date().toISOString()), revision: next, savedAt: new Date().toISOString() }
            store.put(record, ns)
          }
          tx.oncomplete = () => resolve(next)
          tx.onabort = () => reject(toStorageError(tx.error, 'Your data could not be deleted.'))
          tx.onerror = (event) => {
            // As in save(): suppress the duplicate error event but still abort, so onabort rejects.
            event.preventDefault()
            abortQuietly(tx)
          }
        } catch (error) {
          reject(toStorageError(error, 'Your data could not be deleted.'))
        }
      })
      announce(ns, revision)
    },

    subscribe(ns, onExternalChange) {
      const ch = getChannel()
      if (!ch) return () => {}
      const listener = (event: MessageEvent) => {
        const msg = event.data as Partial<ChangeMessage> | null
        if (!msg || msg.sender === senderId || !isNamespace(msg.ns) || msg.ns !== ns || typeof msg.revision !== 'number') return
        onExternalChange(msg.revision)
      }
      ch.addEventListener('message', listener)
      return () => ch.removeEventListener('message', listener)
    },
  }
}
