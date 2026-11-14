/**
 * A small hash router.
 *
 * The application has four destinations — Home, Practice, Repertoire, Settings — and every route
 * belongs to exactly one of them (`sectionOf`). The routes that existed before that structure
 * (`campaign`, `situations`, `progress`, `records`, `content`, `assemblage`) are all still
 * served at the same address, each inside the destination it now belongs to, so no saved link
 * and no bookmark stops working.
 *
 * A routing library was not added for this: the whole application is nine screens with no nested
 * layouts and no data loading, and a hash route keeps the built app openable from a file path as
 * well as a server. If deep linking or nested layouts ever matter, this is the one file to replace.
 */
import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'practice' }
  | { name: 'prepare'; situationId?: string }
  | { name: 'repertoire' }
  | { name: 'situations' }
  | { name: 'new-situation' }
  | { name: 'situation'; id: string }
  | { name: 'campaign' }
  | { name: 'activity'; id: string }
  | { name: 'progress' }
  | { name: 'records' }
  | { name: 'content' }
  | { name: 'assemblage' }
  | { name: 'settings' }
  | { name: 'unknown'; path: string }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '')
  const parts = path.split('/').filter((p) => p !== '')
  if (parts.length === 0) return { name: 'home' }
  const [head, second] = parts
  switch (head) {
    case 'practice':
      return { name: 'practice' }
    case 'prepare':
      return second !== undefined ? { name: 'prepare', situationId: decodeURIComponent(second) } : { name: 'prepare' }
    case 'repertoire':
      return { name: 'repertoire' }
    case 'situations':
      if (second === 'new') return { name: 'new-situation' }
      if (second !== undefined) return { name: 'situation', id: decodeURIComponent(second) }
      return { name: 'situations' }
    case 'campaign':
      return { name: 'campaign' }
    case 'activity':
      return second !== undefined ? { name: 'activity', id: decodeURIComponent(second) } : { name: 'home' }
    case 'progress':
      return { name: 'progress' }
    case 'records':
      return { name: 'records' }
    case 'content':
      return { name: 'content' }
    case 'assemblage':
      return { name: 'assemblage' }
    case 'settings':
      return { name: 'settings' }
    default:
      return { name: 'unknown', path }
  }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'practice':
      return '#/practice'
    case 'prepare':
      return route.situationId !== undefined ? `#/prepare/${encodeURIComponent(route.situationId)}` : '#/prepare'
    case 'repertoire':
      return '#/repertoire'
    case 'situations':
      return '#/situations'
    case 'new-situation':
      return '#/situations/new'
    case 'situation':
      return `#/situations/${encodeURIComponent(route.id)}`
    case 'campaign':
      return '#/campaign'
    case 'activity':
      return `#/activity/${encodeURIComponent(route.id)}`
    case 'progress':
      return '#/progress'
    case 'records':
      return '#/records'
    case 'content':
      return '#/content'
    case 'assemblage':
      return '#/assemblage'
    case 'settings':
      return '#/settings'
    case 'unknown':
      return `#/${route.path}`
  }
}

export type Section = 'home' | 'practice' | 'repertoire' | 'settings'

/** Which of the four destinations a route belongs to. Total: every route has one. */
export function sectionOf(route: Route): Section {
  switch (route.name) {
    case 'home':
    case 'unknown':
      return 'home'
    case 'practice':
    case 'prepare':
    case 'campaign':
    case 'situations':
    case 'new-situation':
    case 'situation':
    case 'activity':
      return 'practice'
    case 'repertoire':
    case 'progress':
    case 'records':
    case 'content':
      return 'repertoire'
    case 'settings':
    case 'assemblage':
      return 'settings'
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route)
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(typeof window === 'undefined' ? '' : window.location.hash),
  )
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onChange)
    onChange()
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
