/** Application shell: navigation, namespace switch, truthful save and staleness banners. */
import { useEffect, type ReactNode } from 'react'
import { href, useRoute, type Route } from './router'
import { useApp } from './state'
import { StatusGate } from './primitives'
import { HomePage } from './pages/Home'
import { SituationsPage, NewSituationPage, SituationPage } from './pages/Situations'
import { CampaignPage } from './pages/Campaign'
import { ActivityPage } from './pages/Activity'
import { ProgressPage } from './pages/Progress'
import { RecordsPage } from './pages/Records'
import { ContentPage } from './pages/Content'
import { SettingsPage } from './pages/Settings'

const NAV: { route: Route; label: string }[] = [
  { route: { name: 'home' }, label: 'Home' },
  { route: { name: 'campaign' }, label: 'Campaign' },
  { route: { name: 'situations' }, label: 'Situations' },
  { route: { name: 'progress' }, label: 'What your records show' },
  { route: { name: 'records' }, label: 'All records' },
  { route: { name: 'content' }, label: 'Methods' },
  { route: { name: 'settings' }, label: 'Settings' },
]

function isCurrent(route: Route, current: Route): boolean {
  if (route.name === current.name) return true
  if (route.name === 'situations' && (current.name === 'new-situation' || current.name === 'situation')) return true
  return false
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomePage />
    case 'situations':
      return <SituationsPage />
    case 'new-situation':
      return <NewSituationPage />
    case 'situation':
      // Keyed by the record, not only by the route name. Without it React keeps the same
      // component instance across a navigation, and every form inside it keeps the state it
      // initialised from the FIRST record it ever saw — so one record's review, plan or
      // exploration could be saved onto another with a single click. The same mistake was
      // already fixed inside Campaign.tsx; this is the route-level half of it.
      return <SituationPage key={route.id} id={route.id} />
    case 'campaign':
      return <CampaignPage />
    case 'activity':
      return <ActivityPage key={route.id} id={route.id} />
    case 'progress':
      return <ProgressPage />
    case 'records':
      return <RecordsPage />
    case 'content':
      return <ContentPage />
    case 'settings':
      return <SettingsPage />
    case 'unknown':
      return (
        <section className="panel">
          <h1>That page does not exist</h1>
          <p>
            Nothing was lost. <a href={href({ name: 'home' })}>Go to the home screen</a>.
          </p>
        </section>
      )
  }
}

export function Shell(): ReactNode {
  const route = useRoute()
  const { state, switchNamespace, session, aiProvider } = useApp()

  // Move focus to the main region on navigation so keyboard and screen-reader users are not
  // returned to the top of the navigation on every page change.
  useEffect(() => {
    document.getElementById('main')?.focus()
  }, [route])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__top">
          <a className="wordmark" href={href({ name: 'home' })}>
            Skilling Me Softly
            <span>Capability development, kept in this browser</span>
          </a>
          <fieldset className="ns-switch">
            <legend className="visually-hidden">Which records you are looking at</legend>
            {(['personal', 'demo'] as const).map((ns) => (
              <label key={ns} className={state.namespace === ns ? 'is-on' : ''}>
                <input
                  type="radio"
                  name="namespace"
                  value={ns}
                  checked={state.namespace === ns}
                  onChange={() => switchNamespace(ns)}
                />
                {ns === 'personal' ? 'My records' : 'Fictional demo'}
              </label>
            ))}
          </fieldset>
        </div>
        <nav aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.label}>
                <a href={href(item.route)} aria-current={isCurrent(item.route, route) ? 'page' : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {state.namespace === 'demo' ? (
        <div className="banner banner--demo">
          <p>
            You are looking at fictional demo records. Every person and situation in them is invented. Your own records
            are untouched.
          </p>
        </div>
      ) : null}
      {state.stale ? (
        <div className="banner banner--stale" role="alert">
          <p>
            Another tab saved newer changes. Nothing has been overwritten, and saving is blocked here until you{' '}
            <button type="button" className="btn-link" onClick={() => void session.reload()}>
              reload these records
            </button>
            .
          </p>
        </div>
      ) : null}
      {state.problem && !state.stale ? (
        <div className="banner banner--problem" role="alert">
          <p>{state.problem.message}</p>
        </div>
      ) : null}

      <main id="main" tabIndex={-1}>
        <StatusGate>
          <Page route={route} />
        </StatusGate>
      </main>

      <footer className="site-footer">
        <div>
          <p>
            Everything you enter is stored in this browser only. There is no account, no server and no analytics.{' '}
            {/* Read from the provider rather than asserted, so this sentence cannot outlive the
                build it was written for: a live provider would change it here too. */}
            {aiProvider.sendsDataOffDevice
              ? `The optional sparring partner sends what you select to ${aiProvider.id}, off this device.`
              : 'The optional sparring partner is a local stand-in that makes no network request.'}{' '}
            Practice experience is a product convention, not an assessment of anybody’s ability.
          </p>
          <p className="meta">
            Records revision {state.revision}
            {state.savedAt ? ` · last saved ${state.savedAt}` : ' · nothing saved yet'}
          </p>
        </div>
      </footer>
    </>
  )
}
