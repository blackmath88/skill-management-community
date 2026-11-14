// @vitest-environment jsdom
/**
 * The other guard the suite was missing.
 *
 * An independent reviewer showed that navigating from one record to another left the second
 * record's forms holding the first one's text — because React keeps the same component instance
 * in the same tree position, and every form initialises its state from the first record it ever
 * sees. Two navigations and one click wrote one person's review onto a different activity.
 *
 * Nothing in the suite drove the interface, so nothing could see it. This mounts the real shell
 * against an in-memory store and navigates the way a person does.
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createContentRegistry } from '~/content/index'
import { emptyUserData } from '~/domain/empty'
import { at, situation } from '~/test-helpers/fixtures'
import { createMemoryStore } from '~/storage/memory'
import type { RecordStore } from '~/storage/types'
import type { UserData } from '~/domain/types'
import { AppProvider } from './state'
import { Shell } from './shell'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
})

const tick = () => new Promise((resolve) => setTimeout(resolve, 20))

let root: Root | null = null
let host: HTMLDivElement | null = null

afterEach(async () => {
  if (root) {
    const current = root
    await act(async () => current.unmount())
  }
  root = null
  host?.remove()
  host = null
  window.location.hash = ''
})

beforeEach(() => {
  window.location.hash = ''
  try {
    window.localStorage.clear()
  } catch {
    // Not critical.
  }
})

async function mount(store: RecordStore): Promise<void> {
  host = document.createElement('div')
  document.body.append(host)
  const created = createRoot(host)
  root = created
  await act(async () => {
    created.render(
      <AppProvider store={store} content={createContentRegistry()}>
        <Shell />
      </AppProvider>,
    )
  })
  await act(tick)
}

async function navigate(hash: string): Promise<void> {
  await act(async () => {
    window.location.hash = hash
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  await act(tick)
}

/** Two situations, each with one attempted activity; the first activity is reviewed. */
function twoOfEach(): UserData {
  const data = emptyUserData(at(0))
  for (const n of [1, 2]) {
    data.situations.push(situation({ id: `sit-${n}`, title: `Situation ${n}`, context: `Setting ${n}` }))
    data.activities.push({
      id: `act-${n}`,
      situationId: `sit-${n}`,
      route: 'personal-practice',
      kind: 'real-attempt',
      title: `Activity ${n}`,
      plan: {
        cue: `CUE-${n}`,
        action: `ACTION-${n} that is long enough`,
        obstacle: `OBSTACLE-${n} long enough`,
        fallback: `FALLBACK-${n} long enough`,
        signal: `SIGNAL-${n} long enough`,
        reviewOn: '2026-11-20',
      },
      capabilityIds: ['clarify-ownership'],
      methodIds: [],
      state: n === 1 ? 'reviewed' : 'attempted',
      createdAt: at(n),
      updatedAt: at(n),
    })
    data.attempts.push({
      id: `att-${n}`,
      activityId: `act-${n}`,
      outcome: 'as-planned',
      note: `NOTE-${n}`,
      assistance: 'none',
      attemptedAt: at(n + 5),
      createdAt: at(n + 5),
      updatedAt: at(n + 5),
    })
  }
  data.reviews.push({
    id: 'rev-1',
    activityId: 'act-1',
    observation: 'OBSERVATION-ONE',
    interpretation: 'INTERPRETATION-ONE',
    alternativeExplanation: 'ALTERNATIVE-ONE',
    nextAdjustment: 'ADJUSTMENT-ONE',
    nextMove: 'adapt',
    reviewedAt: at(9),
    updatedAt: at(9),
  })
  return data
}

function textareaValues(): string[] {
  return [...document.querySelectorAll('textarea')].map((node) => (node as HTMLTextAreaElement).value)
}

function inputValues(selector = 'input[type="text"]'): string[] {
  return [...document.querySelectorAll(selector)].map((node) => (node as HTMLInputElement).value)
}

describe('navigating between two records of the same kind', () => {
  it('does not carry one activity’s review into another’s form', async () => {
    // The proven defect: with no key on the page, activity 2's review form arrived pre-filled
    // with activity 1's review, and one click on "Save the reflection" stored it against activity 2.
    const store = createMemoryStore()
    await store.save('personal', twoOfEach(), 0)
    await mount(store)

    await navigate('#/activity/act-1')
    expect(document.body.textContent).toContain('Activity 1')
    expect(document.body.textContent).toContain('OBSERVATION-ONE')

    await navigate('#/activity/act-2')
    expect(document.body.textContent).toContain('Activity 2')
    const values = textareaValues()
    expect(values.join(' ')).not.toContain('OBSERVATION-ONE')
    expect(values.join(' ')).not.toContain('ALTERNATIVE-ONE')
    expect(values.join(' ')).not.toContain('ADJUSTMENT-ONE')
  })

  it('does not hide a saved review behind another activity’s empty editor', async () => {
    // The reverse order, which was worse: activity 1's saved review was replaced on screen by
    // activity 2's empty draft, and one click wiped the review and its practice-experience credit.
    const store = createMemoryStore()
    await store.save('personal', twoOfEach(), 0)
    await mount(store)

    await navigate('#/activity/act-2')
    expect(document.body.textContent).toContain('Activity 2')

    await navigate('#/activity/act-1')
    expect(document.body.textContent).toContain('OBSERVATION-ONE')
    expect(document.body.textContent).toContain('ALTERNATIVE-ONE')
  })

  it('does not carry one situation’s exploration draft into another', async () => {
    const store = createMemoryStore()
    await store.save('personal', twoOfEach(), 0)
    await mount(store)

    await navigate('#/situations/sit-1')
    expect(document.body.textContent).toContain('Situation 1')
    const openButton = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Apply a method to this situation'),
    )
    expect(openButton).toBeDefined()
    await act(async () => openButton?.click())
    await act(tick)

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null
    expect(textarea).not.toBeNull()
    if (textarea) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
      await act(async () => {
        setter?.call(textarea, 'THINKING-ABOUT-SITUATION-ONE')
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }
    expect(textareaValues().join(' ')).toContain('THINKING-ABOUT-SITUATION-ONE')

    await navigate('#/situations/sit-2')
    expect(document.body.textContent).toContain('Situation 2')
    // The second situation's page must not be showing the first one's draft, open or otherwise.
    expect(textareaValues().join(' ')).not.toContain('THINKING-ABOUT-SITUATION-ONE')
    expect(document.body.textContent).not.toContain('THINKING-ABOUT-SITUATION-ONE')
  })

  it('does not carry one activity’s plan editor into another', async () => {
    const store = createMemoryStore()
    const data = twoOfEach()
    // Neither has an attempt, so both plans are editable.
    data.attempts = []
    data.reviews = []
    for (const activity of data.activities) activity.state = 'ready'
    await store.save('personal', data, 0)
    await mount(store)

    await navigate('#/activity/act-1')
    const edit = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Edit the plan')
    await act(async () => edit?.click())
    await act(tick)
    expect(textareaValues().join(' ')).toContain('CUE-1')

    await navigate('#/activity/act-2')
    expect(document.body.textContent).toContain('Activity 2')
    expect(textareaValues().join(' ')).not.toContain('CUE-1')
    expect(document.body.textContent).toContain('CUE-2')
  })

  it('shows the right title and the right records after a navigation', async () => {
    const store = createMemoryStore()
    await store.save('personal', twoOfEach(), 0)
    await mount(store)
    await navigate('#/activity/act-1')
    await navigate('#/activity/act-2')
    expect(document.body.textContent).toContain('NOTE-2')
    expect(document.body.textContent).not.toContain('NOTE-1')
    void inputValues
  })
})
