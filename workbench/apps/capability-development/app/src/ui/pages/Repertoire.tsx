/**
 * Repertoire: what you have actually practised, with the records behind it.
 *
 * Two readings of the same records. First the plain one — the things you tried and reflected on,
 * in your words. Then the capability reading, which only ever says what the records contain and
 * which records those are: every line of it can be opened down to the activity it rests on.
 *
 * Nothing here is a grade. A capability appears as practised only when the person linked a record
 * to it, which is why the two readings can differ and why the page says so instead of guessing.
 */
import { href } from '../router'
import { useApp } from '../state'
import { formatDateTime, KindTag, PageHead, StageMark } from '../primitives'
import { NEXT_MOVE_LABEL, OUTCOME_LABEL } from './labels'

export function RepertoirePage() {
  const { state, models, capabilities } = useApp()
  const { data } = state
  const reflected = [...data.reviews]
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))
    .flatMap((review) => {
      const activity = data.activities.find((a) => a.id === review.activityId)
      const attempt = data.attempts.find((a) => a.activityId === review.activityId)
      return activity && attempt ? [{ review, activity, attempt }] : []
    })
  const practised = capabilities.filter((row) => row.evidence.stage !== 'none')
  const untouched = capabilities.filter((row) => row.evidence.stage === 'none')

  return (
    <div className="stack">
      <PageHead kicker="Repertoire" title="What you have practised">
        <p>Built only from your own records. It describes what you documented; it does not rate how well it went.</p>
      </PageHead>

      {data.attempts.length === 0 ? (
        <section className="surface">
          <h2>Nothing here yet — and that is accurate</h2>
          <p>
            Your repertoire fills in when you try something and reflect on it. Nothing is added for visiting, and
            nothing is estimated for you.
          </p>
          <a className="btn btn--primary" href={href({ name: 'prepare' })}>
            Prepare a discussion
          </a>
        </section>
      ) : null}

      {reflected.length > 0 ? (
        <section className="panel" aria-labelledby="tried-heading">
          <h2 id="tried-heading">Tried and reflected on</h2>
          <ul className="record-list">
            {reflected.slice(0, 6).map(({ review, activity, attempt }) => {
              const situation = data.situations.find((s) => s.id === activity.situationId)
              const evidenceCount = data.evidence.filter(
                (e) => e.activityId === activity.id || e.attemptId === attempt.id || e.reviewId === review.id,
              ).length
              return (
                <li key={review.id}>
                  <div className="row">
                    <a href={href({ name: 'activity', id: activity.id })}>
                      <strong>{activity.title}</strong>
                    </a>
                    <KindTag kind={activity.kind} />
                  </div>
                  <p className="meta">
                    {situation?.context ? `${situation.context} · ` : ''}
                    {OUTCOME_LABEL[attempt.outcome]} · {formatDateTime(attempt.attemptedAt)}
                  </p>
                  <p>{review.observation}</p>
                  <p className="meta">
                    You decided: {NEXT_MOVE_LABEL[review.nextMove].toLowerCase()}.{' '}
                    {evidenceCount > 0 ? `${evidenceCount} piece${evidenceCount === 1 ? '' : 's'} of supporting evidence.` : 'No supporting evidence attached.'}
                  </p>
                </li>
              )
            })}
          </ul>
          <p className="meta">
            <a href={href({ name: 'records' })}>
              Full history{reflected.length > 6 ? ` (${reflected.length - 6} more reflections)` : ''}, including everything unreflected
            </a>
          </p>
        </section>
      ) : null}

      {data.attempts.length > 0 ? (
        <section className="panel" aria-labelledby="cap-heading">
          <h2 id="cap-heading">By capability</h2>
          <p className="hint">
            A position on a described ladder, with the records it rests on. Only records you linked to a capability
            count towards it.
          </p>
          {practised.length === 0 ? (
            <p className="empty">
              None of your records is linked to a capability yet. You can link one when you attach evidence to an
              activity, or when you prepare the next attempt.
            </p>
          ) : (
            <ul className="record-list">
              {practised.map((row) => (
                <li key={row.evidence.capabilityId} className="capability">
                  <div className="capability__head">
                    <h3>{row.title}</h3>
                    <StageMark stage={row.evidence.stage} />
                  </div>
                  <p>{row.evidence.explanation}</p>
                  <details className="more">
                    <summary>
                      Supporting records <span className="meta">{row.evidence.refs.length}</span>
                    </summary>
                    <div className="more__body">
                      <ul>
                        {row.evidence.refs.map((ref, index) => (
                          <li key={`${ref.activityId ?? ref.evidenceId ?? ''}-${index}`}>
                            {ref.activityId ? <a href={href({ name: 'activity', id: ref.activityId })}>{ref.title}</a> : ref.title}
                            <span className="meta">
                              {' '}
                              · {ref.kind}
                              {ref.context !== '' ? ` · ${ref.context}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="meta">
                        What you could observe: {row.observable} What this does not cover: {row.limits}
                      </p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
          {untouched.length > 0 ? (
            <details className="more">
              <summary>
                Not in your records <span className="meta">{untouched.length}</span>
              </summary>
              <div className="more__body">
                <p className="hint">Listed so you can see what exists, not as a list of gaps to close.</p>
                <ul>
                  {untouched.map((row) => (
                    <li key={row.evidence.capabilityId}>
                      {row.title} <span className="meta">· {row.packTitle}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      {data.perks.length > 0 ? (
        <section className="panel" aria-labelledby="strengths-heading">
          <h2 id="strengths-heading">Strengths you confirmed</h2>
          <ul className="record-list">
            {data.perks.map((perk) => (
              <li key={perk.id}>
                <p>{perk.description}</p>
                {perk.possibleOveruse ? <p className="meta">Where it can go wrong: {perk.possibleOveruse}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.attempts.length > 0 ? (
        <p className="meta">
          Practice experience: {models.experience.total}, under {models.experience.policyLabel}. A counting convention,
          not a score — <a href={href({ name: 'progress' })}>how it is counted</a>.
        </p>
      ) : null}
    </div>
  )
}
