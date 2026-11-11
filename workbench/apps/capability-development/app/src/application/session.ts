/**
 * The application session: the only thing that writes to storage.
 *
 * Its job is to make sure every command is computed from the latest persisted snapshot, so a
 * change calculated from a stale screen can never overwrite newer records. Every load, save and
 * clear goes through one queue, and every save carries the revision it expected to find.
 *
 * The queue, revision and generation handling is adapted from the JourneyProvider in
 * blackmath88/leader-me src/state/journey.tsx (commit 55114f3b). Here it is deliberately
 * framework-free: the React binding in ../ui/state.tsx only subscribes to it. That is what keeps
 * a different presentation from having to reimplement any of this. See ../../PROVENANCE.md.
 */
import type { ContentRegistry } from '~/content/registry'
import type { Clock, IdFactory } from '~/domain/ids'
import { emptyUserData } from '~/domain/empty'
import type { Namespace, RecordStore } from '~/storage/types'
import { StorageError } from '~/storage/types'
import type { UserData } from '~/domain/types'
import type { CommandDeps } from './ports'
import type { ApplyResult, CommandOutcome } from './results'

export type LoadStatus = 'loading' | 'ready' | 'error'

export interface SessionProblem {
  kind: StorageError['kind'] | 'command'
  message: string
}

export interface SessionState {
  status: LoadStatus
  namespace: Namespace
  data: UserData
  revision: number
  savedAt: string | null
  /** Last failure, shown visibly. Cleared by the next successful save or load. */
  problem: SessionProblem | null
  /** True when another tab saved a newer revision. Saves are blocked until reload. */
  stale: boolean
}

export interface AppSessionOptions {
  store: RecordStore
  content: ContentRegistry
  clock: Clock
  newId: IdFactory
  /** Seeded into the demo namespace the first time it is opened. */
  createDemoData?: () => UserData
  /** Where the chosen namespace is remembered. Absent in environments without localStorage. */
  rememberNamespace?: { get(): Namespace | null; set(ns: Namespace): void }
}

/** A command, as the session runs it. */
export type Command<T> = (data: UserData, deps: CommandDeps) => CommandOutcome<T>

function toProblem(error: unknown): SessionProblem {
  if (error instanceof StorageError) return { kind: error.kind, message: error.message }
  return { kind: 'unknown', message: error instanceof Error ? error.message : 'Unknown storage error.' }
}

export class AppSession {
  private listeners = new Set<(state: SessionState) => void>()
  private state: SessionState
  private readonly options: AppSessionOptions
  private readonly deps: CommandDeps
  /** Every operation runs through here, one at a time, so no write is computed from a stale base. */
  private queue: Promise<unknown> = Promise.resolve()
  /** The latest persisted snapshot of the namespace that is actually loaded. */
  private latest: { ns: Namespace; data: UserData; revision: number }
  /** Incremented on every namespace switch; results from an older generation are ignored. */
  private generation = 0
  /** The namespace the user asked for; may differ from `latest.ns` until its load succeeds. */
  private target: Namespace = 'personal'
  private unsubscribeStore: (() => void) | null = null

  constructor(options: AppSessionOptions) {
    this.options = options
    this.deps = { clock: options.clock, newId: options.newId, content: options.content }
    const data = emptyUserData(options.clock.now())
    this.state = {
      status: 'loading',
      namespace: 'personal',
      data,
      revision: 0,
      savedAt: null,
      problem: null,
      stale: false,
    }
    this.latest = { ns: 'personal', data, revision: 0 }
  }

  getState(): SessionState {
    return this.state
  }

  get content(): ContentRegistry {
    return this.options.content
  }

  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(patch: Partial<SessionState>): void {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener(this.state)
  }

  private enqueue<T>(op: () => Promise<T>): Promise<T> {
    const result = this.queue.then(op, op)
    this.queue = result.catch(() => undefined)
    return result
  }

  /** Opens the remembered namespace and starts watching for changes from other tabs. */
  async start(): Promise<void> {
    let ns: Namespace = 'personal'
    try {
      ns = this.options.rememberNamespace?.get() ?? 'personal'
    } catch {
      ns = 'personal'
    }
    this.generation += 1
    this.target = ns
    this.emit({ namespace: ns, status: 'loading' })
    await this.enqueue(() => this.loadNow(ns, this.generation))
    this.watch(ns)
  }

  private watch(ns: Namespace): void {
    this.unsubscribeStore?.()
    this.unsubscribeStore = this.options.store.subscribe(ns, (revision) => {
      if (revision !== this.latest.revision) this.emit({ stale: true })
    })
  }

  private async loadNow(ns: Namespace, generation: number): Promise<void> {
    try {
      let snapshot = await this.options.store.load(ns)
      if (ns === 'demo' && snapshot.revision === 0 && this.options.createDemoData) {
        snapshot = await this.options.store.save('demo', this.options.createDemoData(), snapshot.revision)
      }
      if (generation !== this.generation) return
      this.latest = { ns, data: snapshot.data, revision: snapshot.revision }
      this.emit({
        status: 'ready',
        namespace: ns,
        data: snapshot.data,
        revision: snapshot.revision,
        savedAt: snapshot.savedAt,
        problem: null,
        stale: false,
      })
    } catch (error) {
      if (generation !== this.generation) return
      this.emit({ status: 'error', problem: toProblem(error) })
    }
  }

  reload(): Promise<void> {
    const generation = this.generation
    this.emit({ status: 'loading' })
    return this.enqueue(() => this.loadNow(this.target, generation))
  }

  switchNamespace(ns: Namespace): Promise<void> {
    try {
      this.options.rememberNamespace?.set(ns)
    } catch {
      // Remembering the choice is not critical.
    }
    this.generation += 1
    this.target = ns
    const generation = this.generation
    this.emit({ namespace: ns, status: 'loading' })
    const result = this.enqueue(() => this.loadNow(ns, generation))
    this.watch(ns)
    return result
  }

  /**
   * Runs a command against the latest persisted snapshot and saves the result.
   *
   * The command is called inside the queued operation, never before it: that is what stops a
   * change calculated from an old screen from being written over newer records.
   */
  run<T>(command: Command<T>): Promise<ApplyResult<T>> {
    const generation = this.generation
    return this.enqueue(async (): Promise<ApplyResult<T>> => {
      if (generation !== this.generation) {
        const problem: SessionProblem = {
          kind: 'unknown',
          message: 'Not saved: you switched between your own records and the demo before this change was stored.',
        }
        this.emit({ problem })
        return { ok: false, kind: 'storage', errors: [problem.message] }
      }
      if (this.latest.ns !== this.target) {
        const message = 'Not saved: these records have not finished loading. Reload and try again.'
        this.emit({ problem: { kind: 'unknown', message } })
        return { ok: false, kind: 'storage', errors: [message] }
      }
      if (this.state.stale) {
        const message = 'Another tab saved newer changes. Reload to continue; nothing was overwritten.'
        this.emit({ problem: { kind: 'conflict', message } })
        return { ok: false, kind: 'conflict', errors: [message] }
      }
      const { ns, data: base, revision: expected } = this.latest
      const outcome = command(base, this.deps)
      if (!outcome.ok) {
        this.emit({ problem: { kind: 'command', message: outcome.errors[0] ?? 'The change was not accepted.' } })
        return outcome
      }
      try {
        const snapshot = await this.options.store.save(ns, outcome.data, expected)
        if (generation !== this.generation) {
          return { ok: true, value: outcome.value, revision: snapshot.revision, savedAt: snapshot.savedAt }
        }
        this.latest = { ns, data: snapshot.data, revision: snapshot.revision }
        this.emit({
          data: snapshot.data,
          revision: snapshot.revision,
          savedAt: snapshot.savedAt,
          problem: null,
        })
        return { ok: true, value: outcome.value, revision: snapshot.revision, savedAt: snapshot.savedAt }
      } catch (error) {
        const problem = toProblem(error)
        if (problem.kind === 'conflict') this.emit({ stale: true })
        this.emit({ problem })
        return { ok: false, kind: problem.kind === 'conflict' ? 'conflict' : 'storage', errors: [problem.message] }
      }
    })
  }

  /** Replaces every record in the active namespace. Used by a confirmed import. */
  replaceAll(data: UserData): Promise<ApplyResult<undefined>> {
    return this.run((_base) => ({ ok: true, data, value: undefined }))
  }

  /** Deletes every record in the active namespace. Restores the demo rather than emptying it. */
  deleteAll(): Promise<boolean> {
    const generation = this.generation
    const ns = this.target
    return this.enqueue(async () => {
      try {
        await this.options.store.clear(ns)
        if (ns === 'demo' && this.options.createDemoData) {
          const cleared = await this.options.store.load('demo')
          await this.options.store.save('demo', this.options.createDemoData(), cleared.revision)
        }
      } catch (error) {
        this.emit({ problem: toProblem(error) })
        return false
      }
      await this.loadNow(ns, generation)
      return true
    })
  }

  resetDemo(): Promise<ApplyResult<undefined>> | Promise<ApplyResult<undefined>> {
    if (this.latest.ns !== 'demo' || !this.options.createDemoData) {
      return Promise.resolve({ ok: false, kind: 'validation', errors: ['The demo can only be reset while you are looking at it.'] })
    }
    const create = this.options.createDemoData
    return this.run(() => ({ ok: true, data: create(), value: undefined }))
  }

  dispose(): void {
    this.unsubscribeStore?.()
    this.unsubscribeStore = null
    this.listeners.clear()
  }
}
