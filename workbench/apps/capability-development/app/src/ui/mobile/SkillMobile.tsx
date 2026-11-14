/**
 * The grown mobile: one bough per branch of skills, one sheet per skill.
 *
 * On Repertoire it is a map of the skill set that is installed, in the person's own colours. A
 * sheet is marked when the person's records are linked to that skill — the same fact the list
 * below states in words — and the arms tip towards where those records are. It is a description
 * of where the records sit, not a score: a marked sheet is the same size and colour as a bare one.
 *
 * Every sheet can be reached without the picture: the labelled select beside it lists every skill
 * by branch, and choosing one does exactly what clicking its sheet does.
 */
import { useMemo, useState } from 'react'
import { PALETTES, mobilePalette, shapePath } from '~/mobile/catalogue'
import { growMobile, type Branch } from '~/mobile/grow'
import { Mobile } from './Mobile'
import { StageMark } from '../primitives'
import { useApp } from '../state'

function Glyph({ kind, colour }: { kind: Parameters<typeof shapePath>[0]; colour: string }) {
  return (
    <svg viewBox="-12 -12 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      {kind === 'ring' ? <circle r="7" fill="none" stroke={colour} strokeWidth="4" /> : <path d={shapePath(kind, 10)} fill={colour} />}
    </svg>
  )
}

export function SkillMobile() {
  const { state, content, capabilities } = useApp()
  const [selected, setSelected] = useState<number | null>(null)
  const palette = mobilePalette(state.data.profile.appearance?.mobile?.paletteId)

  const { composition, rows, branches } = useMemo(() => {
    const grouped = content
      .capabilityGroups()
      .map((group) => ({ group, rows: capabilities.filter((row) => row.group === group.id) }))
      .filter((entry) => entry.rows.length > 0)
    const list: Branch[] = grouped.map((entry) => ({ title: entry.group.title, leaves: entry.rows.map((row) => row.title) }))
    return { composition: growMobile('skills', 'Skills', list), rows: grouped.flatMap((entry) => entry.rows), branches: grouped }
  }, [content, capabilities])

  const marked = rows.flatMap((row, slot) => (row.evidence.stage !== 'none' ? [slot] : []))
  const row = selected !== null ? rows[selected] : undefined

  return (
    <div className="skill-mobile">
      <Mobile drawing={{ composition, palette, marked }} size="wide" selectable="all" selectedSlot={selected} onSelect={(slot) => setSelected(selected === slot ? null : slot)} />
      <div className="skill-mobile__side">
        <ul className="skill-mobile__legend">
          {branches.map((entry, b) => {
            const first = composition.shapes[rows.indexOf(entry.rows[0]!)]
            return (
              <li key={entry.group.id}>
                {first ? <Glyph kind={first.kind} colour={palette.tones[first.tone]} /> : null}
                <span>
                  {entry.group.title} <span className="meta">· {entry.rows.length}</span>
                </span>
                <span className="visually-hidden">, bough {b + 1}</span>
              </li>
            )
          })}
        </ul>
        <div className="field">
          <label htmlFor="skill-on-mobile">Find a skill on the mobile</label>
          <select id="skill-on-mobile" value={selected ?? ''} onChange={(e) => setSelected(e.target.value === '' ? null : Number(e.target.value))}>
            <option value="">None selected</option>
            {branches.map((entry) => (
              <optgroup key={entry.group.id} label={entry.group.title}>
                {entry.rows.map((r) => (
                  <option key={r.evidence.capabilityId} value={rows.indexOf(r)}>
                    {r.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {row ? (
          <div className="memory-detail" role="status">
            <p>
              <strong>{row.title}</strong>
            </p>
            <p>
              <StageMark stage={row.evidence.stage} />
            </p>
            <p className="meta">{row.evidence.stage === 'none' ? row.observable : row.evidence.explanation}</p>
            {row.evidence.refs.length > 0 ? (
              <button
                type="button"
                className="btn-link"
                onClick={() => document.getElementById(`capability-${row.evidence.capabilityId}`)?.scrollIntoView({ block: 'center' })}
              >
                Show its {row.evidence.refs.length} supporting record{row.evidence.refs.length === 1 ? '' : 's'}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="meta">
            A bead marks a skill your records are linked to; the arms tip towards them. Every sheet is the same size
            whether it is marked or not.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * A study, not a feature: how the same grammar carries a larger skill set. Synthetic names only.
 * Lives under Settings → Technical details so the question "what happens at thirty?" can be
 * answered by looking.
 */
export function MobileLab() {
  const [boughs, setBoughs] = useState(5)
  const [each, setEach] = useState(6)
  const [paletteId, setPaletteId] = useState(PALETTES[0]!.id)
  const [some, setSome] = useState(true)
  const composition = useMemo(
    () =>
      growMobile(
        'study',
        'Study',
        Array.from({ length: boughs }, (_, b) => ({
          title: `Branch ${String.fromCharCode(65 + b)}`,
          // Uneven on purpose: real branches are never the same size.
          leaves: Array.from({ length: Math.max(1, each + ((b * 2) % 3) - 1) }, (_, k) => `Skill ${String.fromCharCode(65 + b)}${k + 1}`),
        })),
      ),
    [boughs, each],
  )
  const total = composition.shapes.length
  const marked = some ? Array.from({ length: total }, (_, i) => i).filter((i) => (i * 7) % 5 === 0) : []
  return (
    <section className="panel">
      <h2>How the mobile scales: a study</h2>
      <p className="hint">
        Synthetic branches and skills, grown by the same rule that draws your repertoire. Nothing here is a record,
        and nothing you change here is saved. Currently {total} sheets on {boughs} boughs.
      </p>
      <div className="row">
        <label>
          Boughs{' '}
          <select value={boughs} onChange={(e) => setBoughs(Number(e.target.value))}>
            {[2, 3, 4, 5, 6, 7].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Skills on each, about{' '}
          <select value={each} onChange={(e) => setEach(Number(e.target.value))}>
            {[2, 3, 4, 5, 6, 7, 8].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Colours{' '}
          <select value={paletteId} onChange={(e) => setPaletteId(e.target.value)}>
            {PALETTES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={some} onChange={() => setSome(!some)} />
          Mark a few
        </label>
      </div>
      <Mobile drawing={{ composition, palette: mobilePalette(paletteId), marked }} size="wide" />
    </section>
  )
}
