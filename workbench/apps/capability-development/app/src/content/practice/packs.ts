/**
 * Two further vocabularies, taken from this repository's own research notes.
 *
 * AI practice comes from the scenario catalogue in workbench/apps/skills-in-the-wild/
 * AI-SKILLS-IN-THE-WILD.md: each scenario there is a thing a person does with an assistant, so
 * each becomes one skill here. Organisational practice comes from the starter map ("Startkarte
 * für OE-Praxis") in knowledge/research/reports/2026-11-11-skills-research.md, translated.
 *
 * Both are provisional authored maps, like the leadership one: a working vocabulary for choosing
 * what to practise, not a validated competency framework and not anybody's official standard.
 * `observable` is something a person in the room could see. They carry no methods and no
 * journeys yet; a skill from either can be practised through the short "prepare" flow.
 */
import type { CapabilityDefinition, ContentPack } from '~/content/types'

const AI_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: 'ai-brief-assistant',
    title: 'Brief the assistant',
    group: 'ai-practice',
    observable: 'States purpose, audience, context, constraints and what good looks like before asking for anything.',
    nextExperiment: 'Take one vague request you would normally type and rewrite it with an audience and two quality criteria before sending it.',
    limits: 'A good brief does not make the answer correct. It says nothing about whether the task should be given to an assistant at all.',
  },
  {
    id: 'ai-check-before-trust',
    title: 'Check before you trust',
    group: 'ai-practice',
    observable: 'Verifies specific claims in an output against a source, and marks what could not be verified instead of passing it on.',
    nextExperiment: 'Pick three factual claims from one output and trace each to a source you can open. Note which you could not trace.',
    limits: 'Checking a sample does not verify the rest. Fluency and confidence in the wording are not evidence either way.',
  },
  {
    id: 'ai-notes-to-action',
    title: 'Turn notes into action',
    group: 'ai-practice',
    observable: 'Separates what was decided from what was proposed or left open, and does not invent owners or dates.',
    nextExperiment: 'Turn one low-risk set of meeting notes into a table of decision, proposal and open question, each traced to the notes.',
    limits: 'A tidy record is not an agreed one. Participants still have to confirm it before it stands.',
  },
  {
    id: 'ai-research-trail',
    title: 'Research with a trail',
    group: 'ai-practice',
    observable: 'Keeps a short evidence table so another person can trace each claim to its source and see what is uncertain.',
    nextExperiment: 'For one bounded question, build a five-row table of claim, source and how sure you are, and ask a colleague to follow one row.',
    limits: 'A trail shows where a claim came from, not that the source is right or that the selection was balanced.',
  },
  {
    id: 'ai-redesign-task',
    title: 'Redesign one task',
    group: 'ai-practice',
    observable: 'Maps a workflow, decides which steps go to an assistant, to automation or to human judgement, and tests one changed step.',
    nextExperiment: 'Map one routine task in five steps, change exactly one, and compare quality and total effort including review.',
    limits: 'One improved step does not show the whole task is better. Review time is part of the cost.',
  },
  {
    id: 'ai-know-when-to-stop',
    title: 'Know when to stop',
    group: 'ai-practice',
    observable: 'Names the data, authority or capability boundary that applies and stops or changes approach when it is reached.',
    nextExperiment: 'Sort five of your own recent tasks into proceed, change approach or stop, and write the rule behind each choice.',
    limits: 'Knowing a boundary exists is not the same as having the authority to move it. Local rules decide, not this list.',
  },
]

const ORGANISATIONAL_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: 'od-clarify-mandate',
    title: 'Clarify the mandate and its limits',
    group: 'organisational-practice',
    observable: 'Agrees with the people involved which problem is being worked on, with whose mandate, and what is out of bounds.',
    nextExperiment: 'Before starting the next piece of work, write one sentence each for the problem, the mandate and one thing you will not do, and check it with the sponsor.',
    limits: 'A clear mandate does not make it a wise one, and a sponsor’s agreement is not everybody’s.',
  },
  {
    id: 'od-inquire-systemically',
    title: 'Inquire systemically',
    group: 'organisational-practice',
    observable: 'Looks at routines, incentives and conditions before attributing a problem to a person.',
    nextExperiment: 'For one recurring problem, list what a capable person would still be unable to do under the same workload, rules and access.',
    limits: 'A systemic reading can also become an excuse. It does not remove anybody’s responsibility for their own part.',
  },
  {
    id: 'od-enable-dialogue',
    title: 'Enable dialogue and shared inquiry',
    group: 'organisational-practice',
    observable: 'Makes a difference of view workable: both accounts are stated, kept apart and examined together.',
    nextExperiment: 'In the next disagreement, write both positions on one page in each side’s own words before discussing either.',
    limits: 'Dialogue does not produce agreement by itself, and not every difference needs resolving.',
  },
  {
    id: 'od-design-learning-trials',
    title: 'Design learning trials',
    group: 'organisational-practice',
    observable: 'Tests an assumption with a small, bounded attempt and says beforehand what would count as a surprise.',
    nextExperiment: 'Pick one assumption about a change you are planning and design a two-week trial with one observable signal.',
    limits: 'A small trial shows what happened once, under those conditions. It is not proof at scale.',
  },
  {
    id: 'od-shape-transfer',
    title: 'Shape transfer and working conditions',
    group: 'organisational-practice',
    observable: 'Arranges time, occasion and support so that something learned can actually be used, and is expected to be.',
    nextExperiment: 'After the next training, name one occasion within two weeks where it will be used, and who has agreed to make room for it.',
    limits: 'Good conditions make application possible, not certain. Some conditions are not yours to change.',
  },
  {
    id: 'od-judge-evidence',
    title: 'Judge evidence and revise practice',
    group: 'organisational-practice',
    observable: 'Separates what was observed from what it is taken to mean, and changes the approach when the evidence asks for it.',
    nextExperiment: 'After the next intervention, write three observations and one interpretation separately, and one thing you will do differently.',
    limits: 'Revising often is not the same as revising well. Some evidence is simply missing.',
  },
]

export const AI_PACK: ContentPack = {
  id: 'ai-practice',
  version: 1,
  title: 'Working with AI',
  domainLabel: 'AI practice',
  summary: 'Six things a person does when working with an assistant, from briefing it to knowing when to stop.',
  note: 'Provisional. Derived from the “AI Skills in the Wild” scenario catalogue in this repository; not a published framework.',
  capabilityGroups: [{ id: 'ai-practice', title: 'Working with AI', summary: 'Framing, checking and bounding work done with an assistant.' }],
  capabilities: AI_CAPABILITIES,
  methods: [],
  campaigns: [],
}

export const ORGANISATIONAL_PACK: ContentPack = {
  id: 'organisational-practice',
  version: 1,
  title: 'Organisational practice',
  domainLabel: 'Organisational development',
  summary: 'Six practices of systemic, collaborative, evidence-informed organisational work.',
  note: 'Provisional. Translated from the starter map in this repository’s skills research report; not a validated assessment.',
  capabilityGroups: [{ id: 'organisational-practice', title: 'Organisational practice', summary: 'Mandate, inquiry, dialogue, trials, conditions and evidence.' }],
  capabilities: ORGANISATIONAL_CAPABILITIES,
  methods: [],
  campaigns: [],
}
