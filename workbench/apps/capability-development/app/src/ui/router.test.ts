import { describe, expect, it } from 'vitest'
import { href, parseRoute, sectionOf, type Route } from './router'

const EARLIER_ADDRESSES = ['#/', '#/situations', '#/situations/new', '#/situations/s1', '#/campaign', '#/activity/a1', '#/progress', '#/records', '#/content', '#/assemblage', '#/settings']

describe('routes after the redesign', () => {
  it('still serves every address that existed before it', () => {
    for (const hash of EARLIER_ADDRESSES) expect(parseRoute(hash).name, hash).not.toBe('unknown')
  })
  it('places every route in exactly one of the four destinations', () => {
    const routes: Route[] = [...EARLIER_ADDRESSES, '#/practice', '#/prepare', '#/prepare/s1', '#/repertoire'].map(parseRoute)
    for (const route of routes) expect(['home', 'practice', 'repertoire', 'settings']).toContain(sectionOf(route))
    expect(sectionOf(parseRoute('#/campaign'))).toBe('practice')
    expect(sectionOf(parseRoute('#/records'))).toBe('repertoire')
    expect(sectionOf(parseRoute('#/assemblage'))).toBe('settings')
  })
  it('round-trips the new routes, including a situation to prepare for', () => {
    for (const hash of ['#/practice', '#/repertoire', '#/prepare', '#/prepare/s%201']) expect(href(parseRoute(hash))).toBe(hash)
    expect(parseRoute('#/prepare/s%201')).toEqual({ name: 'prepare', situationId: 's 1' })
  })
})
