/**
 * The rehearsal panel.
 *
 * Everything here is marked as a rehearsal, repeatedly and in text. The counterpart's lines come
 * from the authored script when the content has one, and otherwise from the local stand-in
 * provider; either way they are fixed in advance. Nothing in this panel writes a record: the
 * exchange is practice, and what the person keeps is whatever they type into their own activity.
 */
import { useState } from 'react'
import type { RehearsalScript } from '~/content/types'
import { createFakeProvider } from '~/ai/fake-provider'
import { buildRequest, previewText } from '~/ai/preview'
import { useApp } from '../state'
import { Field } from '../primitives'

export interface RehearsalTurn {
  who: 'counterpart' | 'you'
  text: string
}

export function RehearsalPanel({
  script,
  activityId,
}: {
  script: RehearsalScript | undefined
  /** Absent while the rehearsal is being practised at the campaign step, before it is saved. */
  activityId?: string
}) {
  const { aiProvider, state } = useApp()
  const [turns, setTurns] = useState<RehearsalTurn[]>(() =>
    script ? [{ who: 'counterpart', text: script.opening }] : [],
  )
  const [draft, setDraft] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)

  // Count the person's turns, not the counterpart's: the opening is not a reply, so `lines[0]`
  // answers the first thing the person says.
  const myTurns = turns.filter((t) => t.who === 'you').length
  const scripted = script?.lines ?? []
  const scriptExhausted = myTurns >= scripted.length

  const say = async () => {
    const mine = draft.trim()
    if (mine === '') return
    const next: RehearsalTurn[] = [...turns, { who: 'you', text: mine }]
    setDraft('')
    if (!scriptExhausted) {
      const line = scripted[myTurns]
      setTurns(line !== undefined ? [...next, { who: 'counterpart', text: line }] : next)
      return
    }
    // Past the end of the authored script the local stand-in supplies a fixed closing reply.
    setTurns(next)
    setThinking(true)
    const provider = aiProvider ?? createFakeProvider()
    const request = buildRequest({
      purpose: 'rehearse',
      promptId: 'rehearsal-counterpart-v1',
      // Only this activity's own text is sent, and only what the person typed this turn.
      context: [],
      baseRevision: state.revision,
      rehearsalTurn: myTurns,
      userText: mine,
    })
    const outcome = await provider.respond(request)
    setThinking(false)
    if (outcome.ok) {
      const reply = outcome.response.proposals.find((p) => p.kind === 'rehearsal-line')
      if (reply) setTurns([...next, { who: 'counterpart', text: reply.text }])
    }
  }

  if (!script && scripted.length === 0) {
    return (
      <div className="panel panel--rehearsal">
        <div>
          <h3>Rehearsal</h3>
          <p>
            This activity has no scripted counterpart. Practise in whatever way suits you, then record what you would
            actually say in the activity below. A rehearsal is preparation and is never recorded as something you did at
            work.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="panel panel--rehearsal">
      <div>
        <h3>Rehearsal — this is not a real conversation</h3>
        <p className="meta">
          Playing: {script?.role ?? 'a fixed counterpart'}. {script?.note}
        </p>
        <ol className="record-list">
          {turns.map((turn, index) => (
            <li key={`${index}-${turn.who}`}>
              <strong>{turn.who === 'you' ? 'You' : 'The counterpart (fiction)'}</strong>
              <p>{turn.text}</p>
            </li>
          ))}
        </ol>
        {thinking ? <p className="loading">Waiting for the stand-in…</p> : null}
        <Field label="What you would say" hint="Nothing here is saved. Put what you want to keep into the activity itself.">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Field>
        <div className="row">
          <button type="button" onClick={() => void say()} disabled={draft.trim() === '' || thinking}>
            Say it
          </button>
          <button
            type="button"
            className="btn-quiet"
            onClick={() =>
              setPreview(
                preview === null
                  ? previewText(
                      buildRequest({
                        purpose: 'rehearse',
                        promptId: 'rehearsal-counterpart-v1',
                        context: [],
                        baseRevision: state.revision,
                        rehearsalTurn: myTurns,
                        userText: draft,
                      }),
                      aiProvider.sendsDataOffDevice,
                    )
                  : null,
              )
            }
          >
            {preview === null ? 'Show exactly what would be sent' : 'Hide what would be sent'}
          </button>
          <button type="button" className="btn-quiet" onClick={() => setTurns(script ? [{ who: 'counterpart', text: script.opening }] : [])}>
            Start the rehearsal again
          </button>
        </div>
        {preview !== null ? <pre>{preview}</pre> : null}
        {scriptExhausted ? (
          <p className="hint">
            The authored script has run out. Further replies come from the local stand-in, which is not a language model
            and makes no network request.
          </p>
        ) : null}
        <p className="meta">
          {activityId ? (
            <>
              Rehearsal for activity <code>{activityId}</code>.{' '}
            </>
          ) : null}
          Doing this well tells you the words are ready. It tells you nothing about how the real situation will go, and
          nothing here is saved as practice until you save the activity.
        </p>
      </div>
    </div>
  )
}
