/**
 * Campaign: from a recurring discussion to a clear next decision.
 *
 * This is the first complete campaign. It exists to test one claim about the product: that a
 * person can be helped to find a worthwhile next move without the system deciding what is wrong
 * with them. Four branches leave the `choose-next-move` step, and only one of them is personal
 * practice. Two of the others end in asking somebody — which is a complete answer, not a
 * consolation prize — and the fourth ends the campaign because the opportunity is not there.
 *
 * The campaign does not assess anybody, does not settle who is right about the decision, and
 * cannot establish that any of these moves improves an outcome. See `limits` below.
 */
import type { ActivityTemplate, CampaignDefinition, CampaignStep } from '~/content/types'

const OBSERVE_REOPENING: ActivityTemplate = {
  id: 'observe-reopening',
  kind: 'observation',
  route: 'personal-practice',
  title: 'Watch what happens the next time it is reopened',
  suggestedPlan: {
    cue: 'The next time this issue comes up in a meeting or a thread',
    action:
      'Write down who raises it, what each person says is still open, and whether anybody states a decision. Do not try to change the discussion this time.',
    obstacle: 'Taking part in the discussion makes it hard to notice what is happening in it.',
    fallback: 'Write your notes within an hour afterwards instead, and mark which parts you are reconstructing.',
    signal: 'A written list of who said what was still open, and whether a decision was recorded.',
  },
  capabilityIds: ['frame-challenge', 'explore-perspective'],
  methodIds: ['collective-outcomes'],
}

const REHEARSE_CLOSING_QUESTION: ActivityTemplate = {
  id: 'rehearse-closing-question',
  kind: 'rehearsal',
  route: 'personal-practice',
  title: 'Rehearse asking who can close this',
  suggestedPlan: {
    action:
      'Practise the question you would actually ask: who can close this, and what would they need in order to close it. Say it aloud, or type it, then read the counterpart’s reply and answer it.',
    obstacle: 'The rehearsed question comes out longer and more defensive than intended.',
    fallback: 'Shorten it to one sentence and try again. A question you cannot say in one breath will not survive a real meeting.',
    signal: 'A version of the question you would be willing to say out loud, written down.',
  },
  capabilityIds: ['clarify-ownership', 'frame-challenge'],
  methodIds: ['decision-rights'],
  rehearsal: {
    role: 'a colleague who does not want a governance discussion',
    opening:
      'We have been over this. I do not think turning it into a process question helps anybody — can we just get on with the work?',
    lines: [
      'Honestly, every time someone asks who owns something, it means another month of meetings.',
      'Fine — but who decides is not really the problem. The problem is that the other two units keep changing their minds.',
      'If you want to ask someone, ask them. I am not going to be the one who escalates it.',
      'All right. What exactly would you ask, and of whom?',
      'That is narrower than I expected. I would not object to that being asked.',
    ],
    note:
      'This is a scripted practice with a fictional counterpart. The lines are fixed and written in advance; nobody is being simulated and nothing here is a prediction of how a real colleague would respond. Doing this well is preparation. It is not a record of anything that happened at work, and it is never counted as one.',
  },
}

const ASK_WHO_CAN_CLOSE: ActivityTemplate = {
  id: 'ask-who-can-close',
  kind: 'real-attempt',
  route: 'personal-practice',
  title: 'Ask who can close this, for real',
  suggestedPlan: {
    cue: 'If the decision is reopened in the next meeting',
    action:
      'Ask who can close this question, and what that person would need in order to close it. Write down the answer in the meeting.',
    obstacle: 'The group answers with a discussion of the substance instead of the question.',
    fallback:
      'Do not push for agreement. Ask the sponsor afterwards instead, in writing, naming the one question you need answered.',
    signal: 'A written answer naming a person, or a written note that nobody present could name one.',
  },
  capabilityIds: ['clarify-ownership', 'invite-disagreement'],
  methodIds: ['decision-rights', 'collective-outcomes'],
}

const REQUEST_MANDATE: ActivityTemplate = {
  id: 'request-mandate',
  kind: 'real-attempt',
  route: 'conditions',
  title: 'Ask whoever can settle it what they need',
  suggestedPlan: {
    cue: 'Within the next week, outside a meeting',
    action:
      'Send one written request to the person who could settle this. State the one question, what has already been discussed, and what you are asking them to do: decide, delegate, or say it stays open.',
    obstacle: 'The request turns into a summary of the whole history and the question disappears.',
    fallback:
      'Send the question on its own and offer the history separately. If there is no reply, record that: an unanswered request is a finding about the conditions, not a failure of yours.',
    signal: 'A sent request with one identifiable question in it, and whatever reply arrives.',
  },
  capabilityIds: ['clarify-ownership', 'frame-challenge'],
  methodIds: ['decision-rights'],
}

const PROPOSE_WHAT_WAITS: ActivityTemplate = {
  id: 'propose-what-waits',
  kind: 'real-attempt',
  route: 'shared-practice',
  title: 'Propose which priority waits, and ask for it to be recorded',
  suggestedPlan: {
    cue: 'When the two priorities are both raised in the same discussion',
    action:
      'Name both priorities, say which one you think could wait and why, and ask the person who can decide to record the choice either way.',
    obstacle: 'Naming a priority that waits is heard as volunteering that somebody’s work does not matter.',
    fallback:
      'Ask the question without proposing an answer: which of these two will wait, and who records that. Withdrawing the proposal is a legitimate move.',
    signal: 'A recorded choice, or a recorded refusal to choose, that somebody other than you can point to.',
  },
  capabilityIds: ['make-tradeoff-visible', 'invite-disagreement', 'explore-perspective'],
  methodIds: ['collective-outcomes', 'technical-adaptive'],
}

const STEPS: CampaignStep[] = [
  {
    id: 'orient',
    title: 'What keeps being reopened',
    kind: 'orient',
    intent: 'Name the one question that will not stay settled, before considering what to do about it.',
    prompt:
      'Describe the question that keeps coming back. Write what has actually happened — how often it has been raised, and by whom — separately from what you think it means. You can stop at any point; nothing here has to be finished.',
    choices: [
      {
        id: 'orient-continue',
        label: 'That is the question',
        hint: 'You can change this later.',
        nextStepId: 'notice',
        route: 'personal-practice',
      },
      {
        id: 'orient-not-now',
        label: 'Not now — close this',
        hint: 'Your situation stays saved.',
        nextStepId: null,
        route: 'personal-practice',
      },
    ],
  },
  {
    id: 'notice',
    title: 'What already works, and what gets in the way',
    kind: 'notice',
    intent: 'Look at the situation before explaining it, including the parts that already go well.',
    prompt:
      'What already works here that you would not want to lose? And what did you notice getting in the way — about how the discussion runs, about what people expect of each other, or about the conditions around it?',
    choices: [
      {
        id: 'notice-observe-first',
        label: 'I want to watch it happen once before deciding',
        hint: 'Plans an observation. No attempt to change anything yet.',
        nextStepId: 'explanations',
        route: 'personal-practice',
      },
      {
        id: 'notice-have-enough',
        label: 'I have seen enough to work with',
        nextStepId: 'explanations',
        route: 'personal-practice',
      },
    ],
    template: OBSERVE_REOPENING,
  },
  {
    id: 'explanations',
    title: 'Competing explanations',
    kind: 'hypothesise',
    intent: 'Hold more than one explanation open, so the first one does not decide the next move.',
    prompt:
      'Here are three kinds of explanation this could have. They are not exclusive, and none of them is a verdict about you or anybody else. Which ones are worth keeping open? You can edit the wording, add your own, or reject any of them.',
    routeNote:
      'An explanation about conditions is not a softer version of an explanation about your own practice. It points at different work, usually involving somebody with more authority than you.',
    choices: [
      {
        id: 'explanations-personal',
        label: 'How I run the discussion may be part of it',
        nextStepId: 'choose-next-move',
        route: 'personal-practice',
        seedHypothesis: {
          category: 'personal-practice',
          text: 'The discussion may keep reopening partly because I have not asked, in the room, who can close it.',
        },
      },
      {
        id: 'explanations-shared',
        label: 'We have no shared way of settling this kind of question',
        nextStepId: 'choose-next-move',
        route: 'shared-practice',
        seedHypothesis: {
          category: 'shared-practice',
          text: 'The group may have no agreed way of recording a decision, so each meeting starts the question again.',
        },
        seedConstraints: ['no-shared-routine'],
      },
      {
        id: 'explanations-conditions',
        label: 'Nobody in the room can actually settle it',
        nextStepId: 'choose-next-move',
        route: 'conditions',
        seedHypothesis: {
          category: 'conditions',
          text: 'The question may keep reopening because the authority to close it sits with somebody who is not in the room.',
        },
        seedConstraints: ['unclear-mandate'],
      },
    ],
  },
  {
    id: 'choose-next-move',
    title: 'Choose one next move',
    kind: 'choose',
    intent: 'Pick one move, of a kind that matches the explanation, rather than doing a bit of everything.',
    prompt:
      'Which of these is the honest next move for you, given what you can decide, recommend or negotiate here? Only the first of these is practice. The others are about conditions and shared practice, and choosing one of them is not avoiding the work.',
    routeNote:
      'If the authority to settle this is not yours, more personal practice will not produce a decision. Asking, escalating or recording that nobody can close it are all complete answers.',
    choices: [
      {
        id: 'choose-personal',
        label: 'Practise asking the closing question myself',
        hint: 'Rehearse it, then try it for real.',
        nextStepId: 'prepare',
        route: 'personal-practice',
      },
      {
        id: 'choose-mandate',
        label: 'Ask whoever can settle it what they need',
        hint: 'This is about mandate, not about your skill.',
        nextStepId: 'clarify-mandate',
        route: 'conditions',
        seedHypothesis: {
          category: 'conditions',
          text: 'Clarifying who holds the authority will change this situation more than anything I practise.',
        },
        seedConstraints: ['unclear-mandate'],
      },
      {
        id: 'choose-priorities',
        label: 'Put the competing priorities to the group',
        hint: 'Negotiating what waits, with the people affected.',
        nextStepId: 'negotiate-priorities',
        route: 'shared-practice',
        seedHypothesis: {
          category: 'shared-practice',
          text: 'Two priorities compete and nobody has been asked which one will wait.',
        },
        seedConstraints: ['competing-priorities'],
      },
      {
        id: 'choose-no-opportunity',
        label: 'There is no occasion to try anything soon',
        hint: 'A real answer. The campaign can close here.',
        nextStepId: 'no-opportunity',
        route: 'conditions',
        seedConstraints: ['no-opportunity'],
      },
    ],
  },
  {
    id: 'prepare',
    title: 'Prepare the question',
    kind: 'prepare',
    intent: 'Decide what you would actually say, before deciding when you would say it.',
    prompt:
      'Write the question in the words you would use. One sentence is usually enough. A question you cannot say in one breath will not survive a real meeting.',
    choices: [
      { id: 'prepare-rehearse', label: 'Rehearse it against a scripted counterpart', nextStepId: 'rehearse', route: 'personal-practice' },
      { id: 'prepare-straight-to-real', label: 'Skip the rehearsal and plan the real attempt', nextStepId: 'real-attempt', route: 'personal-practice' },
    ],
  },
  {
    id: 'rehearse',
    title: 'Rehearsal',
    kind: 'rehearse',
    intent: 'Practise the words in a setting where getting it wrong costs nothing.',
    prompt:
      'The counterpart below is fictional and its lines are fixed in advance. Work through them and keep whatever version of your question survives. A rehearsal that goes well tells you the words are ready; it tells you nothing about how the real discussion will go.',
    choices: [
      { id: 'rehearse-done', label: 'Plan the real attempt', nextStepId: 'real-attempt', route: 'personal-practice' },
      { id: 'rehearse-pause', label: 'Pause here', hint: 'The rehearsal stays recorded as a rehearsal.', nextStepId: null, route: 'personal-practice' },
    ],
    template: REHEARSE_CLOSING_QUESTION,
  },
  {
    id: 'real-attempt',
    title: 'The real attempt',
    kind: 'attempt',
    intent: 'Tie the action to a cue, and decide the fallback before the obstacle arrives.',
    prompt:
      'Plan the attempt around a cue: something that will happen, which tells you to act. Decide now what you will do instead if the obstacle appears — including not pushing it.',
    choices: [
      { id: 'real-attempt-planned', label: 'Planned — I will record what happens', nextStepId: 'review', route: 'personal-practice' },
      { id: 'real-attempt-pause', label: 'Pause the campaign', nextStepId: null, route: 'personal-practice' },
    ],
    template: ASK_WHO_CAN_CLOSE,
  },
  {
    id: 'clarify-mandate',
    title: 'Clarify the mandate',
    kind: 'attempt',
    intent: 'Ask the person who can settle it, instead of practising against a problem that is not yours.',
    prompt:
      'Write the one question you need answered, and name who could answer it. If nobody can, record that: it is a finding about this organisation, not about you.',
    routeNote:
      'This branch is deliberately not a training activity. The useful outcome here is an answer from somebody with the authority to give one — or a written record that no such answer is available. Either way the campaign has done its job, and no amount of personal practice would have produced the decision.',
    choices: [
      { id: 'clarify-planned', label: 'Planned — I will record the reply', nextStepId: 'review', route: 'conditions' },
      { id: 'clarify-cannot-ask', label: 'I am not in a position to ask', hint: 'Recorded as a constraint. The campaign can close here.', nextStepId: 'no-opportunity', route: 'conditions', seedConstraints: ['unclear-mandate'] },
    ],
    template: REQUEST_MANDATE,
  },
  {
    id: 'negotiate-priorities',
    title: 'Put the trade-off to the group',
    kind: 'attempt',
    intent: 'Test whether the group can record a choice, rather than persuading anybody.',
    prompt:
      'Name the two priorities and who would be affected if either waited. The move here is to get a choice recorded — including a recorded refusal to choose, which is also information.',
    routeNote:
      'This is shared practice: what changes is what the group does together, not what you can do alone. If the group declines, that is a result about the group’s routine, not about your persuasiveness.',
    choices: [
      { id: 'negotiate-planned', label: 'Planned — I will record what the group does', nextStepId: 'review', route: 'shared-practice' },
      { id: 'negotiate-needs-mandate', label: 'This needs somebody with more authority first', nextStepId: 'clarify-mandate', route: 'conditions', seedConstraints: ['unclear-mandate'] },
    ],
    template: PROPOSE_WHAT_WAITS,
  },
  {
    id: 'no-opportunity',
    title: 'No occasion yet',
    kind: 'follow-up',
    intent: 'Record that the opportunity is absent, without turning it into a personal shortfall.',
    prompt:
      'Nothing to practise against is a condition, not a failure. Record what would have to happen before any of this is possible, and leave it there.',
    routeNote:
      'An absent opportunity is one of the most common reasons development plans produce nothing. Writing it down is more useful than inventing an attempt.',
    choices: [
      {
        id: 'no-opportunity-close',
        label: 'Close the campaign here',
        hint: 'Your situation, notes and explanations stay saved.',
        nextStepId: null,
        route: 'conditions',
      },
      {
        id: 'no-opportunity-watch',
        label: 'Plan an observation for whenever it next happens',
        nextStepId: 'notice',
        route: 'personal-practice',
      },
    ],
  },
  {
    id: 'review',
    title: 'Review what happened',
    kind: 'review',
    intent: 'Separate what was observed from what it was taken to mean, and name one adjustment.',
    prompt:
      'What did you observe? What do you take it to mean? What is a competing explanation that also fits? A partial result — no decision, but an agreement to ask somebody — is a real result and is recorded as one.',
    choices: [
      { id: 'review-follow-up', label: 'Set a follow-up to check whether it actually settled', nextStepId: 'follow-up', route: 'personal-practice' },
      { id: 'review-again', label: 'Try an adjusted version', nextStepId: 'real-attempt', route: 'personal-practice' },
      { id: 'review-escalate', label: 'This needs somebody with the authority to settle it', nextStepId: 'clarify-mandate', route: 'conditions', seedConstraints: ['unclear-mandate'] },
      { id: 'review-stop', label: 'Stop the campaign here', nextStepId: null, route: 'personal-practice' },
    ],
  },
  {
    id: 'follow-up',
    title: 'Did it settle?',
    kind: 'follow-up',
    intent: 'Check later whether anything actually changed, rather than crediting the attempt itself.',
    prompt:
      'Some time has passed. Was the question raised again? Was a decision recorded, and by whom? An attempt that changed nothing is still worth recording, and it does not become a worse attempt in hindsight.',
    choices: [
      { id: 'follow-up-settled', label: 'It was settled, or somebody now owns it', nextStepId: 'close', route: 'personal-practice' },
      { id: 'follow-up-reopened', label: 'It was reopened again', hint: 'Usually a sign the authority question is still open.', nextStepId: 'clarify-mandate', route: 'conditions', seedConstraints: ['unclear-mandate'] },
      { id: 'follow-up-elsewhere', label: 'I want to try this in a different setting', nextStepId: 'real-attempt', route: 'personal-practice' },
    ],
  },
  {
    id: 'close',
    title: 'Close the campaign',
    kind: 'close',
    intent: 'End the bounded intention, and say what the records do and do not show.',
    prompt:
      'This campaign is finished. Your records show what you explored, rehearsed and attempted, and in how many settings. They do not show that you are better at this, and nothing here has assessed you.',
    choices: [{ id: 'close-done', label: 'Close it', nextStepId: null, route: 'personal-practice' }],
  },
]

export const NEXT_DECISION_CAMPAIGN: CampaignDefinition = {
  id: 'recurring-discussion-to-next-decision',
  version: 1,
  title: 'From a recurring discussion to a clear next decision',
  purpose:
    'Help a group move from reopening the same question to a recorded next decision — or to a clear statement of who could record one.',
  limits:
    'This campaign does not assess you and does not say who is right about the decision. It cannot establish that asking the closing question, clarifying a mandate or naming a trade-off improves any outcome. Three of its four branches end in asking somebody or recording a constraint, because those are often the accurate answer.',
  challenge: 'ownership',
  situationPrompt:
    'A fictional example: three units keep reopening the question of who approves external data requests. It has been raised at four meetings. You chair two of them, you can recommend but not decide, and you are not sure anybody in the room can settle it.',
  firstStepId: 'orient',
  steps: STEPS,
}
