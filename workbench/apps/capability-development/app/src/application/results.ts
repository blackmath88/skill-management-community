import type { UserData } from '~/domain/types'

export type FailureKind =
  /** The input itself is not acceptable. */
  | 'validation'
  /** A referenced record or content definition does not exist. */
  | 'not-found'
  /** The record exists but cannot move this way. */
  | 'illegal-transition'
  /** Storage holds a newer revision. Nothing was written. */
  | 'conflict'
  /** Storage refused the write. */
  | 'storage'

export interface CommandFailure {
  ok: false
  kind: FailureKind
  /** Shown to the user. Written to be read by a person, not a log. */
  errors: string[]
}

export interface CommandSuccess<T> {
  ok: true
  /** The next record set. Commands never mutate the input. */
  data: UserData
  value: T
}

export type CommandOutcome<T = undefined> = CommandSuccess<T> | CommandFailure

export function fail(kind: FailureKind, ...errors: string[]): CommandFailure {
  return { ok: false, kind, errors }
}

export function ok<T>(data: UserData, value: T): CommandSuccess<T> {
  return { ok: true, data, value }
}

/** Outcome of running a command through the session: adds the persisted revision. */
export type ApplyResult<T> =
  | { ok: true; value: T; revision: number; savedAt: string | null }
  | CommandFailure
