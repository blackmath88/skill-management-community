/**
 * Method cards: conceptual lenses with their sources and their limits.
 *
 * Explanations are our own paraphrases, never quotations. A lens changes what support is
 * available to the person; it does not change what their records show. None of the sources below
 * validates this application, its combination of lenses or its progression convention.
 *
 * Adapted from blackmath88/leader-me src/content/methods.ts (commit 55114f3b): the three method
 * ids and the source set are carried over so converted records keep their references.
 */
import type { MethodDefinition } from '~/content/types'

/**
 * When these citations were written down. None of them was retrieved while authoring this pack:
 * no publisher host is reachable from the build environment, so every entry below carries
 * retrieved: false. See ../../../PROVENANCE.md and the app README's limitations section.
 */
const CITED_ON = '2026-11-11'

export const METHOD_NOTE =
  'These lenses are a starting foundation, not a curriculum. The explanations are our paraphrases of the linked sources. How this app combines them, and how it records practice, are product conventions that have not been validated as a measure of anybody’s leadership.'

export const LEADERSHIP_METHODS: MethodDefinition[] = [
  {
    id: 'collective-outcomes',
    title: 'Direction, alignment, commitment',
    summary:
      'Check which collective outcome is weak: a shared sense of direction, work that fits together, or willingness to put effort into the shared result.',
    explanation:
      'This lens treats leadership as something a group produces rather than something one person owns. It asks whether three outcomes are present: people broadly agree on what they are trying to achieve, their work fits together and responsibilities are clear, and they are willing to put their own effort into the shared result. When something stalls, naming which outcome is missing comes before choosing what to do. The lens is deliberately silent on cause: it tells you that alignment is weak, not why. It also makes your own reading of the group explicit, which matters, because the person using the lens is inside the group they are describing and has no privileged view of it.',
    whenToUse: [
      'A group meets regularly but progress keeps stalling and nobody can say why.',
      'Responsibility is shared across teams and it is unclear who carries what.',
      'People agree in meetings and the agreed work does not happen afterwards.',
    ],
    whenItMayNotFit: [
      'The problem is a missing resource, rule or piece of know-how that one person could simply supply.',
      'You need to know why an outcome is weak: this lens names the gap and not its cause.',
      'There is no real group: one person decides and the others carry out instructions.',
    ],
    limits:
      'An outcome lens does not explain a cause or prescribe an intervention. The linked page is the provider’s own description of its framework, not independent evidence that using it improves anything, and the prompts here are ours rather than the provider’s.',
    sources: [
      {
        title: 'Make Leadership Happen with the DAC Framework',
        author: 'Center for Creative Leadership',
        url: 'https://www.ccl.org/articles/leading-effectively-articles/make-leadership-happen-with-dac-framework/',
        sourceType: 'vendor',
        citedOn: CITED_ON,
        retrieved: false,
        verificationNote:
          'The page was not retrieved while authoring this pack: publisher hosts are not reachable from the build environment. Title, authors and the claim attributed here are unverified and must be checked against the publisher before this content is used outside this repository.',
        supportedClaim:
          'The provider’s own description of a lens that examines leadership through shared direction, alignment of work and mutual commitment. A provider account, not independent evidence of effectiveness.',
      },
    ],
    prompts: [
      'Which of direction, alignment or commitment feels weakest here, and what have you observed that makes you think so?',
      'Who would describe the weak outcome differently from you? Write down how they might put it.',
      'If alignment is weak: for each open piece of work, who decides, who is consulted and who does it?',
      'What disagreement has not been said aloud yet, and how could you invite it?',
    ],
    example: {
      title: 'The project board that kept nodding',
      narrative:
        'A fictional cross-department board agreed every month to improve onboarding, and nothing changed. The coordinator assumed people lacked commitment. Asking each member separately which outcome felt weakest showed something else: members committed readily, but nobody knew whether the onboarding checklist belonged to the operations lead or the training lead. Direction and commitment were present; alignment was missing. The next meeting spent ten minutes naming one owner per task instead of trying to motivate the group again.',
    },
    capabilityIds: ['clarify-ownership', 'invite-disagreement', 'explore-perspective', 'frame-challenge'],
    fitsChallenges: ['priorities', 'ownership', 'adoption'],
  },
  {
    id: 'technical-adaptive',
    title: 'Technical and adaptive work',
    summary: 'Separate missing know-how from changes in habits, interests and expectations.',
    explanation:
      'Some parts of a problem can be solved with expertise that already exists: a procedure, a tool, a specialist. Other parts require the people involved to learn something, to give something up, or to change an established way of working, and no expert can do that on their behalf. Most real situations contain both. Telling the two apart avoids two common mistakes: treating a change in habits as though a better instruction would fix it, and treating a missing procedure as though it were a deep cultural matter. The lens is a question about the work, not a judgement about the people doing it, and the same situation can look technical to one person and adaptive to another depending on what they would have to give up.',
    whenToUse: [
      'A sensible instruction has been given more than once and nothing changed.',
      'Something that worked elsewhere is being resisted here, and the resistance is not about the tool.',
      'You are about to deliver training and are unsure whether missing know-how is the problem.',
    ],
    whenItMayNotFit: [
      'There is an immediate operational failure that needs stopping before it is analysed.',
      'The distinction becomes a label for people rather than a question about the work.',
      'You have no standing to raise what the adaptive part would require anybody to give up.',
    ],
    limits:
      'The distinction is a heuristic. It does not say which part to address first, who has the authority to address it, or what the cost of raising it will be for the person who does. The linked source describes the idea; it does not evaluate this application.',
    sources: [
      {
        title: 'The Work of Leadership',
        author: 'Heifetz, R. A., & Laurie, D. L.',
        url: 'https://hbr.org/2001/12/the-work-of-leadership',
        sourceType: 'practitioner-article',
        citedOn: CITED_ON,
        retrieved: false,
        verificationNote:
          'The page was not retrieved while authoring this pack: publisher hosts are not reachable from the build environment. Title, authors and the claim attributed here are unverified and must be checked against the publisher before this content is used outside this repository.',
        supportedClaim:
          'A practitioner article distinguishing problems solvable with existing expertise from those requiring people to change their own habits and expectations. A conceptual account, not an evaluation of this application.',
      },
    ],
    prompts: [
      'Which part of this could be solved by someone supplying a procedure, a tool or an answer?',
      'Which part would require someone to change a habit, or give something up? Who, specifically?',
      'What have you already tried that assumed the problem was missing know-how?',
      'If the adaptive part is the real one: whose agreement would be needed before it could be raised?',
    ],
    example: {
      title: 'The template nobody filled in',
      narrative:
        'In a fictional service unit, a new hand-over template was introduced, explained twice and used by nobody. The lead prepared a third session with clearer instructions. Asking what anybody would have to give up produced a different answer: filling in the template meant admitting in writing which checks had been skipped under time pressure. The missing know-how was not the problem. The lead stopped preparing training and asked the unit head whether the time pressure or the checks were the thing to change.',
    },
    capabilityIds: ['frame-challenge', 'explore-perspective', 'plan-experiment'],
    fitsChallenges: ['adoption', 'priorities', 'other'],
  },
  {
    id: 'decision-rights',
    title: 'Who decides, and who can close it',
    summary:
      'Distinguish deciding, recommending, being consulted and doing the work, and name who can close a question that keeps reopening.',
    explanation:
      'When a question is reopened repeatedly, the usual explanation is that people disagree. Often the real position is that nobody present can close it. This lens asks four separate questions about a single decision: who can decide it, who must be consulted first, who will carry out the result, and who can declare it settled. The four answers are frequently held by different people, and the person running the meeting may hold none of them. Writing the four answers down is useful even when they turn out to be wrong, because a wrong answer written down is contradicted quickly, whereas an unspoken assumption can survive for months. The lens says nothing about whether the eventual decision is a good one.',
    whenToUse: [
      'The same issue is reopened at successive meetings and no decision is recorded.',
      'Two groups each believe the other owns a decision.',
      'You are unsure whether your own role here is to decide, recommend or negotiate.',
    ],
    whenItMayNotFit: [
      'The decision is genuinely contested for substantive reasons, and clarity about rights will not resolve the substance.',
      'Naming the decision owner publicly would expose somebody who has reason not to be named.',
      'There is no decision to be made: the group needs to do the work it has already agreed.',
    ],
    limits:
      'Clarifying decision rights can make an absence of authority visible without supplying any. It can also be read as an attempt to shift responsibility. The linked source describes a practitioner framework; it is not evidence that clarifying rights improves outcomes.',
    sources: [
      {
        title: 'Who Has the D? How Clear Decision Roles Enhance Organizational Performance',
        author: 'Rogers, P., & Blenko, M.',
        url: 'https://hbr.org/2006/01/who-has-the-d-how-clear-decision-roles-enhance-organizational-performance',
        sourceType: 'practitioner-article',
        citedOn: CITED_ON,
        retrieved: false,
        verificationNote:
          'The page was not retrieved while authoring this pack: publisher hosts are not reachable from the build environment. Title, authors and the claim attributed here are unverified and must be checked against the publisher before this content is used outside this repository.',
        supportedClaim:
          'A practitioner framework separating the roles involved in a single decision. Consulted as a conceptual source; its performance claims are the authors’ and are not independent evidence for this application.',
      },
    ],
    prompts: [
      'For this one decision: who can decide it, who must be consulted, who will do the resulting work, and who can declare it closed?',
      'Which of those four do you hold? Which do you only think you hold?',
      'What would the person who can close this need to know before they could?',
      'If nobody present can close it, what is the smallest request you could make of whoever can?',
    ],
    example: {
      title: 'Three units and an unclosed question',
      narrative:
        'In a fictional university administration, three units reopened the question of who approves external data requests at four successive meetings. Each time the discussion was substantive and well informed. Writing down the four roles took eight minutes and showed that the approval sat with a data protection officer who had never been in the room. The group stopped debating and sent one question to that officer. The next meeting recorded a decision; nobody had changed their mind about anything.',
    },
    capabilityIds: ['clarify-ownership', 'make-tradeoff-visible', 'frame-challenge'],
    fitsChallenges: ['ownership', 'priorities'],
  },
]
