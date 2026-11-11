/** Plain-language labels for the domain's enumerations. Display only; no rules live here. */
import type {
  ActivityState,
  AssistanceLevel,
  AttemptOutcome,
  Authority,
  CampaignState,
  ChallengeKind,
  ConstraintKind,
  DecisionOwnership,
  EvidenceKind,
  HypothesisStatus,
  NextMove,
  SupportKind,
} from '~/domain/types'

export const CONSTRAINT_LABEL: Record<ConstraintKind, string> = {
  'unclear-mandate': 'Nobody involved is clearly allowed to decide this',
  'competing-priorities': 'Two or more priorities compete and nobody will postpone one',
  'no-opportunity': 'There is no occasion to try anything',
  'missing-resources': 'The time, people or money are not there',
  'conflicting-incentives': 'People are rewarded for different things',
  'no-shared-routine': 'There is no agreed way of doing this together',
  'missing-information': 'Somebody has information that is not shared',
}

export const SUPPORT_LABEL: Record<SupportKind, string> = {
  sponsor: 'A sponsor who could back this',
  peer: 'A peer in the same position',
  'line-manager': 'My line manager',
  specialist: 'A specialist who knows this area',
  'none-identified': 'Nobody I can identify yet',
}

export const AUTHORITY_LABEL: Record<Authority, string> = {
  decide: 'I can decide this',
  recommend: 'I can recommend; somebody else decides',
  negotiate: 'I can negotiate within a mandate',
  unclear: 'I am not sure what I may do',
}

export const OWNERSHIP_LABEL: Record<DecisionOwnership, string> = {
  clear: 'It is clear who owns the decision',
  unclear: 'It is unclear who owns the decision',
  contested: 'More than one person claims it',
}

export const CHALLENGE_LABEL: Record<ChallengeKind, string> = {
  priorities: 'Competing priorities',
  ownership: 'Who owns a decision',
  adoption: 'Something agreed is not being done',
  handover: 'A handover between groups',
  other: 'Something else',
}

export const OUTCOME_LABEL: Record<AttemptOutcome, string> = {
  'as-planned': 'It happened roughly as planned',
  changed: 'I changed it as I went',
  stopped: 'I stopped part-way',
  interrupted: 'Something interrupted it',
  'no-opportunity': 'The cue never arrived, so it did not happen',
}

export const ASSISTANCE_LABEL: Record<AssistanceLevel, string> = {
  none: 'On my own',
  'app-prompts': 'Using this app’s prompts',
  'ai-sparring': 'With the sparring partner',
  'another-person': 'With another person helping',
}

export const NEXT_MOVE_LABEL: Record<NextMove, string> = {
  repeat: 'Try the same thing again',
  adapt: 'Try an adjusted version',
  transfer: 'Try it in a different setting',
  escalate: 'Take it to somebody with the authority',
  pause: 'Pause this',
  stop: 'Stop this',
}

export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  'self-observation': 'Something I observed myself',
  'work-sample-reference': 'A pointer to something that exists elsewhere',
  'attributed-feedback': 'Something somebody else said',
  'other-account': 'Somebody else’s account, which may differ from mine',
}

export const HYPOTHESIS_STATUS_LABEL: Record<HypothesisStatus, string> = {
  open: 'Still open',
  supported: 'Evidence supports it',
  contradicted: 'Evidence contradicts it',
  rejected: 'I have rejected it',
  parked: 'Parked for now',
}

export const ACTIVITY_STATE_LABEL: Record<ActivityState, string> = {
  planned: 'Being planned',
  ready: 'Planned and ready',
  attempted: 'Attempted',
  reviewed: 'Attempted and reviewed',
  paused: 'Paused',
  abandoned: 'Abandoned',
}

export const CAMPAIGN_STATE_LABEL: Record<CampaignState, string> = {
  active: 'Running',
  paused: 'Paused',
  completed: 'Closed',
  abandoned: 'Stopped',
}
