/**
 * What your records show.
 *
 * Two projections, side by side and clearly separated: what the records show about each
 * capability, and practice experience as an explicit counting convention. Keeping them on one
 * screen is deliberate — the risk this product has to manage is somebody reading a number as a
 * measure of their ability, and the cure is for the number and the records to sit together with
 * the rules in plain sight.
 */
import { href } from '../router'
import { StageMark } from '../primitives'
import { useApp } from '../state'
import { KIND_LABEL } from '../primitives'
import { LEGACY_MILESTONE_LABEL } from '~/domain/evidence'
import { APPEARANCE_DISCLAIMER } from '~/domain/experience'
import { OUTCOME_LABEL } from './labels'

export function ProgressPage() {
  const { models, capabilities, content } = useApp()
  const { experience } = models
  const groups = content.capabilityGroups()

  return (
    <div className="stack">
      <header>
        <p className="kicker">What your records show</p>
        <h1>Two different things, kept apart</h1>
        <div className="lede">
          <p>
            <strong>What the records show</strong> is a description of what you actually documented for each
            capability. <strong>Practice experience</strong> is a counting convention this app applies to eligible
            records. Neither is an assessment of your ability, and nobody is scoring you.
          </p>
        </div>
      </header>

      <section className="panel">
        <h2>Capabilities</h2>
        <p className="hint">
          Each row says what your records contain and what would be recorded next. The marks are a position on a
          described ladder, not a grade.
        </p>
        {groups.map((group) => {
          const rows = capabilities.filter((row) => row.group === group.id)
          if (rows.length === 0) return null
          return (
            <div key={group.id}>
              <h3>{group.title}</h3>
              <p className="meta">{group.summary}</p>
              <ul className="record-list">
                {rows.map((row) => (
                  <li key={row.evidence.capabilityId}>
                    <div className="row">
                      <strong>{row.title}</strong>
                      <StageMark stage={row.evidence.stage} />
                      <span className="tag">{row.packTitle}</span>
                    </div>
                    <p className="meta">{row.observable}</p>
                    <p>{row.evidence.explanation}</p>
                    <dl className="pairs">
                      <dt>Written explorations</dt>
                      <dd>{row.evidence.counts.explorations}</dd>
                      <dt>Reviewed rehearsals</dt>
                      <dd>{row.evidence.counts.rehearsals}</dd>
                      <dt>Reviewed real attempts</dt>
                      <dd>{row.evidence.counts.realAttempts}</dd>
                      <dt>Distinct settings</dt>
                      <dd>{row.evidence.counts.contexts}</dd>
                      <dt>Feedback from others</dt>
                      <dd>{row.evidence.feedbackAvailable ? 'Yes, at least one account is linked' : 'None linked'}</dd>
                      {row.evidence.counts.conflictingAccounts > 0 ? (
                        <>
                          <dt>Accounts that differ from yours</dt>
                          <dd>
                            {row.evidence.counts.conflictingAccounts} — both are kept; this app does not decide which is
                            right
                          </dd>
                        </>
                      ) : null}
                      <dt>Practice experience attributed here</dt>
                      <dd>{row.experienceCredit}</dd>
                      <dt>In the older vocabulary</dt>
                      <dd>{LEGACY_MILESTONE_LABEL[row.evidence.legacyMilestone]}</dd>
                    </dl>
                    <p className="meta">What this definition does not cover: {row.limits}</p>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      <section className="panel">
        <h2>Practice experience: {experience.total}</h2>
        <p>
          <strong>{experience.policyLabel}.</strong> This is a prototype convention. The weights below have not been
          tested with real users and are expected to change; when they do, the version number changes with them and
          this page keeps explaining the old one.
        </p>
        <h3>What earns credit</h3>
        <ul>
          <li>An attempted observation or rehearsal: 1. An attempted real attempt: 2.</li>
          <li>A review that offers a competing explanation: +1.</li>
          <li>An account from somebody else, linked as evidence: +1.</li>
          <li>
            If the cue never arrived, nothing for the attempt — and 1 for noticing that and reviewing what blocked it.
          </li>
        </ul>
        <h3>What earns nothing</h3>
        <ul>
          {experience.nonCreditedNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p className="meta">
          Credit is counted once per activity. Tagging an activity with more capabilities shows it in more places on
          this page and adds nothing to the total. {APPEARANCE_DISCLAIMER}
        </p>
      </section>

      <section className="panel">
        <h2>Where the number comes from</h2>
        {experience.entries.length === 0 ? (
          <p className="empty">Nothing has been attempted yet, so there is nothing to count.</p>
        ) : (
          <ul className="record-list">
            {experience.entries.map((entry) => (
              <li key={entry.activityId}>
                <div className="row">
                  <a href={href({ name: 'activity', id: entry.activityId })}>{entry.title}</a>
                  <span className="tag">{KIND_LABEL[entry.kind]}</span>
                  <strong>{entry.credit}</strong>
                </div>
                <p className="meta">
                  {entry.outcome ? `${OUTCOME_LABEL[entry.outcome]}. ` : ''}
                  {entry.explanation}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="meta">
          Every number on this page is calculated from your records each time the page is drawn. Nothing is stored, so
          deleting a record removes what it contributed.
        </p>
      </section>
    </div>
  )
}
