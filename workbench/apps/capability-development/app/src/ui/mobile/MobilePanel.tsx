/**
 * The mobile with its memories, as it appears in the normal experience, and the controls that
 * change it.
 *
 * Two rules shape this file. The picture is never the only way to reach anything: every memory
 * is an ordinary labelled button, and opening one shows the record's own words with a link to
 * the record. And nothing here asks for attention — an empty mobile is complete, a memory is
 * hung only when the person chooses to, and no arrangement changes by itself.
 */
import { useState } from 'react'
import { saveMobile } from '~/application/commands'
import { COMPOSITIONS, PALETTES, composition as compositionOf } from '~/mobile/catalogue'
import { deriveMobileView, type MobileMemory, type MobileView } from '~/mobile/view'
import type { AppearanceMobile } from '~/domain/types'
import { Mobile } from './Mobile'
import { formatDateTime, KindTag, SaveStatus, useSave } from '../primitives'
import { href } from '../router'
import { useApp } from '../state'

/** The saved mobile, or the default one written out so a first change has something to edit. */
function currentMobile(view: MobileView, saved: AppearanceMobile | undefined): AppearanceMobile {
  return saved ?? { version: 1, compositionId: view.compositionId, paletteId: view.paletteId, memories: [] }
}

function useMobile() {
  const { state, run } = useApp()
  const view = deriveMobileView(state.data)
  const saved = state.data.profile.appearance?.mobile
  const save = useSave({ latestOnly: true })
  const change = (next: (mobile: AppearanceMobile) => AppearanceMobile) =>
    save.run(async () => {
      const result = await run((data, deps) =>
        saveMobile(data, next(currentMobile(deriveMobileView(data), data.profile.appearance?.mobile)), deps),
      )
      return result.ok ? { ok: true } : { ok: false, errors: result.errors }
    })
  return { view, saved, save, change }
}

function MemoryDetail({ memory, onTakeDown }: { memory: MobileMemory; onTakeDown: () => void }) {
  if (!memory.present) {
    return (
      <div className="memory-detail">
        <p>
          The record behind this memory has been deleted, so there is nothing to show. The mark stays on{' '}
          {memory.shapeName} until you take it down; nothing else was put in its place.
        </p>
        <button type="button" className="btn-quiet" onClick={onTakeDown}>
          Take it down
        </button>
      </div>
    )
  }
  return (
    <div className="memory-detail">
      <p className="row">
        {memory.kind ? <KindTag kind={memory.kind} /> : null}
        <span className="meta">{memory.attemptedAt ? formatDateTime(memory.attemptedAt) : ''}</span>
      </p>
      {memory.observation ? (
        <p>
          <span className="meta">You observed: </span>
          {memory.observation}
        </p>
      ) : (
        <p className="meta">You have not written a reflection on this yet.</p>
      )}
      <p className="meta">
        {memory.evidenceCount === 0
          ? 'No supporting evidence attached.'
          : `${memory.evidenceCount} piece${memory.evidenceCount === 1 ? '' : 's'} of supporting evidence attached.`}
      </p>
      <div className="row">
        <a className="btn btn--quiet" href={href({ name: 'activity', id: memory.activityId })}>
          Open the record
        </a>
        <button type="button" className="btn-link" onClick={onTakeDown}>
          Take it down from the mobile
        </button>
      </div>
    </div>
  )
}

/** The mobile on Home: the picture, the memories as buttons, and one quiet way to change it. */
export function MobilePanel() {
  const { view, save, change } = useMobile()
  const [open, setOpen] = useState<number | null>(null)
  const takeDown = (slot: number) => {
    setOpen(null)
    void change((mobile) => ({ ...mobile, memories: mobile.memories.filter((m) => m.slot !== slot) }))
  }
  return (
    <section aria-labelledby="mobile-heading" className="stack">
      <h2 id="mobile-heading" className="visually-hidden">
        Your mobile
      </h2>
      <Mobile drawing={view.drawing} selectedSlot={open} onSelect={(slot) => setOpen(open === slot ? null : slot)} />
      {view.memories.length > 0 ? (
        <>
          <h3 className="kicker">Memories you hung on it</h3>
          <ul className="memory-list">
            {view.memories.map((memory) => (
              <li key={memory.slot}>
                <button
                  type="button"
                  aria-expanded={open === memory.slot}
                  onClick={() => setOpen(open === memory.slot ? null : memory.slot)}
                >
                  {memory.title}
                  <span className="meta">On {memory.shapeName}</span>
                </button>
                {open === memory.slot ? <MemoryDetail memory={memory} onTakeDown={() => takeDown(memory.slot)} /> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="meta">
        {view.memories.length === 0 ? 'Your mobile. It is complete as it is. ' : ''}
        <a href={`${href({ name: 'settings' })}`}>Change how it looks{view.candidates.length > 0 ? ' or hang a memory' : ''}</a>
      </p>
      {save.state.kind === 'failed' ? <SaveStatus state={save.state} /> : null}
    </section>
  )
}

/** Offered once a reflection is saved. Entirely optional, and says so. */
export function MemoryOffer({ activityId }: { activityId: string }) {
  const { view, save, change } = useMobile()
  const hung = view.memories.find((m) => m.activityId === activityId)
  if (hung) {
    return (
      <p className="meta">
        This is hung on {hung.shapeName} of your mobile. <a href={href({ name: 'home' })}>See it on Home</a>.
      </p>
    )
  }
  const slot = view.freeSlots[0]
  if (slot === undefined) {
    return (
      <p className="meta">
        Your mobile already carries a memory on every shape. <a href={href({ name: 'settings' })}>Swap one in Settings</a>{' '}
        if you want this one on it.
      </p>
    )
  }
  return (
    <div>
      <button
        type="button"
        className="btn-quiet"
        onClick={() => void change((mobile) => ({ ...mobile, memories: [...mobile.memories, { slot, activityId }] }))}
      >
        Hang this on your mobile
      </button>
      <p className="hint">
        Optional. It marks {compositionOf(view.compositionId).shapes[slot]?.name ?? 'a shape'} so you can find this
        record from Home. Nothing changes if you do not.
      </p>
      <SaveStatus state={save.state} />
    </div>
  )
}

/** Settings: arrangement, palette and memories. Every change saves at once and says so. */
export function MobileEditor() {
  const { view, save, change } = useMobile()
  const [candidate, setCandidate] = useState('')
  const [slot, setSlot] = useState<number | ''>('')
  const chosenCandidate = view.candidates.find((c) => c.activityId === candidate) ?? view.candidates[0]
  const chosenSlot = slot !== '' && view.freeSlots.includes(slot) ? slot : view.freeSlots[0]
  const comp = compositionOf(view.compositionId)

  return (
    <div className="stack">
      <div className="home__lead">
        <Mobile drawing={view.drawing} />
        <div>
          <p>
            A mobile that is yours from the first visit. It does not grow, level up or change by itself, and it says
            nothing about how capable you are. You choose the arrangement, the colours and — only if you want — which
            of your own records hang on it.
          </p>
          <SaveStatus state={save.state} />
        </div>
      </div>

      <fieldset>
        <legend>Arrangement</legend>
        <div className="option-tiles">
          {COMPOSITIONS.map((option) => (
            <label key={option.id} className="option-tile">
              <input
                type="radio"
                name="mobile-composition"
                checked={view.compositionId === option.id}
                onChange={() => void change((mobile) => ({ ...mobile, compositionId: option.id }))}
              />
              <strong>{option.title}</strong>
              <span className="meta">{option.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Colours</legend>
        <div className="option-tiles">
          {PALETTES.map((option) => (
            <label key={option.id} className="option-tile">
              <input
                type="radio"
                name="mobile-palette"
                checked={view.paletteId === option.id}
                onChange={() => void change((mobile) => ({ ...mobile, paletteId: option.id }))}
              />
              <strong>{option.title}</strong>
              <span className="option-tile__chips" aria-hidden="true">
                {option.tones.map((tone) => (
                  <span key={tone} style={{ background: tone }} />
                ))}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <h3>Memories</h3>
        <p className="hint">
          A memory is one of your own attempts, chosen by you. Nothing is hung automatically, and taking one down
          deletes nothing.
        </p>
        {view.memories.length === 0 ? <p className="empty">Nothing is hung on your mobile.</p> : null}
        <ul className="record-list">
          {view.memories.map((memory) => (
            <li key={memory.slot}>
              <div className="row row--between">
                <span>
                  {memory.present ? (
                    <a href={href({ name: 'activity', id: memory.activityId })}>{memory.title}</a>
                  ) : (
                    <span className="empty">{memory.title}</span>
                  )}
                  <span className="meta"> · on {memory.shapeName}</span>
                </span>
                <button
                  type="button"
                  className="btn-quiet"
                  aria-label={`Take down “${memory.title}”`}
                  onClick={() =>
                    void change((mobile) => ({ ...mobile, memories: mobile.memories.filter((m) => m.slot !== memory.slot) }))
                  }
                >
                  Take it down
                </button>
              </div>
            </li>
          ))}
        </ul>
        {view.candidates.length === 0 ? (
          <p className="meta">
            {view.memories.length === 0
              ? 'Once you have attempted something, you can choose to hang it here.'
              : 'Every attempt you have recorded is already hung.'}
          </p>
        ) : chosenSlot === undefined ? (
          <p className="meta">Every shape carries a memory. Take one down to hang a different one.</p>
        ) : (
          <div className="surface">
            <div className="field">
              <label htmlFor="memory-candidate">Hang one of your attempts</label>
              <select id="memory-candidate" value={chosenCandidate?.activityId ?? ''} onChange={(e) => setCandidate(e.target.value)}>
                {view.candidates.map((c) => (
                  <option key={c.activityId} value={c.activityId}>
                    {c.title}
                    {c.kind === 'rehearsal' ? ' (rehearsal)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="memory-slot">On which shape</label>
              <select id="memory-slot" value={chosenSlot} onChange={(e) => setSlot(Number(e.target.value))}>
                {view.freeSlots.map((free) => (
                  <option key={free} value={free}>
                    {(comp.shapes[free]?.name ?? 'a shape').replace(/^the /, 'The ')}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-quiet"
              disabled={!chosenCandidate}
              onClick={() => {
                if (!chosenCandidate) return
                const activityId = chosenCandidate.activityId
                void change((mobile) => ({ ...mobile, memories: [...mobile.memories, { slot: chosenSlot, activityId }] }))
                setCandidate('')
                setSlot('')
              }}
            >
              Hang it
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
