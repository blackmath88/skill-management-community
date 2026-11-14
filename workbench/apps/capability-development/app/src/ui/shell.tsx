/**
 * Application shell: one navigation model, the records switch, truthful save and staleness
 * banners.
 *
 * Four destinations. On a wide screen they sit in a side rail; on a narrow one they are a bottom
 * tab bar within thumb reach, with the wordmark and the records switch in a slim top bar. It is
 * the same markup either way — one list of four links — so there is never a second navigation
 * to keep in step. Screens inside a destination share a second-level row of links (`SectionNav`).
 */
import { useEffect, useRef, type ReactNode } from 'react'
import { href, sectionOf, useRoute, type Route, type Section } from './router'
import { useApp } from './state'
import { StatusGate } from './primitives'
import { HomePage } from './pages/Home'
import { PracticePage } from './pages/Practice'
import { PreparePage } from './pages/Prepare'
import { RepertoirePage } from './pages/Repertoire'
import { SituationsPage, NewSituationPage, SituationPage } from './pages/Situations'
import { CampaignPage } from './pages/Campaign'
import { ActivityPage } from './pages/Activity'
import { ProgressPage } from './pages/Progress'
import { RecordsPage } from './pages/Records'
import { ContentPage } from './pages/Content'
import { AssemblagePage } from './pages/Assemblage'
import { SettingsPage } from './pages/Settings'

const ICON: Record<Section, ReactNode> = {
  home: <path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4z" />,
  practice: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  repertoire: (
    <>
      <path d="M5 5h14M5 12h14M5 19h14" />
      <circle cx="9" cy="5" r="1.6" fill="currentColor" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" />
      <circle cx="8" cy="19" r="1.6" fill="currentColor" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
}

const NAV: { section: Section; route: Route; label: string }[] = [
  { section: 'home', route: { name: 'home' }, label: 'Home' },
  { section: 'practice', route: { name: 'practice' }, label: 'Practice' },
  { section: 'repertoire', route: { name: 'repertoire' }, label: 'Repertoire' },
  { section: 'settings', route: { name: 'settings' }, label: 'Settings' },
]

/** The second level. A route missing from its section's list (one activity, say) marks nothing. */
const SECTION_NAV: Record<Section, { route: Route; label: string; also?: Route['name'][] }[]> = {
  home: [],
  practice: [
    { route: { name: 'practice' }, label: 'Overview', also: ['prepare', 'activity'] },
    { route: { name: 'campaign' }, label: 'Current journey' },
    { route: { name: 'situations' }, label: 'Situations', also: ['new-situation', 'situation'] },
  ],
  repertoire: [
    { route: { name: 'repertoire' }, label: 'Repertoire' },
    { route: { name: 'records' }, label: 'History' },
    { route: { name: 'content' }, label: 'Methods' },
    { route: { name: 'progress' }, label: 'How it is counted' },
  ],
  settings: [
    { route: { name: 'settings' }, label: 'Settings' },
    { route: { name: 'assemblage' }, label: 'Earlier assemblage' },
  ],
}

function SectionNav({ route }: { route: Route }) {
  const section = sectionOf(route)
  const items = SECTION_NAV[section]
  if (items.length === 0 || route.name === 'unknown') return null
  return (
    <nav className="subnav" aria-label={`Within ${NAV.find((n) => n.section === section)?.label ?? section}`}>
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <a
              href={href(item.route)}
              aria-current={item.route.name === route.name || item.also?.includes(route.name) ? 'page' : undefined}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomePage />
    case 'practice':
      return <PracticePage />
    case 'prepare':
      return <PreparePage key={route.situationId ?? 'new'} {...(route.situationId !== undefined ? { situationId: route.situationId } : {})} />
    case 'repertoire':
      return <RepertoirePage />
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
    case 'assemblage':
      return <AssemblagePage />
    case 'settings':
      return <SettingsPage />
    case 'unknown':
      return (
        <section>
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
  const section = sectionOf(route)

  // Move focus to the main region on navigation so keyboard and screen-reader users are not
  // returned to the top of the navigation on every page change.
  // Not on the first render: a page that has just loaded should start at the skip link, like any
  // other page, instead of dropping a keyboard user past the navigation they have not seen yet.
  const address = href(route)
  const previous = useRef(address)
  useEffect(() => {
    if (previous.current === address) return
    previous.current = address
    document.getElementById('main')?.focus()
    window.scrollTo(0, 0)
  }, [address])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-side">
        <a className="wordmark" href={href({ name: 'home' })}>
          Skilling Me Softly
          <span>Your practice, kept in this browser</span>
        </a>
        <nav className="app-nav" aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.section}>
                <a href={href(item.route)} aria-current={item.section === section ? 'page' : undefined}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {ICON[item.section]}
                  </svg>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="app-side__foot">
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
          <p className="app-side__note">Stored in this browser only. No account, no server.</p>
        </div>
      </header>

      <div className="app-body">
        {state.namespace === 'demo' ? (
          <div className="banner banner--demo">
            <p>
              You are looking at fictional demo records. Every person and situation in them is invented. Your own
              records are untouched.
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
            <SectionNav route={route} />
            <Page route={route} />
          </StatusGate>
        </main>

        <footer className="site-footer">
          <p>
            Everything you enter is stored in this browser only. There is no account, no server and no analytics.{' '}
            {/* Read from the provider rather than asserted, so this sentence cannot outlive the
                build it was written for: a live provider would change it here too. */}
            {aiProvider.sendsDataOffDevice
              ? `The optional sparring partner sends what you select to ${aiProvider.id}, off this device.`
              : 'The optional sparring partner is a local stand-in that makes no network request.'}{' '}
            Practice experience is a product convention, not an assessment of anybody’s ability.{' '}
            <a href={href({ name: 'settings' })}>Privacy and your data</a>
          </p>
        </footer>
      </div>
    </div>
  )
}
