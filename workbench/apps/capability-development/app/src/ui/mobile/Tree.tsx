/**
 * The main screen: your mobile as a skill tree, what a piece holds, and the road ahead.
 *
 * Three parts side by side. The mobile shows every skill in its place, made according to where it
 * stands. The card says what one skill is, what you have done with it, and offers one thing to do
 * next. The road says which branch you are working on now, until when, and what comes after.
 *
 * Everything the picture offers is also a labelled control: every skill is a button in the list
 * below it, grouped by branch, with its state in words.
 */
import { useMemo, useState } from 'react'
import { chooseTarget, endSeason, placeSkills, startSeason } from '~/application/commands'
import { TARGETS } from '~/content/targets'
import { CLAIM_LEVELS, type ClaimLevel } from '~/domain/types'
import { mobilePalette } from '~/mobile/catalogue'
import { growMobile } from '~/mobile/grow'
import { CLAIM_LABEL, deriveTree, PIECE_LABEL, skillTrail, type Piece, type Tree } from '~/mobile/tree'
import type { SheetFinish } from '~/mobile/view'
import { Mobile } from './Mobile'
import { formatDate, formatDateTime, SaveStatus, useSave } from '../primitives'
import { href } from '../router'
import { useApp } from '../state'

const WEIGHT: Record<Piece['state'], number> = { outline: 0, claimed: 0.15, explored: 0.4, rehearsed: 0.55, tried: 0.75, repeated: 0.9, transferred: 1 }

export function todayLocal(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function useTree(): Tree {
  const { state, content, capabilities } = useApp()
  return useMemo(() => deriveTree(state.data, capabilities, content.capabilityGroups(), todayLocal()), [state.data, capabilities, content])
}

function SkillCard({ piece, onClose }: { piece: Piece; onClose: () => void }) {
  const { state, content, run } = useApp()
  const save = useSave({ latestOnly: true })
  const definition = content.capability(piece.capabilityId)
  const trail = skillTrail(state.data, piece.capabilityId)
  const fresh = piece.state === 'outline' || piece.state === 'claimed'
  return (
    <section className="skill-card" aria-labelledby="skill-card-title">
      <div className="row row--between">
        <p className="kicker">{content.capabilityGroups().find((g) => g.id === piece.branchId)?.title}</p>
        <button type="button" className="btn-link" onClick={onClose}>
          Close
        </button>
      </div>
      <h2 id="skill-card-title">{piece.title}</h2>
      <p>
        <strong>{PIECE_LABEL[piece.state]}</strong>
        {piece.inTarget ? <span className="tag tag--real"> In your target</span> : null}
        {piece.inFocus ? <span className="tag"> In focus this season</span> : null}
      </p>
      <p className="meta">{piece.row.observable}</p>

      <div className="row">
        <a className="btn btn--primary" href={href({ name: 'practise', capabilityId: piece.capabilityId })}>
          {fresh ? 'Start this' : 'Practise this again'}
        </a>
      </div>
      {definition ? <p className="hint">One way to try it: {definition.nextExperiment}</p> : null}

      <div className="field">
        <label htmlFor="skill-place">Where you place yourself</label>
        <select
          id="skill-place"
          value={piece.claim ?? ''}
          onChange={(e) => {
            const level = e.target.value as ClaimLevel
            if (!CLAIM_LEVELS.includes(level)) return
            void save.run(async () => {
              const result = await run((data, deps) => placeSkills(data, [{ capabilityId: piece.capabilityId, level }], deps))
              return result.ok ? { ok: true } : { ok: false, errors: result.errors }
            })
          }}
        >
          <option value="" disabled>
            Not placed
          </option>
          {CLAIM_LEVELS.map((level) => (
            <option key={level} value={level}>
              {CLAIM_LABEL[level]}
            </option>
          ))}
        </select>
        <p className="hint">Your own judgement. It primes the piece; only recorded practice paints it.</p>
        <SaveStatus state={save.state} />
      </div>

      <h3>Its history</h3>
      {trail.length === 0 ? (
        <p className="empty">Nothing yet. This is a piece you could add.</p>
      ) : (
        <ol className="trail">
          {trail.slice(-6).map((entry, i) => (
            <li key={`${entry.at}-${i}`}>
              <span className="meta">{formatDateTime(entry.at)}</span>
              <strong> {entry.what}</strong>
              {entry.text ? <p>{entry.activityId ? <a href={href({ name: 'activity', id: entry.activityId })}>{entry.text}</a> : entry.text}</p> : null}
            </li>
          ))}
        </ol>
      )}
      <p className="meta">What this does not cover: {piece.row.limits}</p>
    </section>
  )
}

function Road({ tree }: { tree: Tree }) {
  const { run } = useApp()
  const save = useSave()
  const [branchId, setBranchId] = useState('')
  const [weeks, setWeeks] = useState(6)
  const [closing, setClosing] = useState<string | null>(null)
  const pick = branchId !== '' ? branchId : (tree.next[0]?.branchId ?? tree.branches[0]?.id ?? '')

  const begin = (id: string) =>
    void save.run(async () => {
      const branch = tree.branches.find((b) => b.id === id)
      const focus = (branch?.pieces ?? []).filter((p) => p.inTarget && (p.state === 'outline' || p.state === 'claimed')).map((p) => p.capabilityId)
      const result = await run((data, deps) => startSeason(data, { branchId: id, capabilityIds: focus, reviewOn: todayLocal(weeks * 7) }, deps))
      return result.ok ? { ok: true } : { ok: false, errors: result.errors }
    })

  return (
    <section className="road" aria-labelledby="road-heading">
      <h2 id="road-heading">The road ahead</h2>
      <ol className="road__stops">
        <li className="road__stop road__stop--now">
          <p className="kicker">Now</p>
          {tree.season ? (
            <>
              <p>
                <strong>{tree.season.title}</strong>
              </p>
              <p className="meta">
                A {tree.season.weeks}-week season, begun {formatDate(tree.season.startedOn)}.{' '}
                {tree.season.due
                  ? `Due a look since ${formatDate(tree.season.reviewOn)}. Nothing is late; it is simply time to look back.`
                  : `Look back on ${formatDate(tree.season.reviewOn)} — ${tree.season.daysLeft} day${tree.season.daysLeft === 1 ? '' : 's'} from now.`}
              </p>
              <div className="season-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(Math.max(4, Math.min(100, 100 - (tree.season.daysLeft / (tree.season.weeks * 7)) * 100)))}%` }} />
              </div>
              {closing === null ? (
                <button type="button" className="btn-quiet" onClick={() => setClosing('')}>
                  Look back and close this season
                </button>
              ) : (
                <div className="field">
                  <label htmlFor="season-closing">What did this season leave you with?</label>
                  <textarea id="season-closing" value={closing} onChange={(e) => setClosing(e.target.value)} />
                  <div className="row">
                    <button
                      type="button"
                      onClick={() =>
                        void save
                          .run(async () => {
                            const result = await run((data, deps) => endSeason(data, { closing: closing ?? '' }, deps))
                            return result.ok ? { ok: true } : { ok: false, errors: result.errors }
                          })
                          .then((done) => (done ? setClosing(null) : undefined))
                      }
                    >
                      Close the season
                    </button>
                    <button type="button" className="btn-quiet" onClick={() => setClosing(null)}>
                      Keep it open
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p>No branch is active. Pick one to work on for a while.</p>
              <div className="row">
                <label className="visually-hidden" htmlFor="season-branch">
                  Branch to work on
                </label>
                <select id="season-branch" value={pick} onChange={(e) => setBranchId(e.target.value)}>
                  {tree.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                      {b.open > 0 ? ` · ${b.open} open in your target` : ''}
                    </option>
                  ))}
                </select>
                <label className="visually-hidden" htmlFor="season-weeks">
                  For how long
                </label>
                <select id="season-weeks" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
                  {[4, 6, 8, 12].map((w) => (
                    <option key={w} value={w}>
                      {w} weeks
                    </option>
                  ))}
                </select>
                <button type="button" disabled={pick === ''} onClick={() => begin(pick)}>
                  Start a season
                </button>
              </div>
            </>
          )}
        </li>
        <li className="road__stop">
          <p className="kicker">Next</p>
          {tree.next.length === 0 ? (
            <p className="meta">{tree.target ? 'Nothing else is open in your target.' : 'Choose a target and the road fills in.'}</p>
          ) : (
            <ul className="road__list">
              {tree.next.map((stop) => (
                <li key={stop.branchId}>
                  <strong>{stop.title}</strong>
                  <span className="meta">
                    {' '}
                    · {stop.because === 'chosen' ? 'you queued it' : `${stop.open} piece${stop.open === 1 ? '' : 's'} open in your target`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </li>
        <li className="road__stop">
          <p className="kicker">Towards</p>
          <p>
            <strong>{tree.target ? tree.target.title : 'No target chosen'}</strong>
          </p>
          <p className="meta">
            {tree.target
              ? `${tree.totals.targetSize - tree.totals.targetOpen} of ${tree.totals.targetSize} pieces practised. ${tree.totals.targetOpen} still to add, in whatever order suits you.`
              : 'A target shows what you are building towards and which pieces are still outlines.'}
          </p>
        </li>
      </ol>
      <SaveStatus state={save.state} />
      {tree.pastSeasons.length > 0 ? (
        <details className="more">
          <summary>
            Seasons behind you <span className="meta">{tree.pastSeasons.length}</span>
          </summary>
          <div className="more__body">
            <ul>
              {tree.pastSeasons.map((s) => (
                <li key={s.id}>
                  <strong>{s.title}</strong>
                  <span className="meta">
                    {' '}
                    · {formatDate(s.startedOn)} to {s.endedOn ? formatDate(s.endedOn) : ''}
                  </span>
                  {s.closing ? <p>{s.closing}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}
    </section>
  )
}

export function TreeHome() {
  const { state, run } = useApp()
  const tree = useTree()
  const save = useSave()
  const [selected, setSelected] = useState<number | null>(null)
  const palette = mobilePalette(state.data.profile.appearance?.mobile?.paletteId)
  const shape = tree.branches.map((b) => `${b.id}:${b.pieces.map((p) => p.capabilityId).join(',')}`).join('|')
  const composition = useMemo(
    () => growMobile('tree', 'Skill tree', tree.branches.map((b) => ({ title: b.title, leaves: b.pieces.map((p) => p.title) }))),
    // The structure depends only on which skills exist, never on their state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shape],
  )
  const piece = selected !== null ? tree.pieces[selected] : undefined
  const finish: SheetFinish[] = tree.pieces.map((p) => ({
    state: p.state,
    target: p.inTarget,
    quiet: (selected !== null && p.slot !== selected) || (selected === null && tree.target !== null && !p.inTarget && !p.inFocus),
  }))
  const name = state.data.profile.displayName

  return (
    <div className="tree-home">
      <header className="tree-head">
        <div>
          <p className="kicker">{state.namespace === 'demo' ? 'Your mobile · fictional demo' : 'Your mobile'}</p>
          <h1>{name && state.namespace !== 'demo' ? name : 'What you have, and what you could add'}</h1>
        </div>
        <div className="tree-head__target">
          <label htmlFor="tree-target">Building towards</label>
          <select
            id="tree-target"
            value={tree.target?.id ?? ''}
            onChange={(e) =>
              void save.run(async () => {
                const result = await run((data, deps) => chooseTarget(data, e.target.value === '' ? null : e.target.value, deps))
                return result.ok ? { ok: true } : { ok: false, errors: result.errors }
              })
            }
          >
            <option value="">Nothing in particular</option>
            {TARGETS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="tree-main">
        <div className="tree-stage">
          <Mobile
            drawing={{
              composition,
              palette,
              marked: tree.pieces.filter((p) => p.inFocus).map((p) => p.slot),
              finish,
              weights: tree.pieces.map((p) => WEIGHT[p.state]),
              labels: tree.pieces.map((p) => p.title),
              groups: tree.branches.map((b) => ({ title: b.title, slots: b.pieces.map((p) => p.slot), active: b.active })),
            }}
            size="wide"
            selectable="all"
            selectedSlot={selected}
            onSelect={(slot) => setSelected(selected === slot ? null : slot)}
          />
          <p className="meta tree-stage__legend">
            {tree.totals.practised} practised · {tree.totals.have - tree.totals.practised} placed by you · {tree.totals.pieces - tree.totals.have} outlines you
            could add. <a href={href({ name: 'begin' })}>Place yourself on more skills</a>
          </p>
        </div>
        <div className="tree-side">{piece ? <SkillCard key={piece.capabilityId} piece={piece} onClose={() => setSelected(null)} /> : <Road tree={tree} />}</div>
      </div>

      <section aria-labelledby="branches-heading" className="branches">
        <h2 id="branches-heading">Every skill, by branch</h2>
        <div className="branches__grid">
          {tree.branches.map((branch) => (
            <div key={branch.id} className={branch.active ? 'branch-list is-active' : 'branch-list'}>
              <h3>
                {branch.title}
                {branch.active ? <span className="tag"> this season</span> : null}
              </h3>
              <ul>
                {branch.pieces.map((p) => (
                  <li key={p.capabilityId}>
                    <button type="button" className={`piece-button piece-button--${p.state}`} aria-pressed={selected === p.slot}
                      onClick={() => {
                        setSelected(selected === p.slot ? null : p.slot)
                        // Chosen from the list, the card and the mobile are up the page: go to them.
                        document.querySelector('.tree-main')?.scrollIntoView({ block: 'start' })
                      }}
                    >
                      <span>{p.title}</span>
                      <span className="meta">
                        {PIECE_LABEL[p.state]}
                        {p.inTarget ? ' · in your target' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      {save.state.kind === 'failed' ? <SaveStatus state={save.state} /> : null}
    </div>
  )
}
