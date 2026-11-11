/**
 * Shared interface pieces. No domain logic lives here.
 *
 * `useSave` and `ConfirmButton` are adapted from blackmath88/leader-me src/components/ui.tsx
 * (commit 55114f3b). "Saved" is shown only when the session actually reported a save, because a
 * save status that lies is worse than none.
 */
import { cloneElement, isValidElement, useId, useRef, useState, type ReactElement, type ReactNode } from 'react'
import type { EvidenceStage } from '~/domain/evidence'
import { EVIDENCE_STAGES, STAGE_LABEL } from '~/domain/evidence'
import type { ActivityKind, DevelopmentRoute } from '~/domain/types'
import { useApp } from './state'

const dateFmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateTimeFmt.format(date)
}

/** Formats YYYY-MM-DD without shifting time zones. */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return dateFmt.format(new Date(y, m - 1, d))
}

export const ROUTE_LABEL: Record<DevelopmentRoute, string> = {
  'personal-practice': 'Your own practice',
  'shared-practice': 'Shared practice',
  conditions: 'Conditions',
}

export const KIND_LABEL: Record<ActivityKind, string> = {
  observation: 'Observation',
  rehearsal: 'Rehearsal',
  'real-attempt': 'Real attempt',
}

export function RouteTag({ route }: { route: DevelopmentRoute }) {
  return <span className={`tag${route === 'conditions' ? ' tag--conditions' : ''}`}>{ROUTE_LABEL[route]}</span>
}

/** A rehearsal is always marked as one, everywhere it appears. */
export function KindTag({ kind }: { kind: ActivityKind }) {
  const modifier = kind === 'rehearsal' ? ' tag--rehearsal' : kind === 'real-attempt' ? ' tag--real' : ''
  return <span className={`tag${modifier}`}>{KIND_LABEL[kind]}</span>
}

/** Non-colour marker: filled marks out of five, with the label always present as text. */
export function StageMark({ stage }: { stage: EvidenceStage }) {
  const level = EVIDENCE_STAGES.indexOf(stage)
  return (
    <span className="stage">
      <span className="stage__marks" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (i <= level ? '◆' : '◇')).join('')}
      </span>
      <span className="stage__label">{STAGE_LABEL[stage]}</span>
    </span>
  )
}

/** Renders children only once storage is ready; otherwise a calm loading state or an error panel. */
export function StatusGate({ children }: { children: ReactNode }) {
  const { state, session } = useApp()
  if (state.status === 'loading') {
    return (
      <p className="loading" role="status">
        Opening your records…
      </p>
    )
  }
  if (state.status === 'error') {
    return (
      <section className="panel panel--error" role="alert">
        <h2>Your records could not be opened</h2>
        <p>{state.problem?.message ?? 'Browser storage is unavailable.'}</p>
        <p>
          Everything is stored in this browser using IndexedDB. Private browsing, or blocked site data, can prevent
          that. Nothing has been changed.
        </p>
        <button type="button" onClick={() => void session.reload()}>
          Try again
        </button>
      </section>
    )
  }
  return <>{children}</>
}

export type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'failed'; errors: string[] }

/**
 * Tracks a save action. `latestOnly` is for saves where each replaces the previous one, so an
 * earlier success cannot mask a pending change.
 */
export function useSave({ latestOnly = false }: { latestOnly?: boolean } = {}) {
  const [state, setState] = useState<SaveState>({ kind: 'idle' })
  const latest = useRef(0)
  const run = async (op: () => Promise<{ ok: boolean; errors?: string[] }>): Promise<boolean> => {
    const id = ++latest.current
    setState({ kind: 'saving' })
    const result = await op()
    if (!latestOnly || id === latest.current) {
      setState(result.ok ? { kind: 'saved' } : { kind: 'failed', errors: result.errors ?? [] })
    }
    return result.ok
  }
  return {
    state,
    run,
    reset: () => {
      latest.current += 1
      setState({ kind: 'idle' })
    },
  }
}

export function SaveStatus({ state }: { state: SaveState }) {
  const { state: session } = useApp()
  let text = ''
  if (state.kind === 'saving') text = 'Saving…'
  if (state.kind === 'saved') text = 'Saved in this browser.'
  if (state.kind === 'failed') {
    text = state.errors[0] ?? session.problem?.message ?? 'Not saved. Storage refused the change.'
  }
  return (
    <>
      <p className={`save-status save-status--${state.kind}`} role="status" aria-live="polite">
        {text}
      </p>
      {state.kind === 'failed' && state.errors.length > 1 ? (
        <ul className="error-list">
          {state.errors.slice(1).map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

/** Two-step confirmation for anything that destroys a record. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className,
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  className?: string
}) {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <button type="button" className={className ?? 'btn-quiet'} onClick={() => setArmed(true)}>
        {label}
      </button>
    )
  }
  return (
    <span className="confirm" role="group" aria-label={`Confirm: ${label}`}>
      <button
        type="button"
        className="btn-danger"
        onClick={() => {
          setArmed(false)
          onConfirm()
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="btn-quiet" onClick={() => setArmed(false)}>
        Keep it
      </button>
    </span>
  )
}

export function PageHead({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header>
      <p className="kicker">{kicker}</p>
      <h1>{title}</h1>
      {children ? <div className="lede">{children}</div> : null}
    </header>
  )
}

/**
 * A labelled form control.
 *
 * The label is associated with its control through `htmlFor`/`id`, and a hint through
 * `aria-describedby`. That association is the whole point of the component: a `<label>` sitting
 * next to an input with no `for` reads to a screen reader as loose text, and clicking it does
 * nothing. The id is generated, so no caller has to invent unique ones.
 */
export function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string
  hint?: string
  optional?: boolean
  children: ReactNode
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, {
        id,
        ...(hint ? { 'aria-describedby': hintId } : {}),
      })
    : children
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional ? <span className="optional"> (optional)</span> : null}
      </label>
      {hint ? (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {control}
    </div>
  )
}
