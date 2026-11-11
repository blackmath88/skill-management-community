/**
 * Conversion of a Leader Me export, the predecessor application.
 *
 * Conversion is where a false record is easiest to create: the predecessor captured less than this
 * app records, so every gap has to stay a gap. A converted quest must not claim a cue that was
 * never written, an unaided attempt that was never recorded, or a review that never happened.
 */
import { describe, expect, it } from 'vitest'
import { validateUserData } from '~/domain/validation'
import type { PracticeActivity, UserData } from '~/domain/types'
import { at } from '~/test-helpers/fixtures'
import { CONVERTIBLE_LEGACY_VERSIONS, LEGACY_APP_ID, convertLeaderMeData } from './legacy'
import { parseImport } from './portability'
import type { ImportResult, ImportSummary } from './types'

const NOW = '2026-11-11T09:00:00.000Z'

const GALLUP_THEME = 'Strategic'
const CLAIM_TEXT = 'I am naturally good at closing decisions.'

/**
 * A Leader Me `data` object as that app wrote it: quests with an inline attempt, reflections keyed
 * by quest id, concept applications, perks linking quest ids, and the profile material this app
 * has no record type for.
 */
function leaderMeData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    profile: {
      displayName: 'Ren',
      updatedAt: at(0),
      focusSkillId: 'clarify-ownership',
      aspirations: ['Be the person who gets decisions closed.'],
      values: ['candour'],
      gallup: { themes: [GALLUP_THEME, 'Analytical'] },
    },
    avatar: { emblem: 'owl', palette: 'slate' },
    claims: [{ id: 'claim-1', text: CLAIM_TEXT }],
    situations: [
      {
        id: 'sit-1',
        title: 'A question that keeps being reopened',
        description: 'Raised at four meetings with no decision recorded.',
        context: 'Cross-unit working group',
        desiredOutcome: 'One named person owns the approval.',
        authority: 'recommend',
        decisionOwnership: 'unclear',
        challenge: 'ownership',
        createdAt: at(0),
      },
    ],
    quests: [
      {
        id: 'quest-1',
        situationId: 'sit-1',
        title: 'Ask who can close this',
        action: 'Ask who can close this, and what they would need.',
        intendedSignal: 'A written answer naming a person, or a note that nobody could.',
        reviewDate: '2026-11-20',
        skillIds: ['clarify-ownership'],
        methodId: 'decision-rights',
        templateId: 'ask-who-decides',
        state: 'completed',
        createdAt: at(1),
        updatedAt: at(2),
        attempt: {
          attemptedAt: at(5),
          outcome: 'as-planned',
          note: 'Asked it. Nobody present could name who approves.',
        },
      },
      {
        id: 'quest-2',
        situationId: 'sit-1',
        title: 'Write the decision down afterwards',
        action: 'Send a two-line note recording what was decided.',
        intendedSignal: 'Nobody reopens it at the next meeting.',
        reviewDate: '2026-11-21',
        skillIds: ['clarify-ownership'],
        state: 'completed',
        createdAt: at(3),
        updatedAt: at(4),
      },
      {
        id: 'quest-3',
        situationId: 'sit-deleted',
        title: 'A quest whose situation was deleted in Leader Me',
        action: 'Something that no longer has a setting.',
        state: 'completed',
        createdAt: at(6),
      },
    ],
    reflections: [
      {
        id: 'ref-1',
        questId: 'quest-1',
        observation: 'Nobody in the room could name the approver.',
        interpretation: 'The authority sits outside the group.',
        alternativeExplanation: 'Or people knew and did not want to say it in that room.',
        nextAdjustment: 'Ask the sponsor directly.',
        feedbackNote: 'A participant said it was the first time anybody had asked out loud.',
        reflectedAt: at(8),
        updatedAt: at(8),
      },
      {
        id: 'ref-3',
        questId: 'quest-3',
        observation: 'A reflection on a quest whose situation is gone.',
        reflectedAt: at(9),
      },
    ],
    applications: [
      {
        id: 'app-1',
        situationId: 'sit-1',
        methodId: 'decision-rights',
        response: 'Written through: the approval sits with the steering group, not the working group.',
        skillIds: ['clarify-ownership'],
        createdAt: at(10),
        updatedAt: at(10),
      },
      {
        id: 'app-2',
        situationId: 'sit-1',
        methodId: 'decision-rights',
        response: '   ',
        createdAt: at(11),
        updatedAt: at(11),
      },
      {
        id: 'app-3',
        situationId: 'sit-deleted',
        methodId: 'decision-rights',
        response: 'Written against a setting that no longer exists.',
        createdAt: at(12),
        updatedAt: at(12),
      },
    ],
    perks: [
      {
        id: 'perk-1',
        description: 'Asks the unasked question in the room.',
        evidenceQuestIds: ['quest-1', 'quest-3'],
        createdAt: at(13),
        updatedAt: at(13),
      },
    ],
    ...overrides,
  }
}

function leaderMeFile(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    app: LEGACY_APP_ID,
    schemaVersion: 2,
    exportedAt: at(0),
    data: leaderMeData(),
    ...overrides,
  })
}

function converted(): UserData {
  return convertLeaderMeData(leaderMeData(), NOW).data
}

/** Finds exactly the record a case is about, failing loudly if the conversion dropped it. */
function only<T>(items: readonly T[], matches: (item: T) => boolean, what: string): T {
  const found = items.filter(matches)
  if (found.length !== 1) throw new Error(`expected exactly one ${what} among ${found.length} matches`)
  const [first] = found
  if (first === undefined) throw new Error(`expected exactly one ${what}`)
  return first
}

function activityById(data: UserData, id: string): PracticeActivity {
  return only(data.activities, (activity) => activity.id === id, `activity "${id}"`)
}

function accepted(result: ImportResult): { data: UserData; summary: ImportSummary } {
  if (!result.ok) throw new Error(`expected the import to be accepted, but it was refused: ${result.errors.join('; ')}`)
  return { data: result.data, summary: result.summary }
}

describe('convertLeaderMeData', () => {
  it('turns a quest into a real attempt with no invented cue', () => {
    const activity = activityById(converted(), 'quest-1')

    expect(activity.kind).toBe('real-attempt')
    expect(activity.plan.action).toBe('Ask who can close this, and what they would need.')
    expect(activity.plan.signal).toBe('A written answer naming a person, or a note that nobody could.')
    // Leader Me had no cue field. A cue invented here would read as something the user wrote.
    expect(activity.plan.cue).toBe('')
  })

  it('records a converted attempt as assisted, because assistance was never captured', () => {
    const attempt = only(converted().attempts, (a) => a.activityId === 'quest-1', 'attempt for quest-1')

    // 'none' would assert the user managed unaided, which the predecessor never asked them.
    // Practice experience is weighted by assistance, so a wrong value here inflates their record.
    expect(attempt.assistance).toBe('app-prompts')
  })

  it('turns a reflection into a review and marks the activity reviewed', () => {
    const data = converted()

    const review = only(data.reviews, (r) => r.activityId === 'quest-1', 'review of quest-1')

    expect(review.observation).toBe('Nobody in the room could name the approver.')
    expect(activityById(data, 'quest-1').state).toBe('reviewed')
  })

  it('leaves a completed quest with no record of what happened as planned, not attempted', () => {
    // Two rules at once. A converted record must never claim a review that does not exist,
    // because a review is what this app treats as evidence of learning from an attempt. And a
    // quest the file calls completed while carrying no attempt object has no record of what
    // happened: importing it as "attempted" produced a record no command could move — the home
    // screen asked for a review for ever, the review was refused for want of an attempt, and
    // recording the attempt was refused because the state said there already was one.
    const activity = activityById(converted(), 'quest-2')
    expect(activity.state).toBe('ready')
    expect(converted().attempts.some((a) => a.activityId === 'quest-2')).toBe(false)
    expect(converted().reviews.some((r) => r.activityId === 'quest-2')).toBe(false)
  })

  it('says so in the summary, rather than quietly changing what the file claimed', () => {
    const notes = convertLeaderMeData(leaderMeData(), NOW).notes.join(' ')
    expect(notes).toMatch(/without any record of what happened/i)
  })

  it('keeps a reflection feedback note as the person’s own observation, not somebody else’s account', () => {
    // Leader Me captured a free-text "feedback note" and never captured who it came from.
    // Importing it as attributed feedback would show the person corroboration the records never
    // contained — and this app credits exactly that with a point of practice experience.
    const item = only(converted().evidence, (e) => e.reviewId === 'ref-1', 'feedback from ref-1')

    expect(item.kind).toBe('self-observation')
    expect(item.attribution).toBeUndefined()
    expect(item.sourceRef).toMatch(/who it came from was not recorded/i)
    expect(item.text).toBe('A participant said it was the first time anybody had asked out loud.')
  })

  it('keeps a written concept application as a self-observation and drops an empty one', () => {
    const data = converted()

    const item = only(data.evidence, (e) => e.id === 'app-1', 'converted application app-1')

    expect(item.kind).toBe('self-observation')
    // An empty response was a form the user opened and never wrote in. Keeping it would show
    // blank evidence against a situation.
    expect(data.evidence.some((e) => e.id === 'app-2')).toBe(false)
  })

  it('drops records whose situation is not in the file and converts a valid record set', () => {
    const data = converted()

    expect(data.activities.map((activity) => activity.id)).toEqual(['quest-1', 'quest-2'])
    expect(data.evidence.some((e) => e.id === 'app-3')).toBe(false)
    expect(data.reviews.some((r) => r.id === 'ref-3')).toBe(false)
    // Perk links were quest ids; a link to a dropped quest must go rather than dangle.
    expect(only(data.perks, (p) => p.id === 'perk-1', 'perk-1').evidenceActivityIds).toEqual(['quest-1'])
    // A dangling reference would fail validation on import, so the user would lose the whole file.
    expect(validateUserData(data).ok).toBe(true)
  })
})

describe('parseImport of a Leader Me export', () => {
  it('accepts a convertible Leader Me file and says it was converted', () => {
    const { summary } = accepted(parseImport(leaderMeFile(), { now: NOW }))

    // The user is told the file came from the predecessor and was rewritten, not read as-is.
    expect(summary.sourceApp).toBe(LEGACY_APP_ID)
    expect(summary.converted).toBe(true)
  })

  it('leaves out profile claims, Gallup themes and the saved avatar, and says so in the notes', () => {
    const { data, summary } = accepted(parseImport(leaderMeFile(), { now: NOW }))

    // None of the three has a record type here that could hold it truthfully: a standing claim
    // about a person, an external personality instrument, and an avatar for a different character.
    const everything = JSON.stringify(data)
    expect(everything).not.toContain(CLAIM_TEXT)
    expect(everything).not.toContain(GALLUP_THEME)
    expect(data.profile.appearance).toBeUndefined()
    // Dropping them silently would leave the user wondering what happened to their records.
    expect(summary.notes.some((note) => /claim/i.test(note))).toBe(true)
    expect(summary.notes.some((note) => /gallup/i.test(note))).toBe(true)
    expect(summary.notes.some((note) => /appearance/i.test(note))).toBe(true)
  })

  it('refuses a Leader Me version it cannot convert and names the versions it can', () => {
    const result = parseImport(leaderMeFile({ schemaVersion: 99 }), { now: NOW })

    if (result.ok) throw new Error('expected the unconvertible Leader Me file to be refused')
    // Guessing at an unknown predecessor version would convert fields whose meaning changed.
    const errors = result.errors.join(' ')
    expect(errors).toContain('99')
    expect(errors).toContain(CONVERTIBLE_LEGACY_VERSIONS.join(' and '))
  })
})

describe('a reflection on a quest that was never attempted', () => {
  it('is dropped with a note, rather than making the whole file unimportable', () => {
    // Regression: the converter used to emit a Review while leaving the activity in a planned
    // state, which validateUserData rejects — and because an import is all-or-nothing, one stray
    // record in an edited or truncated export cost the person every other record in it.
    const envelope = {
      app: 'leader-me',
      schemaVersion: 2,
      exportedAt: '2026-10-01T09:00:00.000Z',
      data: {
        schemaVersion: 2,
        profile: { values: [], aspirations: [], updatedAt: '2026-10-01T09:00:00.000Z' },
        claims: [],
        situations: [
          {
            id: 'sit-x',
            title: 'A situation',
            description: '',
            context: 'A group',
            desiredOutcome: '',
            authority: 'recommend',
            decisionOwnership: 'unclear',
            challenge: 'ownership',
            createdAt: '2026-10-01T09:00:00.000Z',
          },
        ],
        applications: [],
        quests: [
          {
            id: 'quest-never-tried',
            situationId: 'sit-x',
            methodId: 'collective-outcomes',
            skillIds: ['clarify-ownership'],
            title: 'Planned but never attempted',
            action: 'Ask the closing question',
            intendedSignal: 'A recorded answer',
            reviewDate: '2026-10-20',
            state: 'ready',
            createdAt: '2026-10-01T09:00:00.000Z',
            updatedAt: '2026-10-01T09:00:00.000Z',
          },
          {
            id: 'quest-tried',
            situationId: 'sit-x',
            methodId: 'collective-outcomes',
            skillIds: ['clarify-ownership'],
            title: 'Attempted and reflected on',
            action: 'Ask the closing question',
            intendedSignal: 'A recorded answer',
            reviewDate: '2026-10-20',
            state: 'attempted',
            attempt: { outcome: 'changed', note: 'Asked it.', attemptedAt: '2026-10-05T09:00:00.000Z' },
            createdAt: '2026-10-01T09:00:00.000Z',
            updatedAt: '2026-10-05T09:00:00.000Z',
          },
        ],
        reflections: [
          {
            id: 'refl-orphan',
            questId: 'quest-never-tried',
            observation: 'A reflection on something that never happened.',
            interpretation: '',
            alternativeExplanation: '',
            nextAdjustment: '',
            reflectedAt: '2026-10-06T09:00:00.000Z',
            updatedAt: '2026-10-06T09:00:00.000Z',
          },
          {
            id: 'refl-good',
            questId: 'quest-tried',
            observation: 'Nobody could name the approver.',
            interpretation: '',
            alternativeExplanation: '',
            nextAdjustment: '',
            reflectedAt: '2026-10-06T09:00:00.000Z',
            updatedAt: '2026-10-06T09:00:00.000Z',
          },
        ],
        perks: [],
      },
    }

    const result = parseImport(JSON.stringify(envelope), { now: '2026-11-11T09:00:00.000Z' })
    expect(result.ok, result.ok ? '' : result.errors.join('; ')).toBe(true)
    if (!result.ok) return
    // The good reflection survived; the orphan one did not; the rest of the file is intact.
    expect(result.data.reviews.map((r) => r.id)).toEqual(['refl-good'])
    expect(result.data.activities).toHaveLength(2)
    expect(result.summary.notes.join(' ')).toMatch(/1 reflection was not imported/)
    expect(result.summary.notes.join(' ')).toMatch(/never recorded as attempted/)
  })
})

describe('a real Leader Me export whose content ids this app does not define', () => {
  const envelopeWith = (skillIds: string[], methodId: string) => ({
    app: 'leader-me',
    schemaVersion: 2,
    exportedAt: '2026-10-01T09:00:00.000Z',
    data: {
      schemaVersion: 2,
      profile: { values: [], aspirations: [], focusSkillId: 'a-skill-we-never-had', updatedAt: '2026-10-01T09:00:00.000Z' },
      claims: [],
      situations: [
        {
          id: 'sit-y',
          title: 'A situation',
          description: '',
          context: 'A group',
          desiredOutcome: '',
          authority: 'recommend',
          decisionOwnership: 'unclear',
          challenge: 'ownership',
          createdAt: '2026-10-01T09:00:00.000Z',
        },
      ],
      applications: [
        {
          id: 'app-1',
          situationId: 'sit-y',
          methodId,
          skillIds,
          prompt: 'How does this lens apply?',
          response: 'It suggests the owner is unclear.',
          createdAt: '2026-10-01T09:00:00.000Z',
          updatedAt: '2026-10-01T09:00:00.000Z',
        },
      ],
      quests: [
        {
          id: 'quest-1',
          situationId: 'sit-y',
          methodId,
          skillIds,
          title: 'Ask the closing question',
          action: 'Ask who can close this',
          intendedSignal: 'A recorded answer',
          reviewDate: '2026-10-20',
          state: 'attempted',
          attempt: { outcome: 'changed', note: 'Asked it.', attemptedAt: '2026-10-05T09:00:00.000Z' },
          createdAt: '2026-10-01T09:00:00.000Z',
          updatedAt: '2026-10-05T09:00:00.000Z',
        },
      ],
      reflections: [],
      perks: [],
    },
  })

  const installed = {
    knownCapabilityIds: ['clarify-ownership'],
    knownMethodIds: ['decision-rights'],
    now: '2026-11-11T09:00:00.000Z',
  }

  it('keeps the records and drops the references this app cannot resolve', () => {
    // Regression: the converter carried the predecessor's method ids straight through, and the
    // import then validated them against the installed packs. Because an import is all-or-nothing,
    // one unresolvable method id refused the person's ENTIRE history — and the predecessor
    // required a method on every quest, so that was most real files.
    const result = parseImport(JSON.stringify(envelopeWith(['clarify-ownership', 'a-skill-we-never-had'], 'a-method-we-never-had')), installed)
    expect(result.ok, result.ok ? '' : result.errors.join('; ')).toBe(true)
    if (!result.ok) return

    const activity = result.data.activities[0]
    expect(activity).toBeDefined()
    expect(activity?.title).toBe('Ask the closing question')
    // The activity survived; only the references that resolve are kept.
    expect(activity?.capabilityIds).toEqual(['clarify-ownership'])
    expect(activity?.methodIds).toEqual([])
    expect(result.data.attempts).toHaveLength(1)

    const notes = result.summary.notes.join(' ')
    expect(notes).toMatch(/method reference was removed/i)
    expect(notes).toMatch(/a-method-we-never-had/)
    expect(notes).toMatch(/skill reference(s)? (was|were) removed/i)
    expect(notes).toMatch(/a-skill-we-never-had/)
    // The direction's focus pointed at a skill this app does not define, and was dropped too.
    expect(result.data.directions[0]?.focusCapabilityId).toBeUndefined()
  })

  it('keeps every reference when the installed ids are not supplied', () => {
    // Without knowing what is installed, the converter must not guess which ids are real.
    const { data } = convertLeaderMeData(
      envelopeWith(['clarify-ownership', 'a-skill-we-never-had'], 'a-method-we-never-had').data,
      NOW,
    )
    expect(data.activities[0]?.methodIds).toEqual(['a-method-we-never-had'])
    expect(data.activities[0]?.capabilityIds).toContain('a-skill-we-never-had')
  })

  it('imports a reflection’s feedback note as the person’s own observation, not as somebody else’s account', () => {
    // Regression: it arrived as `attributed-feedback`, which this app displays as "feedback from
    // others" and credits with a point of practice experience. Leader Me never recorded who the
    // feedback came from, so that was corroboration the records did not contain.
    const envelope = envelopeWith(['clarify-ownership'], 'decision-rights')
    envelope.data.reflections = [
      {
        id: 'refl-1',
        questId: 'quest-1',
        observation: 'Nobody could name the approver.',
        interpretation: '',
        alternativeExplanation: '',
        nextAdjustment: '',
        feedbackNote: 'Someone said afterwards that it was a good question.',
        reflectedAt: '2026-10-06T09:00:00.000Z',
        updatedAt: '2026-10-06T09:00:00.000Z',
      },
    ] as never
    const result = parseImport(JSON.stringify(envelope), installed)
    expect(result.ok, result.ok ? '' : result.errors.join('; ')).toBe(true)
    if (!result.ok) return
    const item = result.data.evidence.find((e) => e.text.includes('good question'))
    expect(item?.kind).toBe('self-observation')
    expect(item?.attribution).toBeUndefined()
    expect(result.summary.notes.join(' ')).toMatch(/not as an account from somebody else/i)
  })
})
