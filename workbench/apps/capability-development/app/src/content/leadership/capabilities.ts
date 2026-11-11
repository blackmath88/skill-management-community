/**
 * Leadership capabilities: a provisional authored map, not a validated competency taxonomy.
 *
 * `observable` describes something a person in the room could see happening, because an
 * observable description can be checked against a record. It is not a rating scale, and no
 * combination of these entries adds up to an assessment of anybody's leadership.
 *
 * Capability ids are carried over unchanged from blackmath88/leader-me src/content/skills.ts
 * (commit 55114f3b) so that a Leader Me export converts without losing what it referred to.
 * See ../../../PROVENANCE.md.
 */
import type { CapabilityDefinition, CapabilityGroupDefinition } from '~/content/types'

export const LEADERSHIP_GROUPS: CapabilityGroupDefinition[] = [
  { id: 'direction', title: 'Direction', summary: 'A shared sense of what matters and what comes first.' },
  { id: 'coordination', title: 'Coordination', summary: 'Who does what, and who decides.' },
  { id: 'relationships', title: 'Relationships', summary: 'Room for disagreement and other perspectives.' },
  { id: 'learning', title: 'Learning', summary: 'Treating an action as an experiment and revising it.' },
]

export const LEADERSHIP_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: 'frame-challenge',
    title: 'Frame a challenge',
    group: 'direction',
    observable:
      'States the obstacle, what is at stake and what is not yet known, before proposing a solution.',
    nextExperiment:
      'Open a meeting by naming the obstacle in one sentence, then ask whether others see it the same way.',
    limits:
      'Framing well does not make a framing correct. A clear statement of the wrong obstacle can be more costly than an unclear statement of the right one.',
  },
  {
    id: 'make-tradeoff-visible',
    title: 'Make a trade-off visible',
    group: 'direction',
    observable:
      'Names the competing priorities and asks which one will be postponed, so that a choice can be written down.',
    nextExperiment: 'Name two competing priorities aloud and ask which one will wait.',
    limits:
      'Making a trade-off visible does not give anybody the authority to settle it. It can also raise a conflict that the group has reason to avoid in that moment.',
  },
  {
    id: 'clarify-ownership',
    title: 'Clarify responsibility and decision ownership',
    group: 'coordination',
    observable:
      'Asks who decides, who is consulted and who carries out the work, and records the answer where others can see it.',
    nextExperiment: 'Before the next hand-over, ask aloud who owns the decision, and write the answer down.',
    limits:
      'An answer about ownership can be given confidently and still be wrong, or be contradicted by whoever actually controls the resources.',
  },
  {
    id: 'invite-disagreement',
    title: 'Invite disagreement',
    group: 'relationships',
    observable: 'Explicitly asks for objections or risks, and responds without defending immediately.',
    nextExperiment: 'Ask “What would make this fail?” and wait for at least two answers before replying.',
    limits:
      'An invitation does not create the safety to accept it. Where disagreeing has cost people something before, asking louder is not the remedy.',
  },
  {
    id: 'explore-perspective',
    title: 'Explore another perspective',
    group: 'relationships',
    observable:
      'Describes how someone affected by a change might see it, then checks that description with them rather than acting on the guess.',
    nextExperiment: 'Write how one affected person might describe the change, then ask them whether that is right.',
    limits:
      'Imagining a perspective is not consulting anybody. A well-written guess that is never checked is still a guess.',
  },
  {
    id: 'plan-experiment',
    title: 'Plan an experiment',
    group: 'learning',
    observable: 'Defines a specific action, something observable to look for, and a review date, before acting.',
    nextExperiment: 'Turn one intention into an action with a signal you could observe within two weeks.',
    limits:
      'A plan is not an outcome. Treating organisational change as an experiment can also understate the cost to the people inside it.',
  },
  {
    id: 'reflect-revise',
    title: 'Reflect and revise',
    group: 'learning',
    observable:
      'Separates what was observed from what it was taken to mean, considers a competing explanation, and names one adjustment.',
    nextExperiment: 'After your next attempt, write one alternative explanation for what happened.',
    limits:
      'Reflection can rationalise as easily as it can correct. A single person’s account of a situation remains one account.',
  },
]
