/**
 * Storage contract.
 *
 * Adapted from blackmath88/leader-me src/storage/types.ts (commit 55114f3b). The revision-based
 * compare-and-set contract, the namespace split and the error taxonomy are carried over verbatim
 * in intent: they are what stops a stale tab from overwriting newer records.
 */
import type { CollectionKey, UserData } from '~/domain/types'

/**
 * Personal records and fictional demo records never share a namespace.
 * This is record separation inside one browser, NOT tenant isolation and NOT access control.
 */
export type Namespace = 'personal' | 'demo'

export const NAMESPACES: readonly Namespace[] = ['personal', 'demo']

export interface StoredSnapshot {
  data: UserData
  /** Monotonic revision, incremented on every successful save. 0 = nothing stored yet. */
  revision: number
  savedAt: string | null
}

export type StorageErrorKind =
  /** IndexedDB missing or blocked (private mode, disabled site data, no browser). */
  | 'unavailable'
  /** Another tab saved a newer revision. Nothing was overwritten. */
  | 'conflict'
  | 'quota'
  | 'unknown'

export class StorageError extends Error {
  readonly kind: StorageErrorKind
  constructor(kind: StorageErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.kind = kind
    this.name = 'StorageError'
  }
}

export interface RecordStore {
  /**
   * Returns an empty snapshot (revision 0) when nothing is stored. Rejects with StorageError.
   *
   * Every snapshot a store returns is the caller's own copy: mutating it must not change what a
   * later load returns, and must not change what is stored. Both implementations clone, so an
   * aliasing bug cannot hide behind whichever store the tests happen to use.
   */
  load(ns: Namespace): Promise<StoredSnapshot>
  /**
   * Atomically replaces the namespace's data if the stored revision equals expectedRevision.
   * Resolves with the new snapshot. Rejects with StorageError('conflict') when another tab saved
   * first; never silently overwrites.
   */
  save(ns: Namespace, data: UserData, expectedRevision: number): Promise<StoredSnapshot>
  /** Empties the namespace by storing empty data at the next revision (revisions never go back). */
  clear(ns: Namespace): Promise<void>
  /** Notifies when another tab changed the namespace. Returns an unsubscribe function. */
  subscribe(ns: Namespace, onExternalChange: (revision: number) => void): () => void
}

export type ImportResult =
  | { ok: true; data: UserData; summary: ImportSummary }
  | { ok: false; errors: string[] }

export interface ImportSummary {
  /** Export format version of the file. */
  schemaVersion: number
  exportedAt: string | null
  /** Which application wrote the file. */
  sourceApp: string
  /** True when the file came from Leader Me and was converted on read. */
  converted: boolean
  counts: Record<CollectionKey, number>
  /** Human-readable notes about what the conversion did or dropped. */
  notes: string[]
}

/** Versioned export envelope. Its schemaVersion is the export format version. */
export interface ExportEnvelope {
  app: 'skilling-me-softly'
  schemaVersion: number
  exportedAt: string
  data: UserData
}
