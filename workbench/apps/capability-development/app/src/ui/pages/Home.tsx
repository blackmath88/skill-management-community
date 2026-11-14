/**
 * Home: one obvious next thing, your mobile, and what you last made of something.
 *
 * There is no streak, no daily goal and no count of visits. On a first visit the page is an
 * invitation to prepare one real conversation, and it is complete without any records. On a
 * return it leads with the single most useful next action from the development summary — with
 * the reason it is being suggested — and shows the latest reflection in the person's own words,
 * because the point of coming back is to pick up a thread, not to be told how much was done.
 *
 * Counts are one quiet line here. The fuller picture, and the practice-experience convention
 * with its rules, live under Repertoire.
 */
import { href } from '../router'
import { useApp } from '../state'
import { formatDate, formatDateTime, KindTag, RouteTag } from '../primitives'
import { MobilePanel } from '../mobile/MobilePanel'
import { NEXT_MOVE_LABEL } from './labels'
import type { NextAction } from '~/domain/summary'

export function actionHref(action: NextAction): string {
  switch (action.kind) {
    case 'review-attempt':
    case 'record-attempt':
    case 'finish-plan':
      return action.activityId ? href({ name: 'activity', id: action.activityId }) : href({ name: 'practice' })
    case 'continue-campaign':
      return href({ name: 'campaign' })
    case 'describe-situation':
      return href({ name: 'prepare' })
    case 'start-campaign':
      return href({ name: 'situations' })
    case 'decide-hypothesis':
      return href({ name: 'records' })
    case 'choose-direction':
      return href({ name: 'settings' })
    case 'nothing-pending':
      return href({ name: 'practice' })
  }
}

export function actionVerb(action: NextAction): string {
  switch (action.kind) {
    case 'review-attempt':
      return 'Reflect on it'
    case 'record-attempt':
      return 'Record what happened'
    case 'finish-plan':
      return 'Finish the plan'
    case 'continue-campaign':
      return 'Continue the journey'
    case 'describe-situation':
      return 'Prepare a discussion'
    case 'start-campaign':
      return 'Choose a situation'
    case 'decide-hypothesis':
      return 'Open your explanations'
    case 'choose-direction':
      return 'Write a direction'
    case 'nothing-pending':
      return 'Open Practice'
  }
}

function FirstVisit() {
  const { switchNamespace } = useApp()
  return (
    <div className="home">
      <div className="home__lead">
        <header>
          <p className="kicker">Welcome</p>
          <h1>Prepare for a conversation you are not looking forward to.</h1>
          <div className="lede">
            <p>
              Pick one difficult team discussion that is actually coming up. Plan how you will open it, rehearse if
              you like, then come back and note what happened.
            </p>
          </div>
          <div className="row">
            <a className="btn btn--primary btn--large" href={href({ name: 'prepare' })}>
              Prepare a discussion
            </a>
            <button type="button" className="btn-quiet" onClick={() => switchNamespace('demo')}>
              Look around with fictional records
            </button>
          </div>
          <p className="hint">
            About five minutes. Everything stays in this browser.{' '}
            <a href={href({ name: 'new-situation' })}>Or start from any other situation.</a>
          </p>
        </header>
        <MobilePanel />
      </div>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="visually-hidden">
          How one piece of practice goes
        </h2>
        <ol className="steps-preview">
          <li>
            <strong>Plan</strong>
            <span>When you will raise it, your opening words, and what you will do if it goes sideways.</span>
          </li>
          <li>
            <strong>Rehearse, if you want</strong>
            <span>Try the opening against a scripted counterpart. Marked as rehearsal, never as the real thing.</span>
          </li>
          <li>
            <strong>Have the conversation</strong>
            <span>Then record what happened — including “it never came up”, which is a real answer.</span>
          </li>
          <li>
            <strong>Reflect</strong>
            <span>What you saw, what you make of it, and what you will do next. Stopping is allowed.</span>
          </li>
        </ol>
      </section>
    </div>
  )
}

export function HomePage() {
  const { models, state } = useApp()
  const { summary } = models
  const { data } = state

  if (data.situations.length === 0 && data.activities.length === 0) return <FirstVisit />

  // Lead with something that is actually waiting: a plan to finish, an attempt to record, a
  // reflection to write, a running journey. The summary's general suggestions (write a direction,
  // start a journey) are real but are not "the next thing", so they are listed further down.
  // Which suggestions exist is the domain's decision; only their placement is decided here.
  const WAITING = ['review-attempt', 'record-attempt', 'finish-plan', 'continue-campaign', 'decide-hypothesis']
  const pending = summary.nextActions.find((a) => WAITING.includes(a.kind)) ?? null
  const others = summary.nextActions.filter((a) => a !== pending)
  const latestReview = [...data.reviews].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0]
  const reviewed = latestReview ? data.activities.find((a) => a.id === latestReview.activityId) : undefined
  const continues = latestReview && ['repeat', 'adapt', 'transfer'].includes(latestReview.nextMove)
  const waiting = [...summary.awaitingReview, ...summary.awaitingAttempt].filter((a) => a.id !== pending?.activityId)
  const counts = summary.counts

  return (
    <div className="home">
      <div className="home__lead">
        <div className="stack">
          <header>
            <p className="kicker">{state.namespace === 'demo' ? 'Home · fictional demo' : 'Home'}</p>
            <h1>{pending ? pending.label : continues ? 'Pick up where you left it.' : 'Nothing is waiting for you.'}</h1>
          </header>
          {pending ? (
            <div className="next">
              <p className="next__reason">
                {pending.reason} {pending.route ? <RouteTag route={pending.route} /> : null}
              </p>
              <div className="row">
                <a className="btn btn--primary btn--large" href={actionHref(pending)}>
                  {actionVerb(pending)}
                </a>
                <a href={href({ name: 'prepare' })}>Prepare a new discussion</a>
              </div>
            </div>
          ) : continues && reviewed ? (
            <div className="next">
              <p className="next__reason">
                Last time you decided to {NEXT_MOVE_LABEL[latestReview.nextMove].toLowerCase()}. When the next occasion
                is in sight, plan it — or leave it; nothing is overdue.
              </p>
              <div className="row">
                <a className="btn btn--primary btn--large" href={href({ name: 'prepare', situationId: reviewed.situationId })}>
                  Prepare the next attempt
                </a>
                <a href={href({ name: 'prepare' })}>Prepare a different discussion</a>
              </div>
            </div>
          ) : (
            <div className="next">
              <p className="next__reason">
                That is a fine place to be. When another conversation is coming up, you can prepare for it here.
              </p>
              <div className="row">
                <a className="btn btn--primary btn--large" href={href({ name: 'prepare' })}>
                  Prepare a discussion
                </a>
                <a href={href({ name: 'repertoire' })}>Look at your repertoire</a>
              </div>
            </div>
          )}
          {summary.activeDirection ? (
            <p className="meta">
              Your direction, in your words: “{summary.activeDirection.text}”{' '}
              <a href={href({ name: 'settings' })}>Revise</a>
            </p>
          ) : null}
        </div>
        <MobilePanel />
      </div>

      {latestReview && reviewed ? (
        <section aria-labelledby="last-heading">
          <div className="section-head">
            <h2 id="last-heading">Where you left it</h2>
            <span className="meta">Reflected {formatDateTime(latestReview.reviewedAt)}</span>
          </div>
          <div className="surface">
            <p className="row">
              <a href={href({ name: 'activity', id: reviewed.id })}>
                <strong>{reviewed.title}</strong>
              </a>
              <KindTag kind={reviewed.kind} />
            </p>
            <dl className="pairs">
              <dt>You observed</dt>
              <dd>{latestReview.observation}</dd>
              {latestReview.nextAdjustment !== '' ? (
                <>
                  <dt>Your adjustment</dt>
                  <dd>{latestReview.nextAdjustment}</dd>
                </>
              ) : null}
              <dt>You decided</dt>
              <dd>{NEXT_MOVE_LABEL[latestReview.nextMove]}</dd>
            </dl>
            <div className="row">
              {continues && pending ? (
                <a className="btn btn--quiet" href={href({ name: 'prepare', situationId: reviewed.situationId })}>
                  Prepare the next attempt
                </a>
              ) : null}
              <a href={href({ name: 'activity', id: reviewed.id })}>Open it, with its supporting evidence</a>
            </div>
          </div>
        </section>
      ) : null}

      {waiting.length > 0 || others.some((a) => a.kind !== 'nothing-pending' && a.kind !== 'describe-situation') ? (
        <section aria-labelledby="open-heading">
          <h2 id="open-heading">Also open</h2>
          <ul className="record-list">
            {waiting.map((activity) => (
              <li key={activity.id}>
                <div className="row">
                  <a href={href({ name: 'activity', id: activity.id })}>{activity.title}</a>
                  <KindTag kind={activity.kind} />
                </div>
                <p className="meta">
                  {activity.state === 'attempted' ? 'Attempted; not reflected on yet.' : 'Planned; not attempted yet.'}{' '}
                  {activity.plan.reviewOn ? `You set ${formatDate(activity.plan.reviewOn)} to look back on it.` : ''}
                </p>
              </li>
            ))}
            {others
              .filter((a) => a.kind !== 'nothing-pending' && a.kind !== 'describe-situation' && !waiting.some((w) => w.id === a.activityId))
              .map((action) => (
                <li key={`${action.kind}-${action.activityId ?? action.campaignId ?? action.hypothesisId ?? ''}`}>
                  <a href={actionHref(action)}>{action.label}</a>
                  <p className="meta">{action.reason}</p>
                </li>
              ))}
          </ul>
          <p className="hint">
            Nothing here is overdue in a way that counts against you. Recording that something did not happen is a
            useful answer, and so is pausing.
          </p>
        </section>
      ) : null}

      <p className="meta">
        Recorded so far: {counts.situations} situation{counts.situations === 1 ? '' : 's'} · {counts.realAttempts} real
        attempt{counts.realAttempts === 1 ? '' : 's'} · {counts.rehearsals} rehearsal{counts.rehearsals === 1 ? '' : 's'} ·{' '}
        {counts.reviews} reflection{counts.reviews === 1 ? '' : 's'}. These describe what you documented, not how well
        anything went. <a href={href({ name: 'repertoire' })}>Your repertoire</a>
      </p>
    </div>
  )
}
