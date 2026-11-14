/**
 * Begin: nobody starts from nothing.
 *
 * Two short steps. Choose what you are building towards (or nothing yet), then say where you
 * already stand on its skills, in your own judgement. The answers build the first version of the
 * mobile at once. They are stored as placements — your own statements — and are never shown as
 * practice: a placed skill is primed, and only something you record paints it.
 *
 * Everything here can be skipped, redone and changed later, and "not yet" is a real answer.
 */
import { useState } from 'react'
import { chooseTarget, placeSkills } from '~/application/commands'
import { TARGETS } from '~/content/targets'
import { CLAIM_LEVELS, type ClaimLevel } from '~/domain/types'
import { CLAIM_LABEL } from '~/mobile/tree'
import { PageHead, SaveStatus, useSave } from '../primitives'
import { href, navigate } from '../router'
import { useApp } from '../state'

export function BeginPage() {
  const { state, content, run } = useApp()
  const save = useSave()
  const journey = state.data.profile.journey
  const [targetId, setTargetId] = useState<string | null>(journey?.targetId ?? TARGETS[0]!.id)
  const [levels, setLevels] = useState<Record<string, ClaimLevel>>(() => Object.fromEntries((journey?.claims ?? []).map((c) => [c.capabilityId, c.level])))
  const [all, setAll] = useState(false)

  const chosen = TARGETS.find((t) => t.id === targetId)
  const groups = content.capabilityGroups()
  const shown = content.capabilities().filter((c) => all || !chosen || chosen.capabilityIds.includes(c.id))
  const placed = Object.keys(levels).length

  const build = () =>
    void save.run(async () => {
      const result = await run((data, deps) => {
        const withTarget = chooseTarget(data, targetId, deps)
        if (!withTarget.ok) return withTarget
        return placeSkills(withTarget.data, Object.entries(levels).map(([capabilityId, level]) => ({ capabilityId, level })), deps)
      })
      if (result.ok) navigate({ name: 'home' })
      return result.ok ? { ok: true } : { ok: false, errors: result.errors }
    })

  return (
    <div className="stack">
      <PageHead kicker="Begin" title="Start with what you already do">
        <p>
          You are not starting from nothing. Say where you stand, in your own judgement, and your mobile is built from
          it. Nobody else sees this, and none of it counts as practice.
        </p>
      </PageHead>

      <fieldset>
        <legend>1 · What are you building towards?</legend>
        <div className="option-tiles">
          {TARGETS.map((option) => (
            <label key={option.id} className="option-tile">
              <input type="radio" name="target" checked={targetId === option.id} onChange={() => setTargetId(option.id)} />
              <strong>{option.title}</strong>
              <span className="meta">{option.summary}</span>
              <span className="meta">{option.capabilityIds.length} skills · {option.note}</span>
            </label>
          ))}
          <label className="option-tile">
            <input type="radio" name="target" checked={targetId === null} onChange={() => setTargetId(null)} />
            <strong>Nothing in particular yet</strong>
            <span className="meta">See the whole tree and decide later. You can choose a target at any time.</span>
          </label>
        </div>
      </fieldset>

      <section className="panel" aria-labelledby="place-heading">
        <h2 id="place-heading">2 · Where do you stand today?</h2>
        <p className="hint">
          A quick, honest guess is enough. Leave anything blank; blank and “not yet” both show as an outline you could
          add. {chosen ? `Showing the ${shown.length} skills of “${chosen.title}”.` : `Showing all ${shown.length} skills.`}{' '}
          {chosen ? (
            <button type="button" className="btn-link" onClick={() => setAll(!all)}>
              {all ? 'Show only the target' : 'Show every skill'}
            </button>
          ) : null}
        </p>
        {groups.map((group) => {
          const skills = shown.filter((c) => c.group === group.id)
          if (skills.length === 0) return null
          return (
            <div key={group.id} className="placing">
              <h3>{group.title}</h3>
              {skills.map((skill) => (
                <fieldset key={skill.id} className="placing__row">
                  <legend>{skill.title}</legend>
                  <p className="meta">{skill.observable}</p>
                  <div className="placing__levels">
                    {CLAIM_LEVELS.map((level) => (
                      <label key={level} className={levels[skill.id] === level ? 'is-on' : ''}>
                        <input type="radio" name={`level-${skill.id}`} checked={levels[skill.id] === level} onChange={() => setLevels({ ...levels, [skill.id]: level })} />
                        {CLAIM_LABEL[level]}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          )
        })}
      </section>

      <div className="row">
        <button type="button" className="btn--primary btn--large" onClick={build} disabled={save.state.kind === 'saving'}>
          {journey ? 'Update my mobile' : 'Build my mobile'}
        </button>
        <a href={href({ name: 'home' })}>Cancel</a>
        <span className="meta">{placed === 0 ? 'Nothing placed yet — that is allowed.' : `${placed} skill${placed === 1 ? '' : 's'} placed.`}</span>
      </div>
      <SaveStatus state={save.state} />
    </div>
  )
}
