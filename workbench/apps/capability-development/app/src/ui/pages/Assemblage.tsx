/**
 * The assemblage: a composition you put together yourself, and a way back into your own records.
 *
 * Three rules shape this screen.
 *
 * It is complete on the first visit. Every piece, every palette and every marker design is
 * available immediately; nothing here is unlocked, levelled up or earned, and recording more
 * practice adds nothing to it. A sculpture that grew with your record count would be telling
 * people that their worth is their activity log.
 *
 * The canvas is never the only way to do anything. Choosing a piece, choosing where it goes,
 * turning it, placing it, removing it, undoing, reading a marker and resetting the view are all
 * ordinary labelled controls, and the piece list below the viewport carries the same selection
 * the canvas does. If the GPU path never starts, this screen still works completely.
 *
 * A marker is a way back to a record, not an assessment. It says what kind of experience it
 * points at — help, a turn, a disagreement — and selecting it opens the real record in the DOM.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { saveAssemblage } from '~/application/commands'
import {
  CATALOGUE,
  MARKER_DESIGNS,
  MARKER_DESIGN_IDS,
  PALETTES,
  PALETTE_IDS,
  PIECE_IDS,
  piece as pieceDefinition,
  type MarkerDesignId,
  type PaletteId,
  type PieceId,
} from '~/assemblage/catalogue'
import {
  addMarker,
  candidatesFor,
  groundCandidatesFor,
  placeOnContact,
  placeOnGround,
  removeMarker,
  removePiece,
  setMarkerHidden,
  setPalette,
  trayFor,
  turnPiece,
  type ComposeResult,
} from '~/assemblage/compose'
import { compositionFor, toStored } from '~/assemblage/storage'
import {
  compositionFileName,
  exportComposition,
  parseCompositionImport,
  type CompositionImportResult,
} from '~/assemblage/portability'
import { yawOf } from '~/assemblage/placement'
import { buildView } from '~/assemblage/view'
import type { AssemblageComposition } from '~/assemblage/types'
import type { EvidenceItem } from '~/domain/types'
import { APPEARANCE_DISCLAIMER } from '~/domain/experience'
import { Field, formatDateTime, PageHead, SaveStatus, useSave } from '../primitives'
import { href } from '../router'
import { useApp } from '../state'
import { Viewport, type RendererChoice, type ViewportStatus } from '../assemblage/Viewport'
import { EVIDENCE_LABEL } from './labels'

const MOTION_KEY = 'skilling-me-softly:assemblage-motion'
const RENDERER_KEY = 'skilling-me-softly:assemblage-renderer'
const UNDO_LIMIT = 20
const ORBIT_STEP = 12
const ORBIT_LIMIT = 34

const RENDERER_OPTIONS: readonly (readonly [RendererChoice, string, string])[] = [
  ['auto', 'Choose automatically', 'Tries WebGPU first, then WebGL 2, then falls back to the drawing.'],
  ['webgpu', 'WebGPU only', 'Falls back to the drawing if WebGPU is unavailable.'],
  ['webgl2', 'WebGL 2 only', 'Forces the WebGL 2 backend.'],
  ['static', 'Static drawing', 'No canvas and no GPU work at all.'],
]

/** A presentation preference, not a record: it is about this browser, not about this person. */
function readPreference<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key)
    return (allowed as readonly string[]).includes(stored ?? '') ? (stored as T) : fallback
  } catch {
    return fallback
  }
}

function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Remembering the choice is not critical. The setting still works for this visit.
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function AssemblagePage() {
  const { state, run } = useApp()
  const save = useSave({ latestOnly: true })

  const stored = state.data.profile.appearance?.assemblage
  const loaded = useMemo(() => compositionFor(stored), [stored])

  const [working, setWorking] = useState<AssemblageComposition | null>(null)
  const [undoStack, setUndoStack] = useState<AssemblageComposition[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)
  const [trayPiece, setTrayPiece] = useState<PieceId | ''>('')
  const [contactIndex, setContactIndex] = useState(0)
  const [refusal, setRefusal] = useState<string | null>(null)
  const [yaw, setYaw] = useState(0)
  const [settleToken, setSettleToken] = useState(0)
  const [status, setStatus] = useState<ViewportStatus>({ kind: 'static', backend: null, attempts: [], shadows: false })

  // The system preference wins when it is set: an explicit "off" cannot be overridden by this
  // app's own setting, and somebody who has not expressed a system preference gets motion until
  // they turn it off here.
  const [motionChoice, setMotionChoice] = useState<'on' | 'off'>(() =>
    readPreference(MOTION_KEY, ['on', 'off'] as const, 'on'),
  )
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    setReduced(prefersReducedMotion())
    try {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)')
      const onChange = () => setReduced(query.matches)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    } catch {
      return
    }
  }, [])
  const motion = motionChoice === 'on' && !reduced

  const [rendererChoice, setRendererChoice] = useState<RendererChoice>(() =>
    readPreference(RENDERER_KEY, ['auto', 'webgpu', 'webgl2', 'static'] as const, 'auto'),
  )

  const composition = working ?? (loaded.ok ? loaded.composition : null)
  const view = useMemo(() => (composition ? buildView(composition) : null), [composition])

  const evidenceById = useMemo(() => {
    const map = new Map<string, EvidenceItem>()
    for (const item of state.data.evidence) map.set(item.id, item)
    return map
  }, [state.data.evidence])

  const persist = useCallback(
    (next: AssemblageComposition) =>
      void save.run(async () => {
        const result = await run((data, deps) => saveAssemblage(data, toStored(next), deps))
        return result.ok ? { ok: true } : { ok: false, errors: result.errors }
      }),
    [run, save],
  )

  /** Applies a composition operation: refusals are shown, acceptances are saved and settle. */
  const apply = useCallback(
    (result: ComposeResult, options: { settle?: boolean } = {}) => {
      if (!result.ok) {
        setRefusal(result.message)
        return false
      }
      setRefusal(null)
      setUndoStack((stack) => (composition ? [...stack, composition].slice(-UNDO_LIMIT) : stack))
      setWorking(result.composition)
      persist(result.composition)
      if (options.settle !== false) setSettleToken((token) => token + 1)
      return true
    },
    [composition, persist],
  )

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      const previous = stack[stack.length - 1]
      if (!previous) return stack
      setWorking(previous)
      setRefusal(null)
      persist(previous)
      setSettleToken((token) => token + 1)
      return stack.slice(0, -1)
    })
  }, [persist])

  // ---------------------------------------------------------------- placement options

  const tray = useMemo(() => (composition ? trayFor(composition, PIECE_IDS) : []), [composition])

  const contacts = useMemo(() => {
    if (!composition || trayPiece === '') return []
    const onPieces = candidatesFor(composition, trayPiece).map((c) => ({
      key: `${c.parentInstanceId}/${c.receiverFrameId}/${c.restingFrameId}`,
      label: c.label,
      place: () =>
        placeOnContact(composition, {
          instanceId: freshInstanceId(composition, trayPiece),
          pieceId: trayPiece,
          parentInstanceId: c.parentInstanceId,
          receiverFrameId: c.receiverFrameId,
          restingFrameId: c.restingFrameId,
          orientationIndex: c.orientationIndex,
        }),
    }))
    const onGround = groundCandidatesFor(composition, trayPiece).map((c) => ({
      key: `ground/${c.groundX}/${c.groundZ}/${c.restingFrameId}`,
      label: c.label,
      place: () =>
        placeOnGround(composition, {
          instanceId: freshInstanceId(composition, trayPiece),
          pieceId: trayPiece,
          restingFrameId: c.restingFrameId,
          orientationIndex: c.orientationIndex,
          groundX: c.groundX,
          groundZ: c.groundZ,
        }),
    }))
    return [...onPieces, ...onGround]
  }, [composition, trayPiece])

  useEffect(() => setContactIndex(0), [trayPiece])

  const selectedPiece = composition?.pieces.find((p) => p.instanceId === selected) ?? null
  const selectedDefinition = selectedPiece ? pieceDefinition(selectedPiece.pieceId) : undefined
  const markerRecord = selectedMarker
    ? composition?.pieces.flatMap((p) => p.markers).find((m) => m.id === selectedMarker) ?? null
    : null
  const markerEvidence = markerRecord?.evidenceId ? evidenceById.get(markerRecord.evidenceId) ?? null : null

  const description = view ? describeComposition(view.pieces.length, composition?.paletteId ?? '') : 'No pieces'

  if (!composition || !view) {
    return (
      <div className="stack">
        <PageHead kicker="Your assemblage" title="This composition could not be opened" />
        <section className="panel panel--error" role="alert">
          <h2>What is wrong</h2>
          <ul>{loaded.ok ? null : loaded.errors.map((error) => <li key={error}>{error}</li>)}</ul>
          <p>
            Nothing has been changed and no record has been touched. The composition is a cosmetic
            choice stored alongside your records; your situations, activities and evidence are
            unaffected and every other screen works normally.
          </p>
          <button type="button" onClick={() => apply({ ok: true, composition: compositionFor(undefined).ok ? (compositionFor(undefined) as { composition: AssemblageComposition }).composition : (null as never) })}>
            Start again from the standard composition
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="stack">
      <PageHead kicker="Your assemblage" title="A composition that is yours">
        <p>
          Six pieces, four palettes and three kinds of marker, all available now. Putting them
          together differently changes nothing about what your records say, and recording more
          practice adds nothing here. {APPEARANCE_DISCLAIMER}
        </p>
      </PageHead>

      {loaded.ok && loaded.notes.length > 0 ? (
        <div className="banner banner--stale" role="status">
          <p>{loaded.notes.join(' ')}</p>
        </div>
      ) : null}

      <section className="panel assemblage-panel">
        <Viewport
          view={view}
          choice={rendererChoice}
          motion={motion}
          yaw={yaw}
          selectedInstanceId={selected}
          description={description}
          settleToken={settleToken}
          onSelectPiece={(id) => {
            setSelected(id)
            setSelectedMarker(null)
          }}
          onSelectMarker={(id) => setSelectedMarker(id)}
          onStatus={setStatus}
        />
        <div className="row assemblage-camera">
          <button type="button" className="btn-quiet" onClick={() => setYaw((y) => Math.max(-ORBIT_LIMIT, y - ORBIT_STEP))} disabled={yaw <= -ORBIT_LIMIT}>
            Turn the view left
          </button>
          <button type="button" className="btn-quiet" onClick={() => setYaw((y) => Math.min(ORBIT_LIMIT, y + ORBIT_STEP))} disabled={yaw >= ORBIT_LIMIT}>
            Turn the view right
          </button>
          <button type="button" className="btn-quiet" onClick={() => setYaw(0)} disabled={yaw === 0}>
            Reset the view
          </button>
          <p className="meta" role="status">
            {status.kind === 'live'
              ? `Drawn by the ${status.backend === 'webgpu' ? 'WebGPU' : 'WebGL 2'} renderer.`
              : status.kind === 'starting'
                ? 'Starting the renderer…'
                : status.kind === 'failed'
                  ? 'The renderer did not start. This is the static drawing; everything still works.'
                  : 'Static drawing.'}
          </p>
        </div>
        {refusal ? (
          <p className="save-status save-status--failed" role="alert">
            {refusal}
          </p>
        ) : null}
        <SaveStatus state={save.state} />
      </section>

      {/* ---------------------------------------------------------------- place */}
      <section className="panel">
        <h2>Add a piece</h2>
        {tray.length === 0 ? (
          <p className="empty">
            Every piece is on display. Remove one below to put it back in the tray — removing a
            piece from the composition does not delete anything you have recorded.
          </p>
        ) : (
          <>
            <Field label="A piece from the tray" hint="All six are available from your first visit.">
              <select value={trayPiece} onChange={(event) => setTrayPiece(event.target.value as PieceId | '')}>
                <option value="">Choose a piece…</option>
                {tray.map((id) => (
                  <option key={id} value={id}>
                    {CATALOGUE[id].title}
                  </option>
                ))}
              </select>
            </Field>
            {trayPiece === '' ? null : (
              <>
                <p className="meta">{CATALOGUE[trayPiece].description}</p>
                {contacts.length === 0 ? (
                  <p className="empty">
                    There is nowhere this piece can go at the moment. Every contact position that
                    carries it is occupied, or the piece would meet something already placed.
                  </p>
                ) : (
                  <>
                    <Field
                      label="Where it goes"
                      hint="Only contact positions that are free and that carry this piece are offered."
                    >
                      <select value={contactIndex} onChange={(event) => setContactIndex(Number(event.target.value))}>
                        {contacts.map((contact, index) => (
                          <option key={contact.key} value={index}>
                            {contact.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <button
                      type="button"
                      onClick={() => {
                        const contact = contacts[contactIndex]
                        if (!contact) return
                        if (apply(contact.place())) {
                          setTrayPiece('')
                          setSelected(null)
                        }
                      }}
                    >
                      Place it here
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------- pieces on display */}
      <section className="panel">
        <h2>Pieces on display</h2>
        <p className="hint">
          This list carries the same selection as the picture above, so the composition can be
          worked on entirely from here.
        </p>
        <ul className="record-list assemblage-list">
          {composition.pieces.map((placed) => {
            const definition = pieceDefinition(placed.pieceId)
            const isSelected = placed.instanceId === selected
            return (
              <li key={placed.instanceId} className={isSelected ? 'is-selected' : ''}>
                <div className="row">
                  <button
                    type="button"
                    className="btn-link assemblage-list__name"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelected(isSelected ? null : placed.instanceId)
                      setSelectedMarker(null)
                    }}
                  >
                    {definition?.title ?? placed.pieceId}
                  </button>
                  {isSelected ? <span className="tag">Selected</span> : null}
                  {placed.parentInstanceId === null ? <span className="tag">On the ground</span> : null}
                </div>
                <p className="meta">
                  {placed.parentInstanceId === null
                    ? 'Standing on the ground.'
                    : `Resting on the ${contactLabel(composition, placed.parentInstanceId, placed.receiverFrameId)}.`}{' '}
                  {definition ? `Turned ${Math.round(yawOf(definition, placed.orientationIndex))}°.` : null}{' '}
                  {placed.markers.length > 0
                    ? `${placed.markers.length} marker${placed.markers.length === 1 ? '' : 's'}.`
                    : 'No markers.'}
                </p>
                {placed.markers.length > 0 ? (
                  <ul className="assemblage-markers">
                    {placed.markers.map((marker) => (
                      <li key={marker.id}>
                        <button
                          type="button"
                          className="btn-link"
                          aria-pressed={marker.id === selectedMarker}
                          onClick={() => setSelectedMarker(marker.id === selectedMarker ? null : marker.id)}
                        >
                          {MARKER_DESIGNS[marker.designId].title}
                        </button>{' '}
                        <span className="meta">
                          {MARKER_DESIGNS[marker.designId].meaning}
                          {marker.hidden ? ' Hidden from the picture.' : ''}
                          {marker.evidenceId === null ? ' The record it pointed at has been deleted.' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- selected piece */}
      {selectedPiece && selectedDefinition ? (
        <section className="panel panel--accent">
          <h2>{selectedDefinition.title}</h2>
          <p className="meta">{selectedDefinition.description}</p>
          <div className="row">
            <button type="button" className="btn-quiet" onClick={() => apply(turnPiece(composition, selectedPiece.instanceId, -1))}>
              Turn it back
            </button>
            <button type="button" className="btn-quiet" onClick={() => apply(turnPiece(composition, selectedPiece.instanceId, 1))}>
              Turn it on
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                if (apply(removePiece(composition, selectedPiece.instanceId))) setSelected(null)
              }}
            >
              Take it off display
            </button>
          </div>
          <p className="meta">
            It can be turned to {selectedDefinition.orientations.length} orientations. Taking a
            piece off display also takes off anything resting on it, and returns them to the tray.
            Nothing you have recorded is deleted by this.
          </p>
          <AddMarker
            composition={composition}
            instanceId={selectedPiece.instanceId}
            evidence={state.data.evidence}
            onApply={apply}
          />
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- marker and its record */}
      {markerRecord ? (
        <section className="panel" aria-live="polite">
          <h2>{MARKER_DESIGNS[markerRecord.designId].title}</h2>
          <p className="hint">{MARKER_DESIGNS[markerRecord.designId].meaning}</p>
          {markerEvidence ? (
            <>
              <dl className="pairs">
                <dt>Kind</dt>
                <dd>{EVIDENCE_LABEL[markerEvidence.kind]}</dd>
                {markerEvidence.attribution ? (
                  <>
                    <dt>Attributed to</dt>
                    <dd>{markerEvidence.attribution}</dd>
                  </>
                ) : null}
                <dt>Recorded</dt>
                <dd>{formatDateTime(markerEvidence.recordedAt)}</dd>
              </dl>
              <blockquote className="assemblage-evidence">{markerEvidence.text}</blockquote>
              <p className="meta">
                This is your own record, shown here in the page rather than in the picture.{' '}
                <a href={href({ name: 'records' })}>Open it among all records</a>
                {markerEvidence.activityId ? (
                  <>
                    {' '}· <a href={href({ name: 'activity', id: markerEvidence.activityId })}>open the activity it belongs to</a>
                  </>
                ) : null}
                .
              </p>
            </>
          ) : markerRecord.evidenceId === null ? (
            <p>
              The record this marker pointed at has been deleted. The marker was kept, as a piece
              of decoration you chose, and nothing has been put in the record&apos;s place.
            </p>
          ) : (
            <p role="alert">
              This marker points at a record that is not in this namespace. Nothing has been
              substituted for it.
            </p>
          )}
          <div className="row">
            <button
              type="button"
              className="btn-quiet"
              onClick={() => apply(setMarkerHidden(composition, markerRecord.id, !markerRecord.hidden), { settle: false })}
            >
              {markerRecord.hidden ? 'Show it in the picture' : 'Hide it from the picture'}
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                if (apply(removeMarker(composition, markerRecord.id), { settle: false })) setSelectedMarker(null)
              }}
            >
              Remove this marker
            </button>
          </div>
          <p className="meta">
            Hiding or removing a marker changes the picture only. The record it points at stays
            exactly where it is.
          </p>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- undo, palette, motion */}
      <section className="panel">
        <h2>Changing your mind</h2>
        <div className="row">
          <button type="button" onClick={undo} disabled={undoStack.length === 0}>
            Undo the last change
          </button>
          <span className="meta">
            {undoStack.length === 0
              ? 'Nothing to undo yet.'
              : `${undoStack.length} change${undoStack.length === 1 ? '' : 's'} can be undone, in this visit.`}
          </span>
        </div>
      </section>

      <section className="panel">
        <h2>Palette</h2>
        <fieldset>
          <legend className="visually-hidden">Choose a palette</legend>
          <ul className="choice-list">
            {PALETTE_IDS.map((id) => (
              <li key={id}>
                <label className="check">
                  <input
                    type="radio"
                    name="palette"
                    checked={composition.paletteId === id}
                    onChange={() => apply(setPalette(composition, id), { settle: false })}
                  />
                  <span>
                    <strong>{PALETTES[id].title}</strong>
                    <span className="assemblage-swatches" aria-hidden="true">
                      {PALETTES[id].bodies.map((colour, index) => (
                        <span key={`${id}-${index}`} style={{ background: colour }} />
                      ))}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <p className="meta">
          A palette is a colour choice and nothing else. No palette means anything, and the piece
          shapes carry the composition on their own in any of them.
        </p>
      </section>

      <section className="panel">
        <h2>Motion and drawing</h2>
        <fieldset>
          <legend>Motion</legend>
          <ul className="choice-list">
            {(
              [
                ['on', 'Settle briefly'],
                ['off', 'No motion at all'],
              ] as const
            ).map(([value, label]) => (
              <li key={value}>
                <label className="check">
                  <input
                    type="radio"
                    name="assemblage-motion"
                    aria-describedby="assemblage-motion-hint"
                    checked={motionChoice === value}
                    onChange={() => {
                      setMotionChoice(value)
                      writePreference(MOTION_KEY, value)
                    }}
                  />
                  <strong>{label}</strong>
                </label>
              </li>
            ))}
          </ul>
          <p className="meta" id="assemblage-motion-hint">
            {reduced
              ? 'Your system is set to reduce motion, so nothing here moves whatever this is set to.'
              : 'Nothing moves on its own. The only animation is a short settle after you place or turn a piece, and it stops.'}{' '}
            This choice is remembered in this browser.
          </p>
        </fieldset>
        <fieldset>
          <legend>How it is drawn</legend>
          <ul className="choice-list">
            {RENDERER_OPTIONS.map(([value, label, hint]) => (
              <li key={value}>
                {/*
                  The hint sits outside the label and is referenced by aria-describedby. Inside the
                  label it would become part of the radio's accessible name, so every option would
                  be announced as a paragraph and three of them would contain the words "static
                  drawing" — which is exactly how a test first noticed it.
                */}
                <label className="check">
                  <input
                    type="radio"
                    name="assemblage-renderer"
                    aria-describedby={`renderer-hint-${value}`}
                    checked={rendererChoice === value}
                    onChange={() => {
                      setRendererChoice(value)
                      writePreference(RENDERER_KEY, value)
                    }}
                  />
                  <strong>{label}</strong>
                </label>
                <p className="meta choice-hint" id={`renderer-hint-${value}`}>
                  {hint}
                </p>
              </li>
            ))}
          </ul>
        </fieldset>
        {status.attempts.length > 0 ? (
          <>
            <h3>What the renderer reported</h3>
            <ul className="meta">
              {status.attempts.map((attempt, index) => (
                <li key={`${attempt.backend}-${index}`}>
                  {attempt.backend === 'webgpu' ? 'WebGPU' : 'WebGL 2'} — {attempt.stage}: {attempt.message}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="meta" data-testid="assemblage-backend">
          {status.kind === 'live' ? `backend=${status.backend} shadows=${status.shadows ? 'on' : 'off'}` : `backend=none state=${status.kind}`}
        </p>
      </section>

      <CompositionPortability composition={composition} onApply={apply} />

      <section className="panel panel--quiet">
        <h2>What the picture is given</h2>
        <p className="hint">
          Shown so the boundary is checkable rather than asserted. The renderer receives shapes,
          positions, colours and opaque marker identifiers. It is given no journal text, no
          situation, no feedback and no evidence: resolving a marker into the record above happens
          in the page, not in the picture.
        </p>
        <pre>{JSON.stringify(rendererPayloadSummary(view), null, 2)}</pre>
      </section>
    </div>
  )
}

// ------------------------------------------------------------------ helpers

function freshInstanceId(composition: AssemblageComposition, pieceId: string): string {
  const used = new Set(composition.pieces.map((p) => p.instanceId))
  let n = 1
  let candidate = pieceId
  while (used.has(candidate)) {
    n += 1
    candidate = `${pieceId}-${n}`
  }
  return candidate
}

function contactLabel(composition: AssemblageComposition, parentInstanceId: string, frameId: string | null): string {
  const parent = composition.pieces.find((p) => p.instanceId === parentInstanceId)
  const definition = parent ? pieceDefinition(parent.pieceId) : undefined
  const frame = definition?.frames.find((f) => f.id === frameId)
  if (!definition || !frame) return 'piece below it'
  return `${frame.label.toLowerCase()} of the ${definition.title.toLowerCase()}`
}

function describeComposition(count: number, paletteId: string): string {
  const palette = PALETTES[paletteId as PaletteId]
  return `An assemblage of ${count} faceted pieces on a plain ground, in the ${palette ? palette.title.toLowerCase() : 'chosen'} palette. The list below the picture names every piece and where it rests.`
}

/** A compact summary, so the privacy claim can be read rather than taken on trust. */
function rendererPayloadSummary(view: ReturnType<typeof buildView>) {
  return {
    groundColour: view.groundColour,
    accentColour: view.accentColour,
    pieces: view.pieces.map((p) => ({
      instanceId: p.instanceId,
      pieceId: p.pieceId,
      bodyColour: p.bodyColour,
      triangles: p.definition.mesh.triangles,
      markers: p.markers.map((m) => ({ id: m.id, shape: m.shape })),
    })),
  }
}

function AddMarker({
  composition,
  instanceId,
  evidence,
  onApply,
}: {
  composition: AssemblageComposition
  instanceId: string
  evidence: readonly EvidenceItem[]
  onApply: (result: ComposeResult, options?: { settle?: boolean }) => boolean
}) {
  const [design, setDesign] = useState<MarkerDesignId>('linked-loop')
  const [evidenceId, setEvidenceId] = useState('')
  const counter = useRef(0)

  if (evidence.length === 0) {
    return (
      <p className="meta">
        A marker points at a piece of evidence you have recorded. There is none in these records
        yet, so there is nothing for a marker to point at.{' '}
        <a href={href({ name: 'records' })}>Records</a>
      </p>
    )
  }

  return (
    <div className="assemblage-add-marker">
      <h3>Put a marker on this piece</h3>
      <p className="meta">
        A marker is a way back to one of your own records. It is not a score and not a badge, and
        placing one records nothing new.
      </p>
      <Field label="Which kind">
        <select value={design} onChange={(event) => setDesign(event.target.value as MarkerDesignId)}>
          {MARKER_DESIGN_IDS.map((id) => (
            <option key={id} value={id}>
              {MARKER_DESIGNS[id].title} — {MARKER_DESIGNS[id].meaning}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Which record it points at">
        <select value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}>
          <option value="">Choose a record…</option>
          {evidence.map((item) => (
            <option key={item.id} value={item.id}>
              {EVIDENCE_LABEL[item.kind]}: {item.text.slice(0, 70)}
              {item.text.length > 70 ? '…' : ''}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="button"
        disabled={evidenceId === ''}
        onClick={() => {
          counter.current += 1
          onApply(
            addMarker(composition, {
              instanceId,
              markerId: `marker-${instanceId}-${Date.now()}-${counter.current}`,
              designId: design,
              evidenceId,
            }),
            { settle: false },
          )
          setEvidenceId('')
        }}
      >
        Add the marker
      </button>
    </div>
  )
}

/**
 * Carrying the composition on its own.
 *
 * Separate from the records export on the Settings page, and the copy below says so plainly: a
 * person who wants their sculpture in another browser should not have to export their journal to
 * get it there, and a person exporting their records should not have to wonder whether a
 * sculpture came along. An import here is validated before anything is replaced, and it replaces
 * the composition only.
 */
function CompositionPortability({
  composition,
  onApply,
}: {
  composition: AssemblageComposition
  onApply: (result: ComposeResult, options?: { settle?: boolean }) => boolean
}) {
  const [result, setResult] = useState<CompositionImportResult | null>(null)

  return (
    <section className="panel">
      <h2>This composition on its own</h2>
      <p className="hint">
        A file with the shapes, their positions and the palette in it — and the opaque identifiers
        of any markers, which only mean something next to your own records. It carries no
        situation, no activity, no review and no evidence. Exporting all of your records, from the{' '}
        <a href={href({ name: 'settings' })}>Settings page</a>, is a different file and a different
        decision.
      </p>
      <div className="row">
        <button
          type="button"
          className="btn-quiet"
          onClick={() => {
            const blob = new Blob([exportComposition(composition)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = compositionFileName()
            link.click()
            URL.revokeObjectURL(url)
          }}
        >
          Export this composition
        </button>
        <label className="btn-quiet assemblage-file">
          Choose a composition file…
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              setResult(parseCompositionImport(await file.text()))
            }}
          />
        </label>
      </div>
      {result?.ok === false ? (
        <div role="alert">
          <p className="save-status save-status--failed">That file was not used. Nothing has changed.</p>
          <ul className="error-list">
            {result.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {result?.ok ? (
        <div className="panel panel--caution">
          <p>
            This file holds a composition of {result.composition.pieces.length}{' '}
            {result.composition.pieces.length === 1 ? 'piece' : 'pieces'}. Using it replaces the
            composition you have now. No record of any kind is touched.
          </p>
          {result.notes.length > 0 ? <p className="meta">{result.notes.join(' ')}</p> : null}
          <div className="row">
            <button
              type="button"
              onClick={() => {
                onApply({ ok: true, composition: result.composition })
                setResult(null)
              }}
            >
              Replace my composition with it
            </button>
            <button type="button" className="btn-quiet" onClick={() => setResult(null)}>
              Keep what I have
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
