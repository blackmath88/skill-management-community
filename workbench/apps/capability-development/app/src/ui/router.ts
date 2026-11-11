/**
 * A small hash router.
 *
 * A routing library was not added for this: the whole application is nine screens with no nested
 * layouts and no data loading, and a hash route keeps the built app openable from a file path as
 * well as a server. If deep linking or nested layouts ever matter, this is the one file to replace.
 */
import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'situations' }
  | { name: 'new-situation' }
  | { name: 'situation'; id: string }
  | { name: 'campaign' }
  | { name: 'activity'; id: string }
  | { name: 'progress' }
  | { name: 'records' }
  | { name: 'content' }
  | { name: 'settings' }
  | { name: 'unknown'; path: string }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '')
  const parts = path.split('/').filter((p) => p !== '')
  if (parts.length === 0) return { name: 'home' }
  const [head, second] = parts
  switch (head) {
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
    case 'settings':
      return '#/settings'
    case 'unknown':
      return `#/${route.path}`
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
