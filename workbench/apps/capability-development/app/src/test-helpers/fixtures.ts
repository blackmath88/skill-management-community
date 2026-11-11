/**
 * Fictional fixtures for tests. Every value here is invented; none of it is drawn from a real
 * person, organisation or case. Timestamps are fixed so that ordering and deduplication tests
 * mean something.
 */
import { emptyUserData } from '~/domain/empty'
import { fixedClock, sequentialIdFactory, type Clock, type IdFactory } from '~/domain/ids'
import type {
  Attempt,
  EvidenceItem,
  PracticeActivity,
  Review,
  Situation,
  UserData,
  WorkingHypothesis,
} from '~/domain/types'
import { createContentRegistry } from '~/content/index'
import type { ContentRegistry } from '~/content/registry'
import type { CommandDeps } from '~/application/ports'

export const NOW = '2026-11-11T09:00:00.000Z'

export function at(minutes: number): string {
  return new Date(Date.UTC(2026, 10, 11, 9, minutes, 0)).toISOString()
}

export function testDeps(overrides: Partial<CommandDeps> = {}): CommandDeps {
  const content = overrides.content ?? createContentRegistry()
  return {
    clock: overrides.clock ?? fixedClock(NOW),
    newId: overrides.newId ?? sequentialIdFactory('t'),
    content,
  }
}

export function registry(): ContentRegistry {
  return createContentRegistry()
}

export function clock(iso = NOW): Clock {
  return fixedClock(iso)
}

export function ids(prefix = 't'): IdFactory {
  return sequentialIdFactory(prefix)
}

export function situation(overrides: Partial<Situation> = {}): Situation {
  return {
    id: 'sit-1',
    title: 'A question that keeps being reopened',
    description: 'Raised at four meetings with no decision recorded.',
    context: 'Cross-unit working group',
    desiredOutcome: 'One named person owns the approval.',
    authority: 'recommend',
    decisionOwnership: 'unclear',
    challenge: 'ownership',
    constraints: [],
    supportAvailable: [],
    createdAt: at(0),
    updatedAt: at(0),
    ...overrides,
  }
}

export function activity(overrides: Partial<PracticeActivity> = {}): PracticeActivity {
  return {
    id: 'act-1',
    situationId: 'sit-1',
    route: 'personal-practice',
    kind: 'real-attempt',
    title: 'Ask who can close this',
    plan: {
      cue: 'If the question is reopened on Thursday',
      action: 'Ask who can close this, and what they would need.',
      obstacle: 'The group answers with the substance instead.',
      fallback: 'Ask the sponsor afterwards in writing instead of pushing.',
      signal: 'A written answer naming a person, or a note that nobody could.',
      reviewOn: '2026-11-20',
    },
    capabilityIds: ['clarify-ownership'],
    methodIds: [],
    state: 'ready',
    createdAt: at(1),
    updatedAt: at(1),
    ...overrides,
  }
}

export function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: 'att-1',
    activityId: 'act-1',
    outcome: 'as-planned',
    note: 'Asked it. Nobody present could name who approves.',
    assistance: 'none',
    attemptedAt: at(5),
    createdAt: at(5),
    updatedAt: at(5),
    ...overrides,
  }
}

export function review(overrides: Partial<Review> = {}): Review {
  return {
    id: 'rev-1',
    activityId: 'act-1',
    observation: 'Nobody in the room could name the approver.',
    interpretation: 'The authority sits outside the group.',
    alternativeExplanation: 'Or people knew and did not want to say it in that room.',
    nextAdjustment: 'Ask the sponsor directly.',
    nextMove: 'escalate',
    reviewedAt: at(8),
    updatedAt: at(8),
    ...overrides,
  }
}

export function evidence(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: 'ev-1',
    activityId: 'act-1',
    kind: 'attributed-feedback',
    text: 'A participant said it was the first time anybody had asked it out loud.',
    source: 'user',
    attribution: 'a working-group participant',
    visibility: 'private',
    capabilityIds: ['clarify-ownership'],
    recordedAt: at(9),
    updatedAt: at(9),
    ...overrides,
  }
}

export function hypothesis(overrides: Partial<WorkingHypothesis> = {}): WorkingHypothesis {
  return {
    id: 'hyp-1',
    situationId: 'sit-1',
    category: 'conditions',
    text: 'The authority to close this may sit outside the group.',
    source: 'user',
    status: 'open',
    evidenceIds: [],
    createdAt: at(2),
    updatedAt: at(2),
    history: [{ at: at(2), status: 'open', text: 'The authority to close this may sit outside the group.' }],
    ...overrides,
  }
}

/** A record set with one situation, one reviewed real attempt and linked feedback. */
export function reviewedRealAttempt(): UserData {
  const data = emptyUserData(at(0))
  data.situations.push(situation())
  data.activities.push(activity({ state: 'reviewed' }))
  data.attempts.push(attempt())
  data.reviews.push(review())
  data.evidence.push(evidence())
  return data
}

export function withSituation(): UserData {
  const data = emptyUserData(at(0))
  data.situations.push(situation())
  return data
}
