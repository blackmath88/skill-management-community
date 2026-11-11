/**
 * Conversion of a Leader Me export into this application's record set.
 *
 * Leader Me is the predecessor (blackmath88/leader-me). Its exports carry quests, reflections,
 * concept applications and profile claims. Those are converted, not reinterpreted: a quest
 * becomes a real-attempt activity because that is what a quest was, a reflection becomes a
 * review, and a concept application becomes a written exploration. Nothing is upgraded: a record
 * that did not show workplace application before does not show it afterwards.
 *
 * Gallup themes and profile claims are NOT imported. They were personality-adjacent claims in the
 * predecessor's model and this application has no record type that could hold them truthfully.
 * The conversion says so in its notes rather than dropping them silently.
 */
import { emptyUserData } from '~/domain/empty'
import { SCHEMA_VERSION, type Attempt, type EvidenceItem, type PracticeActivity, type Review, type Situation, type UserData } from '~/domain/types'

export const LEGACY_APP_ID = 'leader-me'
/** Export format versions of Leader Me this build can convert. */
export const CONVERTIBLE_LEGACY_VERSIONS: readonly number[] = [1, 2]

type Obj = Record<string, unknown>

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(o: Obj, key: string, fallback = ''): string {
  const v = o[key]
  return typeof v === 'string' ? v : fallback
}

function strArr(o: Obj, key: string): string[] {
  const v = o[key]
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function arr(o: Obj, key: string): Obj[] {
  const v = o[key]
  return Array.isArray(v) ? v.filter(isObj) : []
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

function iso(o: Obj, key: string, fallback: string): string {
  const v = str(o, key)
  return ISO.test(v) ? v : fallback
}

function date(o: Obj, key: string): string {
  const v = str(o, key)
  return DATE.test(v) ? v : ''
}

export interface LegacyConversion {
  data: UserData
  notes: string[]
}

/**
 * Capability and method ids the installed content packs define.
 *
 * A Leader Me export carries the predecessor's own skill and method ids. The capability ids were
 * deliberately kept the same, so those usually resolve; the method ids largely do not, because
 * this app authored its own methods. Carrying an unknown id straight through would make the
 * converted set fail validation — and an import is all-or-nothing, so a single unresolvable
 * method id would refuse the person's entire history. Unknown references are dropped from the
 * activity and reported, exactly as Gallup themes and profile claims are.
 */
export interface KnownContentIds {
  capabilityIds: readonly string[]
  methodIds: readonly string[]
}

/** Which attempt outcomes the predecessor recorded, mapped onto this application's outcomes. */
const OUTCOME_MAP: Record<string, Attempt['outcome']> = {
  'as-planned': 'as-planned',
  changed: 'changed',
  stopped: 'stopped',
  interrupted: 'interrupted',
}

/**
 * Convert a validated-shape Leader Me `data` object. Called only after the envelope said the file
 * is a Leader Me export of a convertible version; the result is validated like any other import.
 */
export function convertLeaderMeData(input: unknown, now: string, known?: KnownContentIds): LegacyConversion {
  const notes: string[] = []
  const data = emptyUserData(now)
  if (!isObj(input)) return { data, notes: ['The file contained no records to convert.'] }
  const knownCapabilities = known ? new Set(known.capabilityIds) : null
  const knownMethods = known ? new Set(known.methodIds) : null
  const droppedCapabilities = new Set<string>()
  const droppedMethods = new Set<string>()
  const keepCapabilities = (ids: string[]): string[] =>
    ids.filter((id) => {
      if (!knownCapabilities || knownCapabilities.has(id)) return true
      droppedCapabilities.add(id)
      return false
    })
  const keepMethod = (id: string): string[] => {
    if (id === '') return []
    if (!knownMethods || knownMethods.has(id)) return [id]
    droppedMethods.add(id)
    return []
  }

  const profile = isObj(input.profile) ? input.profile : {}
  const displayName = str(profile, 'displayName')
  if (displayName !== '') data.profile.displayName = displayName
  data.profile.updatedAt = iso(profile, 'updatedAt', now)

  const rawFocus = str(profile, 'focusSkillId')
  const focus = rawFocus === '' || !knownCapabilities || knownCapabilities.has(rawFocus) ? rawFocus : ''
  if (rawFocus !== '' && focus === '') droppedCapabilities.add(rawFocus)
  const aspirations = strArr(profile, 'aspirations')
  if (aspirations.length > 0 || focus !== '') {
    const text = aspirations[0] ?? 'Continue the development focus carried over from Leader Me.'
    data.directions.push({
      id: `legacy-direction`,
      text,
      ...(focus !== '' ? { focusCapabilityId: focus } : {}),
      state: 'active',
      createdAt: data.profile.updatedAt,
      updatedAt: data.profile.updatedAt,
      history: [{ at: data.profile.updatedAt, text, state: 'active', note: 'Carried over from a Leader Me export.' }],
    })
    notes.push('Your first Leader Me aspiration became a development direction you can edit or retire.')
  }

  // Situations map one to one. Constraints and support were not recorded before, so they stay empty.
  const situationIds = new Set<string>()
  for (const s of arr(input, 'situations')) {
    const id = str(s, 'id')
    if (id === '' || situationIds.has(id)) continue
    situationIds.add(id)
    const createdAt = iso(s, 'createdAt', now)
    const situation: Situation = {
      id,
      title: str(s, 'title', 'Untitled situation'),
      description: str(s, 'description'),
      context: str(s, 'context'),
      desiredOutcome: str(s, 'desiredOutcome'),
      authority: pick(str(s, 'authority'), ['decide', 'recommend', 'negotiate', 'unclear'], 'unclear'),
      decisionOwnership: pick(str(s, 'decisionOwnership'), ['clear', 'unclear', 'contested'], 'unclear'),
      challenge: pick(str(s, 'challenge'), ['priorities', 'ownership', 'adoption', 'other'], 'other'),
      constraints: [],
      supportAvailable: [],
      createdAt,
      updatedAt: createdAt,
    }
    data.situations.push(situation)
  }

  // A quest was always a planned real action. It becomes a real-attempt activity.
  const activityIds = new Set<string>()
  for (const q of arr(input, 'quests')) {
    const id = str(q, 'id')
    const situationId = str(q, 'situationId')
    if (id === '' || activityIds.has(id) || !situationIds.has(situationId)) continue
    const state = str(q, 'state')
    if (state === 'cancelled') {
      notes.push(`Quest "${str(q, 'title')}" was cancelled before an attempt; it is kept as an abandoned activity.`)
    }
    const createdAt = iso(q, 'createdAt', now)
    const methodId = str(q, 'methodId')
    const activity: PracticeActivity = {
      id,
      situationId,
      route: 'personal-practice',
      kind: 'real-attempt',
      title: str(q, 'title', 'Untitled activity'),
      plan: {
        // Leader Me had no cue field. Leaving it empty is truthful: no cue was recorded.
        cue: '',
        action: str(q, 'action'),
        obstacle: '',
        fallback: '',
        signal: str(q, 'intendedSignal'),
        reviewOn: date(q, 'reviewDate'),
      },
      capabilityIds: keepCapabilities([...new Set(strArr(q, 'skillIds'))]),
      methodIds: keepMethod(methodId),
      state: mapQuestState(state),
      createdAt,
      updatedAt: iso(q, 'updatedAt', createdAt),
    }
    const templateId = str(q, 'templateId')
    if (templateId !== '') activity.templateId = templateId
    activityIds.add(id)
    data.activities.push(activity)

    const attemptRaw = q.attempt
    if (isObj(attemptRaw)) {
      const attemptedAt = iso(attemptRaw, 'attemptedAt', activity.updatedAt)
      data.attempts.push({
        id: `${id}-attempt`,
        activityId: id,
        outcome: OUTCOME_MAP[str(attemptRaw, 'outcome')] ?? 'changed',
        note: str(attemptRaw, 'note'),
        // The predecessor did not record assistance. Claiming "none" would assert something
        // that was never captured, so an unknown is recorded as app prompts being available.
        assistance: 'app-prompts',
        attemptedAt,
        createdAt: attemptedAt,
        updatedAt: attemptedAt,
      })
    }
  }

  // A reflection becomes a review. Its next move was not recorded, so it is "adapt" by default.
  const reviewedActivities = new Set<string>()
  let droppedReflections = 0
  let convertedFeedbackNotes = 0
  for (const ref of arr(input, 'reflections')) {
    const id = str(ref, 'id')
    const activityId = str(ref, 'questId')
    if (id === '' || !activityIds.has(activityId) || reviewedActivities.has(activityId)) continue
    // A review of something that was never attempted is not interpretable, and emitting one
    // would make the converted set fail validation — which refuses the WHOLE file, so one stray
    // record in an edited or truncated export would cost the person every other record in it.
    // Dropping it and saying so is the only outcome that keeps the rest of their history.
    const target = data.activities.find((a) => a.id === activityId)
    if (!target || (target.state !== 'attempted' && target.state !== 'reviewed' && target.state !== 'abandoned')) {
      droppedReflections += 1
      continue
    }
    reviewedActivities.add(activityId)
    const reflectedAt = iso(ref, 'reflectedAt', now)
    const review: Review = {
      id,
      activityId,
      observation: str(ref, 'observation'),
      interpretation: str(ref, 'interpretation'),
      alternativeExplanation: str(ref, 'alternativeExplanation'),
      nextAdjustment: str(ref, 'nextAdjustment'),
      nextMove: 'adapt',
      reviewedAt: reflectedAt,
      updatedAt: iso(ref, 'updatedAt', reflectedAt),
    }
    data.reviews.push(review)
    const activity = data.activities.find((a) => a.id === activityId)
    if (activity && (activity.state === 'attempted' || activity.state === 'reviewed')) activity.state = 'reviewed'

    const feedback = str(ref, 'feedbackNote')
    if (feedback.trim() !== '') {
      // Recorded as the person's OWN note, not as an account from somebody else. The predecessor
      // captured a free-text "feedback note" written by the user and never captured who it came
      // from. Importing it as attributed feedback would show them corroboration from another
      // person that was never recorded — and would earn the practice-experience credit this app
      // gives for exactly that. If it really came from somebody else, they can re-record it.
      const item: EvidenceItem = {
        id: `${id}-feedback`,
        reviewId: id,
        activityId,
        kind: 'self-observation',
        text: feedback,
        source: 'user',
        sourceRef: 'Leader Me reflection, "feedback note" field. Who it came from was not recorded.',
        visibility: 'private',
        capabilityIds: activity ? [...activity.capabilityIds] : [],
        recordedAt: reflectedAt,
        updatedAt: reflectedAt,
      }
      data.evidence.push(item)
      convertedFeedbackNotes += 1
    }
  }

  // A concept application was writing, not action: it becomes a written exploration.
  for (const app of arr(input, 'applications')) {
    const id = str(app, 'id')
    const situationId = str(app, 'situationId')
    const response = str(app, 'response')
    if (id === '' || !situationIds.has(situationId) || response.trim() === '') continue
    data.evidence.push({
      id,
      situationId,
      kind: 'self-observation',
      text: response,
      source: 'user',
      sourceRef: `Leader Me concept application (method ${str(app, 'methodId') || 'unknown'})`,
      visibility: 'private',
      capabilityIds: keepCapabilities([...new Set(strArr(app, 'skillIds'))]),
      recordedAt: iso(app, 'createdAt', now),
      updatedAt: iso(app, 'updatedAt', now),
    })
  }

  // Perks: the predecessor's evidence links were quest ids, which are now activity ids.
  for (const perk of arr(input, 'perks')) {
    const id = str(perk, 'id')
    const description = str(perk, 'description')
    if (id === '' || description.trim() === '') continue
    const links = strArr(perk, 'evidenceQuestIds').filter((qid) => activityIds.has(qid))
    data.perks.push({
      id,
      description,
      evidenceActivityIds: links,
      createdAt: iso(perk, 'createdAt', now),
      updatedAt: iso(perk, 'updatedAt', now),
    })
  }

  if (convertedFeedbackNotes > 0) {
    notes.push(
      `${convertedFeedbackNotes} feedback ${convertedFeedbackNotes === 1 ? 'note' : 'notes'} from your reflections ${convertedFeedbackNotes === 1 ? 'was' : 'were'} imported as your own observation, not as an account from somebody else: Leader Me did not record who the feedback came from.`,
    )
  }

  if (droppedReflections > 0) {
    notes.push(
      `${droppedReflections} ${droppedReflections === 1 ? 'reflection was' : 'reflections were'} not imported, because the activity they belonged to was never recorded as attempted. A review of something that did not happen could not be interpreted here.`,
    )
  }

  if (droppedCapabilities.size > 0) {
    notes.push(
      `${droppedCapabilities.size} skill ${droppedCapabilities.size === 1 ? 'reference was' : 'references were'} removed because no installed content pack defines ${droppedCapabilities.size === 1 ? 'it' : 'them'} (${[...droppedCapabilities].join(', ')}). The records themselves were kept.`,
    )
  }
  if (droppedMethods.size > 0) {
    notes.push(
      `${droppedMethods.size} method ${droppedMethods.size === 1 ? 'reference was' : 'references were'} removed because no installed content pack defines ${droppedMethods.size === 1 ? 'it' : 'them'} (${[...droppedMethods].join(', ')}). The activities themselves were kept; a method is a lens, not part of what you did.`,
    )
  }

  const claims = arr(input, 'claims')
  if (claims.length > 0) {
    notes.push(
      `${claims.length} profile ${claims.length === 1 ? 'claim was' : 'claims were'} not imported. This app records explanations under test against a situation, not standing statements about a person. Export them from Leader Me if you want to keep them.`,
    )
  }
  if (isObj(profile.gallup)) {
    notes.push('Gallup themes were not imported: this app has no record type for an external personality instrument.')
  }
  if (input.avatar !== undefined) {
    notes.push('A saved Leader Me appearance was not imported: the two apps draw different characters. Your appearance here starts unset.')
  }
  const values = strArr(profile, 'values')
  if (values.length > 0) {
    notes.push(`${values.length} recorded ${values.length === 1 ? 'value was' : 'values were'} not imported; this app has no values record.`)
  }

  data.schemaVersion = SCHEMA_VERSION
  if (notes.length === 0) notes.push('Every record in the file had a direct equivalent.')
  return { data, notes }
}

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function mapQuestState(state: string): PracticeActivity['state'] {
  switch (state) {
    case 'draft':
      return 'planned'
    case 'ready':
      return 'ready'
    case 'attempted':
      return 'attempted'
    case 'completed':
      // Promoted to 'reviewed' by the reflection loop only if a reflection actually exists.
      return 'attempted'
    case 'cancelled':
      return 'abandoned'
    default:
      return 'planned'
  }
}
