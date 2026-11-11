/**
 * The session is what stops a change computed from an old screen from overwriting newer records.
 * These tests are about the failure cases, because the success case is the easy half.
 */
import { describe, expect, it, vi } from 'vitest'
import { createContentRegistry } from '~/content/index'
import { createDemoUserData } from '~/content/demo'
import { emptyUserData } from '~/domain/empty'
import { fixedClock, sequentialIdFactory } from '~/domain/ids'
import { createMemoryStore } from '~/storage/memory'
import { StorageError, type RecordStore } from '~/storage/types'
import { at, NOW } from '~/test-helpers/fixtures'
import { createDirection, recordSituation } from './commands'
import { AppSession } from './session'

function newSession(store: RecordStore, options: { demo?: boolean } = {}) {
  return new AppSession({
    store,
    content: createContentRegistry(),
    clock: fixedClock(NOW),
    newId: sequentialIdFactory('s'),
    ...(options.demo === false ? {} : { createDemoData: createDemoUserData }),
  })
}

const situationInput = {
  title: 'A question that keeps being reopened',
  description: '',
  context: 'Working group',
  desiredOutcome: '',
  authority: 'unclear' as const,
  decisionOwnership: 'unclear' as const,
  challenge: 'other' as const,
  constraints: [],
  supportAvailable: [],
}

describe('loading', () => {
  it('starts in the personal namespace with nothing stored', async () => {
    const session = newSession(createMemoryStore())
    await session.start()
    const state = session.getState()
    expect(state.status).toBe('ready')
    expect(state.namespace).toBe('personal')
    expect(state.revision).toBe(0)
    expect(state.data.situations).toHaveLength(0)
  })

  it('reports a storage failure as an error state rather than pretending to be empty', async () => {
    // An empty screen would look like "you have no records", which for somebody with a journal is
    // the most alarming possible lie.
    const store = createMemoryStore({ failWith: new StorageError('unavailable', 'Storage is blocked here.') })
    const session = newSession(store)
    await session.start()
    expect(session.getState().status).toBe('error')
    expect(session.getState().problem?.kind).toBe('unavailable')
  })

  it('seeds the demo the first time it is opened, and keeps it out of the personal namespace', async () => {
    const store = createMemoryStore()
    const session = newSession(store)
    await session.start()
    await session.switchNamespace('demo')
    expect(session.getState().data.situations.length).toBeGreaterThan(0)
    await session.switchNamespace('personal')
    expect(session.getState().data.situations).toHaveLength(0)
  })
})

describe('running a command', () => {
  it('saves the result and advances the revision', async () => {
    const session = newSession(createMemoryStore())
    await session.start()
    const result = await session.run((data, deps) => recordSituation(data, situationInput, deps))
    expect(result.ok).toBe(true)
    expect(session.getState().revision).toBe(1)
    expect(session.getState().data.situations).toHaveLength(1)
  })

  it('returns the command\u2019s own failure without touching storage', async () => {
    const session = newSession(createMemoryStore())
    await session.start()
    const result = await session.run((data, deps) => createDirection(data, { text: '   ' }, deps))
    expect(result.ok).toBe(false)
    expect(session.getState().revision).toBe(0)
    expect(session.getState().problem?.kind).toBe('command')
  })

  it('computes each queued command from the result of the one before it', async () => {
    // This is the whole point of the queue: two commands fired together must not both start from
    // the same base and lose one of the writes.
    const session = newSession(createMemoryStore())
    await session.start()
    const [first, second] = await Promise.all([
      session.run((data, deps) => recordSituation(data, { ...situationInput, title: 'First' }, deps)),
      session.run((data, deps) => recordSituation(data, { ...situationInput, title: 'Second' }, deps)),
    ])
    expect(first.ok && second.ok).toBe(true)
    expect(session.getState().data.situations.map((s) => s.title)).toEqual(['First', 'Second'])
    expect(session.getState().revision).toBe(2)
  })
})

describe('another tab saving first', () => {
  it('marks the session stale and refuses to save until it is reloaded', async () => {
    const store = createMemoryStore()
    const session = newSession(store)
    await session.start()
    await session.run((data, deps) => recordSituation(data, situationInput, deps))

    // Another tab writes. The subscription marks this session stale.
    const theirs = emptyUserData(at(0))
    theirs.profile.displayName = 'From another tab'
    store.externalWrite('personal', theirs)
    expect(session.getState().stale).toBe(true)

    const result = await session.run((data, deps) => recordSituation(data, { ...situationInput, title: 'Mine' }, deps))
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.kind).toBe('conflict')
    // Nothing of theirs was overwritten.
    const stored = await store.load('personal')
    expect(stored.data.profile.displayName).toBe('From another tab')
  })

  it('clears the stale flag and shows the other tab’s records after a reload', async () => {
    const store = createMemoryStore()
    const session = newSession(store)
    await session.start()
    const theirs = emptyUserData(at(0))
    theirs.profile.displayName = 'From another tab'
    store.externalWrite('personal', theirs)
    await session.reload()
    expect(session.getState().stale).toBe(false)
    expect(session.getState().data.profile.displayName).toBe('From another tab')
  })

  it('surfaces a conflict the store raises at save time', async () => {
    // Belt and braces: even without a notification, the revision check has to catch it.
    const store = createMemoryStore()
    const session = newSession(store)
    await session.start()
    const save = vi.spyOn(store, 'save').mockRejectedValueOnce(new StorageError('conflict', 'A newer version exists.'))
    const result = await session.run((data, deps) => recordSituation(data, situationInput, deps))
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.kind).toBe('conflict')
    expect(session.getState().stale).toBe(true)
    save.mockRestore()
  })
})

describe('switching between personal records and the demo', () => {
  it('does not write a change to the namespace the user has moved away from', async () => {
    // The dangerous version of this bug writes somebody's real note into the demo, or the demo's
    // fiction into their journal.
    const store = createMemoryStore()
    const session = newSession(store)
    await session.start()
    const pending = session.run((data, deps) => recordSituation(data, situationInput, deps))
    const switched = session.switchNamespace('demo')
    await Promise.all([pending, switched])
    const personal = await store.load('personal')
    const demo = await store.load('demo')
    // Either the write landed in personal before the switch, or it was refused; it must never be
    // in the demo, and the demo must still be the fiction.
    expect(demo.data.profile.displayName).toMatch(/fiction/i)
    expect(personal.data.situations.every((s) => s.title === situationInput.title)).toBe(true)
  })

  it('restores the demo rather than leaving it empty after deleting everything', async () => {
    const store = createMemoryStore()
    const session = newSession(store)
    await session.start()
    await session.switchNamespace('demo')
    const before = session.getState().data.situations.length
    expect(before).toBeGreaterThan(0)
    expect(await session.deleteAll()).toBe(true)
    expect(session.getState().data.situations.length).toBe(before)
  })

  it('leaves the personal namespace empty after deleting everything', async () => {
    const store = createMemoryStore()
    const session = newSession(store)
    await session.start()
    await session.run((data, deps) => recordSituation(data, situationInput, deps))
    expect(await session.deleteAll()).toBe(true)
    expect(session.getState().data.situations).toHaveLength(0)
    // Revisions never go backwards, so a stale tab cannot overwrite the deletion.
    expect(session.getState().revision).toBeGreaterThan(1)
  })

  it('refuses to reset the demo while the user is looking at their own records', async () => {
    const session = newSession(createMemoryStore())
    await session.start()
    const result = await session.resetDemo()
    expect(result.ok).toBe(false)
  })
})

describe('import', () => {
  it('replaces every record at once', async () => {
    const store = createMemoryStore()
    const session = newSession(store)
    await session.start()
    await session.run((data, deps) => recordSituation(data, situationInput, deps))
    const replacement = emptyUserData(at(0))
    replacement.profile.displayName = 'From a file'
    const result = await session.replaceAll(replacement)
    expect(result.ok).toBe(true)
    expect(session.getState().data.situations).toHaveLength(0)
    expect(session.getState().data.profile.displayName).toBe('From a file')
  })
})

describe('subscribers', () => {
  it('notifies on every state change and stops after unsubscribing', async () => {
    const session = newSession(createMemoryStore())
    const seen: string[] = []
    const unsubscribe = session.subscribe((state) => seen.push(state.status))
    await session.start()
    expect(seen).toContain('ready')
    unsubscribe()
    const before = seen.length
    await session.run((data, deps) => recordSituation(data, situationInput, deps))
    expect(seen).toHaveLength(before)
  })
})
