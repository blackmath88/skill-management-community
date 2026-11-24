import { useState } from 'react'
import { useApp } from '~/ui/state'
import { saveAssemblage } from '~/application/assemblage'
import { href } from '~/ui/router'
import {
  appearanceExport,
  CATALOGUE,
  initialComposition,
  PALETTES,
  parseComposition,
  part,
  placements,
  removePiece,
  type Composition,
  type Instance,
  type Marker,
  type PartId,
} from './model'
import { Viewport } from './Viewport'
import type { Backend, SceneInput } from './renderer'
const EXAMPLES = {
  help: {
    name: 'With a little help',
    text: 'Example: a colleague helped prepare a difficult conversation. The useful question is what support to ask for next time.',
  },
  adapt: {
    name: 'A different route',
    text: 'Example: the attempt did not resolve the issue. It did reveal who could make the next decision.',
  },
  voices: {
    name: 'More than one view',
    text: 'Example: one person found the explanation clear; another needed a concrete example. Both accounts remain visible.',
  },
}
export function Studio() {
  const { state } = useApp()
  return <StudioSession key={state.namespace} />
}
function StudioSession() {
  const { state, run } = useApp()
  const composition = state.data.profile.assemblage ?? initialComposition()
  const [selected, setSelected] = useState('')
  const [draft, setDraft] = useState<Instance | null>(null)
  const [undo, setUndo] = useState<Composition[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('All six forms are yours from the start.')
  const [raw, setRaw] = useState('')
  const [azimuth, setAzimuth] = useState(0.48)
  const [retry, setRetry] = useState(0)
  const [backend, setBackend] = useState<Backend>(() => {
    const mode = new URLSearchParams(location.search).get('renderer')
    return mode === 'webgl' || mode === 'static' ? mode : 'auto'
  })
  const selectedPiece = composition.pieces.find((p) => p.id === selected)
  const marker = composition.markers.find((m) => m.id === selected)
  const evidence = marker?.evidenceId
    ? state.data.evidence.find((e) => e.id === marker.evidenceId)
    : undefined
  const sourceExample = marker?.exampleId ? EXAMPLES[marker.exampleId] : undefined
  const [evidenceId, setEvidenceId] = useState('')
  const [motif, setMotif] = useState<Marker['motif']>('loop')
  const available = draft ? placements(composition, draft.partId) : []
  const display = draft
    ? {
        ...composition,
        pieces: [...composition.pieces, draft],
        tray: composition.tray.filter((p) => p.partId !== draft.partId),
      }
    : composition
  const input: SceneInput = {
    composition: {
      ...display,
      markers: display.markers.map(({ evidenceId: _evidence, exampleId: _example, ...marker }) => marker),
    },
    selected: draft?.id ?? selected,
    azimuth,
    ...(draft ? { preview: draft.id } : {}),
  }
  async function commit(next: Composition, undoing = false) {
    if (busy) return
    try {
      parseComposition(next)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Invalid arrangement')
      return
    }
    setBusy(true)
    setMessage('Saving…')
    const result = await run((data, deps) => saveAssemblage(data, next, composition, deps))
    setBusy(false)
    if (result.ok) {
      setUndo((old) => (undoing ? old.slice(0, -1) : [...old.slice(-19), composition]))
      setDraft(null)
      setMessage('Saved in this browser.')
    } else setMessage(result.errors.join(' '))
  }
  function choose(id: string) {
    setSelected(id)
    setDraft(null)
  }
  function pick(partId: PartId) {
    const existing = composition.pieces.find((p) => p.partId === partId)
    if (existing) {
      choose(existing.id)
      return
    }
    const slot = placements(composition, partId)[0]
    if (!slot) {
      setMessage('No open compatible contact. Return another piece to the tray first.')
      return
    }
    // Reuse the stable catalogue instance ID so hidden memory markers return with their piece.
    const ids: Record<PartId, string> = {
      foundation: 'base',
      spire: 'standing',
      pebble: 'river',
      wedge: 'turn',
      bridge: 'span',
      portal: 'opening',
    }
    setDraft({
      id: composition.tray.find((p) => p.partId === partId)?.id ?? ids[partId],
      partId,
      parentId: slot.parentId,
      contactId: slot.contactId,
      restingFrame: 'foot',
      orientation: 0,
    })
    setMessage('Preview only. Choose a contact, then place.')
  }
  function updateMarker(patch: Partial<Marker>) {
    if (marker)
      void commit({
        ...composition,
        markers: composition.markers.map((m) => (m.id === marker.id ? { ...m, ...patch } : m)),
      })
  }
  function download() {
    const url = URL.createObjectURL(new Blob([appearanceExport(composition)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-assemblage.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function importAppearance() {
    try {
      if (raw.length > 40000) throw new Error('Appearance file exceeds 40 KB.')
      const next = parseComposition(JSON.parse(raw))
      if (next.markers.some((m) => m.evidenceId || m.exampleId))
        throw new Error(
          'Use an appearance-only export without evidence associations. Full records belong in Settings.',
        )
      await commit(next)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import failed. Original data retained.')
    }
  }
  return (
    <section className="assemblage" aria-labelledby="assemblage-title">
      <header>
        <div>
          <p className="kicker">Your personal composition · 01</p>
          <h2 id="assemblage-title">Living Assemblage</h2>
          <p>A few things that feel like you. Always enough, just as they are.</p>
        </div>
        <span className="assemblage-edition">
          THE SMALL
          <br />
          THINGS STUDIO
        </span>
      </header>
      <Viewport key={`${backend}-${retry}`} input={input} backend={backend} onSelect={choose} />
      <div className="assemblage-view-controls">
        <button
          type="button"
          onClick={() => setAzimuth((a) => Math.max(-0.65, a - 0.2))}
          aria-label="Turn view left"
        >
          ↶ View
        </button>
        <button
          type="button"
          onClick={() => setAzimuth((a) => Math.min(0.95, a + 0.2))}
          aria-label="Turn view right"
        >
          View ↷
        </button>
        <button type="button" onClick={() => setAzimuth(0.48)}>
          Reset view
        </button>
        <label>
          <input
            type="checkbox"
            checked={composition.motionOff}
            disabled={busy}
            onChange={(e) => void commit({ ...composition, motionOff: e.target.checked })}
          />{' '}
          Motion off
        </label>
      </div>
      <div className="assemblage-workbench">
        <div className="assemblage-tools">
          <div className="assemblage-section-heading">
            <h3>Your repertoire</h3>
            <span>Arrange, don’t earn.</span>
          </div>
          <div className="assemblage-tray" role="group" aria-label="Select a piece">
            {CATALOGUE.map((p, i) => {
              const instance = composition.pieces.find((x) => x.partId === p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy || (p.id === 'foundation' && !instance)}
                  aria-pressed={selected === instance?.id || draft?.partId === p.id}
                  onClick={() => pick(p.id)}
                >
                  <span
                    className={`piece-swatch piece-swatch--${p.id}`}
                    style={{ background: PALETTES[composition.palette].colors[p.color] }}
                  />
                  <small>0{i + 1}</small>
                  <strong>{p.name}</strong>
                  <span>{instance ? 'On display' : 'In the tray'}</span>
                </button>
              )
            })}
          </div>
          <div className="assemblage-palette" role="group" aria-label="Material palette">
            {Object.entries(PALETTES).map(([id, p]) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                aria-pressed={composition.palette === id}
                onClick={() => void commit({ ...composition, palette: id as Composition['palette'] })}
              >
                <span>
                  {p.colors.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
          </div>
          <div className="assemblage-inspector">
            {draft ? (
              <>
                <h3>Place {part(draft.partId).name.toLowerCase()}</h3>
                <label>
                  Contact position
                  <select
                    value={`${draft.parentId}/${draft.contactId}`}
                    onChange={(e) => {
                      const slot = available.find((s) => `${s.parentId}/${s.contactId}` === e.target.value)
                      if (slot) setDraft({ ...draft, parentId: slot.parentId, contactId: slot.contactId })
                    }}
                  >
                    {available.map((s) => (
                      <option key={`${s.parentId}/${s.contactId}`} value={`${s.parentId}/${s.contactId}`}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="hint">
                  The translucent piece previews its contact. These are curated arrangements, not a physical
                  stability calculation.
                </p>
                <div className="row">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, orientation: draft.orientation === 0 ? 180 : 0 })}
                  >
                    Rotate preview · {draft.orientation}°
                  </button>
                  <button type="button" disabled={busy} onClick={() => void commit(display)}>
                    Place piece
                  </button>
                  <button type="button" onClick={() => setDraft(null)}>
                    Cancel preview
                  </button>
                </div>
              </>
            ) : selectedPiece ? (
              <>
                <h3>{part(selectedPiece.partId).name}</h3>
                <p className="hint">
                  {selectedPiece.parentId
                    ? `Resting on ${part(composition.pieces.find((p) => p.id === selectedPiece.parentId)!.partId).name.toLowerCase()}.`
                    : 'The shared ground of your arrangement.'}
                </p>
                <div className="row">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void commit({
                        ...composition,
                        pieces: composition.pieces.map((p) =>
                          p.id === selected ? { ...p, orientation: p.orientation === 0 ? 180 : 0 } : p,
                        ),
                      })
                    }
                  >
                    Rotate piece · {selectedPiece.orientation}°
                  </button>
                  <button
                    type="button"
                    disabled={busy || selectedPiece.partId === 'foundation'}
                    onClick={() => {
                      void commit(removePiece(composition, selected))
                      setSelected('')
                    }}
                  >
                    Return to tray
                  </button>
                </div>
                <p className="hint">Supported pieces return with it. Their records and memories stay.</p>
              </>
            ) : (
              <>
                <h3>Make a little room for yourself</h3>
                <p className="hint">
                  Choose a form above or in the sculpture. Return it to the tray to try a new contact. Nothing
                  here measures your ability.
                </p>
              </>
            )}
            <button
              type="button"
              disabled={busy || undo.length === 0}
              onClick={() => void commit(undo[undo.length - 1]!, true)}
            >
              Undo last change
            </button>
          </div>
        </div>
        <aside className="assemblage-memories" aria-label="Memories and supporting evidence">
          <p className="kicker">Small reminders</p>
          <h3>What it holds for you</h3>
          <p className="hint">Memories you choose to keep close. A shape is a reminder, never a rating.</p>
          <div className="assemblage-memory-list">
            {composition.markers.map((m) => (
              <button type="button" key={m.id} aria-pressed={selected === m.id} onClick={() => choose(m.id)}>
                <span className="memory-symbol" aria-hidden="true">
                  {m.motif === 'loop' ? '∞' : m.motif === 'route' ? '↱' : 'Ⅱ'}
                </span>
                <span>
                  {m.exampleId
                    ? EXAMPLES[m.exampleId].name
                    : m.evidenceId
                      ? 'A memory from your records'
                      : 'Unlinked decoration'}
                  <small>
                    {m.exampleId ? 'Fictional example' : m.evidenceId ? 'Linked evidence' : 'Appearance only'}
                    {!m.visible ? ' · hidden' : ''}
                  </small>
                </span>
              </button>
            ))}
          </div>
          {marker ? (
            <div className="assemblage-evidence" aria-live="polite">
              <h4>
                {sourceExample
                  ? `${sourceExample.name} · example`
                  : evidence
                    ? 'Supporting record'
                    : 'Unlinked decoration'}
              </h4>
              <p>
                {sourceExample?.text ??
                  evidence?.text ??
                  'This decoration makes no claim about your practice.'}
              </p>
              {evidence ? (
                <>
                  <p className="meta">
                    {evidence.kind} · {evidence.recordedAt.slice(0, 10)}
                    {state.namespace === 'demo' ? ' · Fictional demo' : ''}
                  </p>
                  <a
                    href={
                      evidence.activityId
                        ? href({ name: 'activity', id: evidence.activityId })
                        : href({ name: 'records' })
                    }
                  >
                    Open supporting records
                  </a>
                </>
              ) : null}
              <label>
                <input
                  type="checkbox"
                  checked={marker.visible}
                  disabled={busy}
                  onChange={(e) => updateMarker({ visible: e.target.checked })}
                />{' '}
                Show this marker
              </label>
              {marker.evidenceId ? (
                <label>
                  <input
                    type="checkbox"
                    checked={marker.retainUnlinked}
                    disabled={busy}
                    onChange={(e) => updateMarker({ retainUnlinked: e.target.checked })}
                  />{' '}
                  Keep as an unlinked decoration if evidence is deleted
                </label>
              ) : null}
              <label>
                Marker shape
                <select
                  value={marker.motif}
                  disabled={busy}
                  onChange={(e) => updateMarker({ motif: e.target.value as Marker['motif'] })}
                >
                  <option value="loop">Linked loop</option>
                  <option value="route">Turned route</option>
                  <option value="inlay">Paired inlay</option>
                </select>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void commit({
                    ...composition,
                    markers: composition.markers.filter((m) => m.id !== marker.id),
                  })
                }
              >
                Remove marker, keep evidence
              </button>
            </div>
          ) : (
            <p className="hint">Select a reminder to inspect its story.</p>
          )}
          <details>
            <summary>Keep a memory from your records</summary>
            <p className="hint">
              Select a displayed piece, then choose a record. Nothing is linked automatically.
            </p>
            <label>
              Supporting evidence
              <select
                aria-label="Supporting evidence"
                value={evidenceId}
                onChange={(e) => setEvidenceId(e.target.value)}
              >
                <option value="">Choose a record</option>
                {state.data.evidence.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.text.slice(0, 70)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Memory shape
              <select value={motif} onChange={(e) => setMotif(e.target.value as Marker['motif'])}>
                <option value="loop">Linked loop</option>
                <option value="route">Turned route</option>
                <option value="inlay">Paired inlay</option>
              </select>
            </label>
            <button
              type="button"
              disabled={busy || !selectedPiece || !evidenceId || composition.markers.length >= 12}
              onClick={() => {
                if (selectedPiece)
                  void commit({
                    ...composition,
                    markers: [
                      ...composition.markers,
                      {
                        id: crypto.randomUUID(),
                        instanceId: selectedPiece.id,
                        motif,
                        visible: true,
                        evidenceId,
                        retainUnlinked: false,
                      },
                    ],
                  })
              }}
            >
              Link selected record
            </button>
            {state.data.evidence.length === 0 ? (
              <p className="hint">
                No evidence records yet. Add one through your existing situation or activity workflow.
              </p>
            ) : null}
          </details>
        </aside>
      </div>
      <div className="assemblage-bottom">
        <p role="status">{message}</p>
        <details>
          <summary>Appearance files & display options</summary>
          <div className="assemblage-file-controls">
            <button type="button" onClick={download}>
              Export appearance only
            </button>
            <p className="hint">
              Geometry and colour only, with unlinked decorations. Evidence text and identifiers stay here.
              Full record exports remain in Settings.
            </p>
            <label>
              Appearance JSON
              <textarea
                aria-label="Appearance JSON"
                rows={4}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="Paste an appearance export"
              />
            </label>
            <label>
              Or choose appearance file
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 40000) setMessage('Appearance file exceeds 40 KB.')
                    else
                      void file
                        .text()
                        .then(setRaw)
                        .catch(() => setMessage('Could not read file. Original data retained.'))
                  }
                }}
              />
            </label>
            <button type="button" disabled={busy || !raw.trim()} onClick={() => void importAppearance()}>
              Validate & replace appearance
            </button>
            <label>
              Graphics mode
              <select value={backend} onChange={(e) => setBackend(e.target.value as Backend)}>
                <option value="auto">Prefer WebGPU</option>
                <option value="webgl">Force WebGL 2</option>
                <option value="static">Static presentation</option>
              </select>
            </label>
            <button type="button" onClick={() => setRetry((n) => n + 1)}>
              Retry graphics
            </button>
          </div>
        </details>
      </div>
    </section>
  )
}
