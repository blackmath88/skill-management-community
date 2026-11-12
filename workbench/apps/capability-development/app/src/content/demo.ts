/**
 * Fictional demo records.
 *
 * Every person, unit and situation below is invented. Nothing here is drawn from a real case, a
 * real organisation or anybody's journal, and the demo lives in its own storage namespace so it
 * can never be mistaken for the user's own records.
 *
 * The demo deliberately shows an uncomfortable shape rather than a success story: one rehearsal,
 * one real attempt that produced a partial result, and one branch where the right answer was to
 * ask somebody with the authority to decide. A demo in which everything worked would misrepresent
 * what the application is for.
 */
import { emptyUserData } from '~/domain/empty'
import type { UserData } from '~/domain/types'

const T = (minutes: number): string => new Date(Date.UTC(2026, 9, 1, 9, minutes, 0)).toISOString()

export function createDemoUserData(): UserData {
  const data = emptyUserData(T(0))
  data.profile.displayName = 'Demo records (fictional)'

  data.directions.push({
    id: 'demo-direction',
    text: 'I want recurring questions in my working groups to end with a decision somebody owns.',
    focusCapabilityId: 'clarify-ownership',
    state: 'active',
    createdAt: T(0),
    updatedAt: T(0),
    history: [
      {
        at: T(0),
        text: 'I want recurring questions in my working groups to end with a decision somebody owns.',
        state: 'active',
      },
    ],
  })

  data.situations.push(
    {
      id: 'demo-situation-1',
      title: 'Three units keep reopening data-request approval',
      description:
        'The question of who approves external data requests has been raised at four successive meetings. Each discussion is substantive. No decision has been recorded.',
      context: 'Cross-unit working group',
      desiredOutcome: 'One named person owns the approval, and the group stops reopening it.',
      authority: 'recommend',
      decisionOwnership: 'unclear',
      challenge: 'ownership',
      constraints: ['unclear-mandate'],
      supportAvailable: ['sponsor'],
      createdAt: T(1),
      updatedAt: T(30),
    },
    {
      id: 'demo-situation-2',
      title: 'Hand-over to the service desk keeps arriving incomplete',
      description:
        'Cases arrive from our unit without the checks the service desk expects. Both sides believe the other knows what is required.',
      context: 'Service desk hand-over',
      desiredOutcome: 'Both sides can say what a complete hand-over contains.',
      authority: 'negotiate',
      decisionOwnership: 'clear',
      challenge: 'handover',
      constraints: ['no-shared-routine'],
      supportAvailable: ['peer'],
      createdAt: T(2),
      updatedAt: T(2),
    },
  )

  data.campaigns.push({
    id: 'demo-campaign',
    directionId: 'demo-direction',
    situationId: 'demo-situation-1',
    definitionId: 'recurring-discussion-to-next-decision',
    definitionVersion: 1,
    purpose: 'Get the approval question either settled or handed to whoever can settle it.',
    state: 'active',
    path: [
      { stepId: 'orient', enteredAt: T(3), choiceId: 'orient-continue', activityIds: [], completedAt: T(4) },
      { stepId: 'notice', enteredAt: T(4), choiceId: 'notice-observe-first', activityIds: ['demo-activity-observe'], completedAt: T(8) },
      { stepId: 'explanations', enteredAt: T(8), choiceId: 'explanations-conditions', activityIds: [], completedAt: T(10) },
      { stepId: 'choose-next-move', enteredAt: T(10), choiceId: 'choose-personal', activityIds: [], completedAt: T(12) },
      { stepId: 'prepare', enteredAt: T(12), choiceId: 'prepare-rehearse', activityIds: [], completedAt: T(14) },
      { stepId: 'rehearse', enteredAt: T(14), choiceId: 'rehearse-done', activityIds: ['demo-activity-rehearse'], completedAt: T(20) },
      { stepId: 'real-attempt', enteredAt: T(20), choiceId: 'real-attempt-planned', activityIds: ['demo-activity-real'], completedAt: T(26) },
      { stepId: 'review', enteredAt: T(26), activityIds: [] },
    ],
    currentStepId: 'review',
    createdAt: T(3),
    updatedAt: T(26),
  })

  data.hypotheses.push(
    {
      id: 'demo-hypothesis-conditions',
      situationId: 'demo-situation-1',
      campaignId: 'demo-campaign',
      category: 'conditions',
      text: 'The question may keep reopening because the authority to close it sits with somebody who is not in the room.',
      source: 'content',
      sourceRef: 'Campaign step "Competing explanations", option "Nobody in the room can actually settle it"',
      status: 'supported',
      evidenceIds: ['demo-evidence-feedback'],
      createdAt: T(10),
      updatedAt: T(28),
      history: [
        { at: T(10), status: 'open', text: 'The question may keep reopening because the authority to close it sits with somebody who is not in the room.' },
        {
          at: T(28),
          status: 'supported',
          text: 'The question may keep reopening because the authority to close it sits with somebody who is not in the room.',
          note: 'Nobody in the meeting could name who approves. The group agreed to ask the sponsor.',
        },
      ],
    },
    {
      id: 'demo-hypothesis-personal',
      situationId: 'demo-situation-1',
      campaignId: 'demo-campaign',
      category: 'personal-practice',
      text: 'The discussion may keep reopening partly because I have not asked, in the room, who can close it.',
      source: 'user',
      status: 'open',
      evidenceIds: [],
      createdAt: T(10),
      updatedAt: T(10),
      history: [{ at: T(10), status: 'open', text: 'The discussion may keep reopening partly because I have not asked, in the room, who can close it.' }],
    },
  )

  data.activities.push(
    {
      id: 'demo-activity-observe',
      situationId: 'demo-situation-1',
      campaignId: 'demo-campaign',
      directionId: 'demo-direction',
      templateId: 'observe-reopening',
      stepId: 'notice',
      route: 'personal-practice',
      kind: 'observation',
      title: 'Watch what happens the next time it is reopened',
      plan: {
        cue: 'The next time the approval question comes up',
        action: 'Write down who raises it, what each person says is still open, and whether anybody states a decision.',
        obstacle: 'Taking part makes it hard to notice.',
        fallback: 'Write the notes within an hour afterwards and mark what is reconstructed.',
        signal: 'A written list of who said what was still open.',
        reviewOn: '2026-10-08',
      },
      capabilityIds: ['frame-challenge', 'explore-perspective'],
      methodIds: ['collective-outcomes'],
      state: 'attempted',
      createdAt: T(5),
      updatedAt: T(8),
    },
    {
      id: 'demo-activity-rehearse',
      situationId: 'demo-situation-1',
      campaignId: 'demo-campaign',
      templateId: 'rehearse-closing-question',
      stepId: 'rehearse',
      route: 'personal-practice',
      kind: 'rehearsal',
      title: 'Rehearse asking who can close this',
      plan: {
        cue: '',
        action: 'Practise the question: who can close this, and what would they need in order to close it.',
        obstacle: 'It comes out long and defensive.',
        fallback: 'Shorten it to one sentence and try again.',
        signal: 'A version I would be willing to say out loud.',
        reviewOn: '2026-10-09',
      },
      capabilityIds: ['clarify-ownership', 'frame-challenge'],
      methodIds: ['decision-rights'],
      state: 'reviewed',
      createdAt: T(14),
      updatedAt: T(20),
    },
    {
      id: 'demo-activity-real',
      situationId: 'demo-situation-1',
      campaignId: 'demo-campaign',
      templateId: 'ask-who-can-close',
      stepId: 'real-attempt',
      route: 'personal-practice',
      kind: 'real-attempt',
      title: 'Ask who can close this, for real',
      plan: {
        cue: 'If the approval question is reopened in the October meeting',
        action: 'Ask who can close this question, and what that person would need in order to close it.',
        obstacle: 'The group answers with the substance instead of the question.',
        fallback: 'Do not push for agreement. Ask the sponsor afterwards in writing.',
        signal: 'A written answer naming a person, or a note that nobody present could name one.',
        reviewOn: '2026-10-16',
      },
      capabilityIds: ['clarify-ownership', 'invite-disagreement'],
      methodIds: ['decision-rights', 'collective-outcomes'],
      state: 'attempted',
      createdAt: T(20),
      updatedAt: T(26),
    },
    {
      id: 'demo-activity-handover',
      situationId: 'demo-situation-2',
      route: 'shared-practice',
      kind: 'observation',
      title: 'Compare one smooth hand-over with one that went wrong',
      plan: {
        cue: 'The next two cases that go to the service desk',
        action: 'Write down what was attached to each, and what the service desk had to ask for afterwards.',
        obstacle: 'Only noticing the difficult one.',
        fallback: 'Ask the service desk coordinator which recent case was straightforward, and look at that one.',
        signal: 'Two written lists that can be compared side by side.',
        reviewOn: '2026-10-20',
      },
      capabilityIds: ['explore-perspective'],
      methodIds: [],
      state: 'ready',
      createdAt: T(2),
      updatedAt: T(2),
    },
  )

  data.attempts.push(
    {
      id: 'demo-attempt-observe',
      activityId: 'demo-activity-observe',
      outcome: 'as-planned',
      note: 'Raised by the operations lead again. Two people said the scope was still open; nobody said who approves. No decision was recorded.',
      assistance: 'none',
      attemptedAt: T(7),
      createdAt: T(7),
      updatedAt: T(7),
    },
    {
      id: 'demo-attempt-rehearse',
      activityId: 'demo-activity-rehearse',
      outcome: 'changed',
      note: 'The first version was three sentences. Ended up with: "Who can close this, and what would they need from us?"',
      assistance: 'ai-sparring',
      attemptedAt: T(18),
      createdAt: T(18),
      updatedAt: T(18),
    },
    {
      id: 'demo-attempt-real',
      activityId: 'demo-activity-real',
      outcome: 'changed',
      note: 'Asked it. Nobody in the room could name who approves. Rather than pressing, the group agreed to ask the sponsor. No final decision came out of the meeting.',
      assistance: 'none',
      attemptedAt: T(25),
      createdAt: T(25),
      updatedAt: T(25),
    },
  )

  data.reviews.push({
    id: 'demo-review-rehearse',
    activityId: 'demo-activity-rehearse',
    observation: 'Shortening the question to one sentence took four attempts.',
    interpretation: 'The long version was mostly me justifying asking at all.',
    alternativeExplanation:
      'It may simply be that writing a question down is harder than saying it, and the real version will come out differently again.',
    nextAdjustment: 'Say the one-sentence version out loud once before the meeting.',
    nextMove: 'adapt',
    reviewedAt: T(19),
    updatedAt: T(19),
  })

  data.evidence.push(
    {
      id: 'demo-evidence-feedback',
      activityId: 'demo-activity-real',
      attemptId: 'demo-attempt-real',
      kind: 'attributed-feedback',
      text: 'One participant said afterwards that the question was the first time anybody had asked it out loud.',
      source: 'user',
      attribution: 'a working-group participant',
      visibility: 'private',
      capabilityIds: ['clarify-ownership'],
      recordedAt: T(27),
      updatedAt: T(27),
    },
    {
      id: 'demo-evidence-assisted',
      activityId: 'demo-activity-real',
      attemptId: 'demo-attempt-real',
      kind: 'self-observation',
      text: 'I asked a colleague to sit in and tell me afterwards whether the question had landed. I would not have asked it without knowing somebody else was listening for it.',
      source: 'user',
      visibility: 'private',
      capabilityIds: ['clarify-ownership'],
      recordedAt: T(27),
      updatedAt: T(27),
    },
    {
      id: 'demo-evidence-other-account',
      activityId: 'demo-activity-real',
      kind: 'other-account',
      text: 'The operations lead described the same meeting as "going round in circles again", and did not mention the question being asked.',
      source: 'user',
      attribution: 'the operations lead',
      visibility: 'private',
      capabilityIds: ['clarify-ownership'],
      recordedAt: T(28),
      updatedAt: T(28),
    },
  )

  data.perks.push({
    id: 'demo-perk',
    description: 'I notice when a group is agreeing in order to end a meeting.',
    evidenceActivityIds: ['demo-activity-observe', 'demo-activity-real'],
    possibleOveruse:
      'I sometimes treat an ordinary agreement as avoidance, which makes me reopen things the group had genuinely settled.',
    createdAt: T(29),
    updatedAt: T(29),
  })

  return data
}
