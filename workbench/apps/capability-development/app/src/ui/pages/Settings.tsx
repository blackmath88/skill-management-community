/**
 * Settings: direction, appearance, export and import, share packages, and what is actually true
 * about privacy in this build.
 *
 * The privacy section states what the code does, not what would be reassuring. If a live provider
 * is ever configured, the statement has to change with it — which is why it reads the provider's
 * own `sendsDataOffDevice` flag rather than asserting that nothing ever leaves the device.
 */
import { useState } from 'react'
import {
  createDirection,
  createSharePackage,
  reviseDirection,
  saveAppearance,
  saveDisplayName,
} from '~/application/commands'
import { APPEARANCE_DISCLAIMER } from '~/domain/experience'
import type { Appearance, PresentationMode } from '~/domain/types'
import { exportFileName, exportUserData, parseImport } from '~/storage/portability'
import type { ImportResult } from '~/storage/types'
import { ConfirmButton, Field, formatDateTime, PageHead, SaveStatus, useSave } from '../primitives'
import { useApp } from '../state'
import { href } from '../router'
import { MobileEditor } from '../mobile/MobilePanel'

const EMBLEMS = ['◆', '▲', '●', '■', '✦', '⌘']
const PALETTES = ['slate', 'clay', 'moss', 'ink']
/**
 * The presentation modes.
 *
 * Only the emblem's shape changes today: the character and journey views described in
 * ../../../VISUAL-DIRECTIONS.md are not built, and choosing one of those worlds is design work
 * that has not happened. The labels say what the setting does now rather than what it is meant to
 * become, because a setting that promises a figure which does not exist is a small lie told on
 * every visit.
 */
const MODES: { value: PresentationMode; label: string; hint: string }[] = [
  { value: 'character', label: 'Solid emblem', hint: 'A square mark. Intended later to carry a character; that view is not built yet.' },
  { value: 'journey', label: 'Round emblem', hint: 'A round mark. Intended later to show your records as a path; that view is not built yet.' },
  { value: 'evidence', label: 'Outlined emblem', hint: 'An outlined mark, for the plainest presentation.' },
]

export function SettingsPage() {
  const { state, content, session, aiProvider, presentation } = useApp()

  const legacy = state.data.profile.appearance?.assemblage
  return (
    <div className="stack">
      <PageHead kicker="Settings" title="Your mobile, your direction, your data" />

      <section className="panel" id="appearance" aria-labelledby="mobile-settings-heading">
        <h2 id="mobile-settings-heading">Your mobile</h2>
        <MobileEditor />
      </section>

      <DirectionSection />

      <PortabilitySection />
      <SharePackageSection />

      <section className="panel">
        <h2>What is true about privacy here</h2>
        <ul>
          <li>Every record is stored in this browser, using IndexedDB. There is no account and no server.</li>
          <li>
            Browser storage is not an encrypted backup. Anybody with access to this browser profile can read it, and
            clearing site data deletes it.
          </li>
          <li>
            The sparring partner is <strong>{aiProvider.description}</strong>{' '}
            {aiProvider.sendsDataOffDevice
              ? 'It sends what you select off this device.'
              : 'Nothing you send it leaves this device.'}
          </li>
          <li>There is no analytics, no telemetry and no error reporting. Nothing is counted about how you use this.</li>
          <li>
            This app makes no network request of its own. The only links that leave this device are the source
            citations on the Methods page, which go to a publisher when you click one; they open in a new tab and
            send no referrer. Nothing about your records travels with them.
          </li>
          <li>
            An export is a plain file you control. Once you have copied it somewhere, deleting your records here cannot
            recall that copy.
          </li>
          <li>
            Where you record what somebody else said, the app asks for their role rather than their name, and refuses
            to save that field if it looks like an email address or a phone number.{' '}
            <strong>That is a check on one field, not protection across your notes.</strong> Nothing stops you typing a
            name into a description, a note or a review, and the app does not read your text looking for one. Keeping
            other people out of your records is something you do, not something this app enforces.
          </li>
        </ul>
      </section>

      <section className="panel panel--caution">
        <h2>Delete everything in {state.namespace === 'demo' ? 'the demo' : 'your records'}</h2>
        <p>
          This removes every record in this namespace. {state.namespace === 'demo' ? 'The demo is then restored to its starting state.' : 'It cannot be undone, and an export you already made is not affected.'}
        </p>
        <ConfirmButton
          label={`Delete everything in ${state.namespace === 'demo' ? 'the demo' : 'my records'}`}
          confirmLabel="Yes, delete it all"
          onConfirm={() => void session.deleteAll()}
        />
      </section>

      <details className="more">
        <summary>Earlier appearance settings</summary>
        <div className="more__body">
          <p className="hint">
            The emblem and the faceted assemblage came before the mobile. Whatever you saved there is kept exactly as
            you left it and exported with your records; the mobile does not replace or rewrite it.
          </p>
          <p>
            <a href={href({ name: 'assemblage' })}>Open the assemblage</a>
            <span className="meta">
              {' '}
              · {legacy ? `you have a saved composition of ${legacy.pieces.length} piece${legacy.pieces.length === 1 ? '' : 's'}` : 'nothing saved there'}
            </span>
          </p>
          <AppearanceSection />
        </div>
      </details>

      <details className="more">
        <summary>Technical details</summary>
        <div className="more__body">
      <section className="panel panel--quiet">
        <h2>Versions</h2>
        <dl className="pairs">
          <dt>Records schema</dt>
          <dd>{state.data.schemaVersion}</dd>
          <dt>Storage revision</dt>
          <dd>{state.revision}</dd>
          <dt>Last saved</dt>
          <dd>{state.savedAt ? formatDateTime(state.savedAt) : 'nothing saved yet'}</dd>
          <dt>Content packs</dt>
          <dd>{content.packs.map((pack) => `${pack.id} v${pack.version}`).join(', ')}</dd>
          <dt>Practice experience convention</dt>
          <dd>v{presentation.experiencePolicyVersion}</dd>
          <dt>Appearance format</dt>
          <dd>{state.data.profile.appearance ? `v${state.data.profile.appearance.version}` : 'not set'}</dd>
        </dl>
        <p className="meta">
          These version numbers are deliberately separate. A change to how practice is counted is not a change to how
          records are stored, and neither is a change to the content.
        </p>
      </section>
      <section className="panel panel--quiet">
        <h2>The character or emblem receives only this</h2>
        <p className="hint">
          Shown so the boundary is checkable rather than asserted. No journal text, no situation description and no
          evidence reaches a renderer.
        </p>
        <pre>{JSON.stringify(presentation, null, 2)}</pre>
      </section>
        </div>
      </details>
    </div>
  )
}

function DirectionSection() {
  const { state, content, run } = useApp()
  const save = useSave()
  const [text, setText] = useState('')
  const [focus, setFocus] = useState('')
  const active = state.data.directions.find((d) => d.state === 'active')

  return (
    <section className="panel">
      <h2>Your direction</h2>
      <p className="hint">
        Optional, and in your own words. It is an aspiration you can revise or retire, not a gap this app found in you.
        One direction is active at a time so the home screen has one next step.
      </p>
      {state.data.directions.length > 0 ? (
        <ul className="record-list">
          {state.data.directions.map((direction) => (
            <li key={direction.id}>
              <p>{direction.text}</p>
              <p className="meta">
                {direction.state}
                {direction.focusCapabilityId
                  ? ` · focus: ${content.capability(direction.focusCapabilityId)?.title ?? direction.focusCapabilityId}`
                  : ''}{' '}
                · updated {formatDateTime(direction.updatedAt)}
              </p>
              <div className="row">
                {direction.state !== 'active' ? (
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() =>
                      void save.run(async () => {
                        const result = await run((data, deps) => reviseDirection(data, { id: direction.id, state: 'active' }, deps))
                        return result.ok ? { ok: true } : { ok: false, errors: result.errors }
                      })
                    }
                  >
                    Make this the active one
                  </button>
                ) : null}
                {direction.state !== 'retired' ? (
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() =>
                      void save.run(async () => {
                        const result = await run((data, deps) => reviseDirection(data, { id: direction.id, state: 'retired' }, deps))
                        return result.ok ? { ok: true } : { ok: false, errors: result.errors }
                      })
                    }
                  >
                    Retire it
                  </button>
                ) : null}
              </div>
              {direction.history.length > 1 ? (
                <details>
                  <summary>How it changed</summary>
                  <ul>
                    {direction.history.map((entry, i) => (
                      <li key={`${entry.at}-${i}`}>
                        {formatDateTime(entry.at)} — {entry.state}: {entry.text}
                        {entry.note ? ` (${entry.note})` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <Field label={active ? 'Write a different direction' : 'Write a direction'}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Field label="A capability to focus on" optional>
        <select value={focus} onChange={(e) => setFocus(e.target.value)}>
          <option value="">No particular one</option>
          {content.capabilities().map((capability) => (
            <option key={capability.id} value={capability.id}>
              {capability.title}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="button"
        disabled={text.trim() === ''}
        onClick={() =>
          void save
            .run(async () => {
              const result = await run((data, deps) =>
                createDirection(data, { text, ...(focus !== '' ? { focusCapabilityId: focus } : {}) }, deps),
              )
              return result.ok ? { ok: true } : { ok: false, errors: result.errors }
            })
            .then((done) => {
              if (done) setText('')
            })
        }
      >
        Save it
      </button>
      <SaveStatus state={save.state} />
    </section>
  )
}

function AppearanceSection() {
  const { state, run } = useApp()
  const save = useSave()
  const current = state.data.profile.appearance
  const [mode, setMode] = useState<PresentationMode>(current?.mode ?? 'journey')
  const [emblem, setEmblem] = useState(current?.emblem ?? EMBLEMS[0] ?? '◆')
  const [palette, setPalette] = useState(current?.palette ?? PALETTES[0] ?? 'slate')
  const [name, setName] = useState(state.data.profile.displayName ?? '')

  const appearance: Appearance = { version: 1, mode, emblem, palette, accessories: current?.accessories ?? [] }

  return (
    <section className="panel">
      <h2>How this looks</h2>
      <p className="hint">{APPEARANCE_DISCLAIMER}</p>
      <div className="row">
        <div className={`emblem emblem--${mode}`} aria-hidden="true">
          {emblem}
        </div>
        <div>
          <p className="meta">
            This is a cosmetic choice. Choosing it does not record anything, and deleting records does not take it away.
          </p>
        </div>
      </div>
      <Field label="A name to show" optional hint="Only ever shown in this browser.">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <fieldset>
        <legend>How your records are presented</legend>
        <ul className="choice-list">
          {MODES.map((option) => (
            <li key={option.value}>
              <label className="check">
                <input type="radio" name="mode" checked={mode === option.value} onChange={() => setMode(option.value)} />
                <span>
                  <strong>{option.label}</strong>
                  <br />
                  <span className="meta">{option.hint}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="meta">
          Today this only changes how the mark above is drawn. Whatever a presentation ever becomes, it cannot change
          what counts as evidence, who can see a record, or how practice is counted: those live below the interface,
          and a renderer receives counts rather than anything you wrote.
        </p>
      </fieldset>
      <Field label="Emblem">
        <select value={emblem} onChange={(e) => setEmblem(e.target.value)}>
          {EMBLEMS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Palette">
        <select value={palette} onChange={(e) => setPalette(e.target.value)}>
          {PALETTES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="button"
        onClick={() =>
          void save.run(async () => {
            const appearanceResult = await run((data, deps) => saveAppearance(data, appearance, deps))
            if (!appearanceResult.ok) return { ok: false, errors: appearanceResult.errors }
            const nameResult = await run((data, deps) => saveDisplayName(data, name, deps))
            return nameResult.ok ? { ok: true } : { ok: false, errors: nameResult.errors }
          })
        }
      >
        Save how this looks
      </button>
      <SaveStatus state={save.state} />
    </section>
  )
}

function SharePackageSection() {
  const { run } = useApp()
  const save = useSave()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    anonymisedCase: '',
    reusablePractice: '',
    supportRequest: '',
    structuralObstacle: '',
  })

  if (!open) {
    return (
      <section className="panel">
        <h2>Prepare something to share</h2>
        <p className="hint">
          A reviewed snapshot you write yourself: an anonymised case, a practice worth reusing, a request for support, or
          a structural obstacle. Making one sends nothing and gives nobody access to your records.
        </p>
        <button type="button" className="btn-quiet" onClick={() => setOpen(true)}>
          Prepare a package
        </button>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>Prepare something to share</h2>
      <p className="hint">
        Write only what you are willing to hand over. Nothing is copied from your records automatically, because an
        automatic summary of somebody's journal is not something they reviewed.
      </p>
      <Field label="A title">
        <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field label="An anonymised case" optional>
        <textarea value={form.anonymisedCase} onChange={(e) => setForm({ ...form, anonymisedCase: e.target.value })} />
      </Field>
      <Field label="A practice worth reusing" optional>
        <textarea value={form.reusablePractice} onChange={(e) => setForm({ ...form, reusablePractice: e.target.value })} />
      </Field>
      <Field label="A request for support" optional>
        <textarea value={form.supportRequest} onChange={(e) => setForm({ ...form, supportRequest: e.target.value })} />
      </Field>
      <Field label="A structural obstacle" optional hint="Something that needs somebody with authority, not more practice.">
        <textarea value={form.structuralObstacle} onChange={(e) => setForm({ ...form, structuralObstacle: e.target.value })} />
      </Field>
      <p className="meta">
        Once you copy this out, the copy has its own life. Deleting your records here cannot recall it.
      </p>
      <div className="row">
        <button
          type="button"
          disabled={form.title.trim() === ''}
          onClick={() =>
            void save
              .run(async () => {
                const result = await run((data, deps) => createSharePackage(data, form, deps))
                return result.ok ? { ok: true } : { ok: false, errors: result.errors }
              })
              .then((done) => {
                if (done) setOpen(false)
              })
          }
        >
          Save the package
        </button>
        <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <SaveStatus state={save.state} />
    </section>
  )
}

function PortabilitySection() {
  const { state, content, session } = useApp()
  const save = useSave()
  const [pasted, setPasted] = useState('')
  const [parsed, setParsed] = useState<ImportResult | null>(null)
  const [exported, setExported] = useState<string | null>(null)

  const check = () => {
    setParsed(
      parseImport(pasted, {
        knownCapabilityIds: content.capabilityIds(),
        knownMethodIds: content.methodIds(),
      }),
    )
  }

  return (
    <section className="panel">
      <h2>Export and import</h2>
      <p className="hint">
        An export is a plain JSON file holding every record in this namespace. An import replaces every record in this
        namespace at once — never a partial merge, because half-applied records could not be explained.
      </p>
      <div className="row">
        <button type="button" onClick={() => setExported(exportUserData(state.data))}>
          Show the export
        </button>
        {exported ? (
          <a
            href={`data:application/json;charset=utf-8,${encodeURIComponent(exported)}`}
            download={exportFileName()}
          >
            Download it as {exportFileName()}
          </a>
        ) : null}
      </div>
      {exported ? <pre>{exported.length > 4000 ? `${exported.slice(0, 4000)}\n… (${exported.length} characters in total)` : exported}</pre> : null}

      <Field label="Paste an export to import" hint="An export from this app, or an export from Leader Me, which is converted on read.">
        <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} />
      </Field>
      <button type="button" className="btn-quiet" onClick={check} disabled={pasted.trim() === ''}>
        Check it
      </button>

      {parsed && !parsed.ok ? (
        <div className="panel panel--error" role="alert">
          <h3>This file was not imported</h3>
          <p>Nothing was changed.</p>
          <ul className="error-list">
            {parsed.errors.slice(0, 20).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          {parsed.errors.length > 20 ? <p className="meta">and {parsed.errors.length - 20} more.</p> : null}
        </div>
      ) : null}

      {parsed && parsed.ok ? (
        <div className="panel panel--caution">
          <h3>Ready to import</h3>
          <p>
            From <strong>{parsed.summary.sourceApp}</strong>, export version {parsed.summary.schemaVersion}
            {parsed.summary.exportedAt ? `, written ${parsed.summary.exportedAt}` : ''}.
            {parsed.summary.converted ? ' It is a Leader Me export and was converted on read.' : ''}
          </p>
          <dl className="pairs">
            {Object.entries(parsed.summary.counts).map(([key, count]) => (
              <div key={key} style={{ display: 'contents' }}>
                <dt>{key}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
          {parsed.summary.notes.length > 0 ? (
            <>
              <h4>What the conversion did</h4>
              <ul>
                {parsed.summary.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </>
          ) : null}
          <p>
            Importing replaces <strong>every record</strong> currently in{' '}
            {state.namespace === 'demo' ? 'the demo' : 'your records'}. Export first if you want to keep them.
          </p>
          <ConfirmButton
            label="Replace my records with this file"
            confirmLabel="Yes, replace them"
            onConfirm={() =>
              void save
                .run(async () => {
                  const result = await session.replaceAll(parsed.data)
                  return result.ok ? { ok: true } : { ok: false, errors: result.errors }
                })
                .then((done) => {
                  if (done) {
                    setParsed(null)
                    setPasted('')
                  }
                })
            }
          />
        </div>
      ) : null}
      <SaveStatus state={save.state} />
    </section>
  )
}
