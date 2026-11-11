/**
 * Collaboration content pack: handovers between units that do not report to each other.
 *
 * What this is: one authored map of a narrow problem. It exists because the leadership pack
 * frames almost everything as something an individual can influence by speaking better, and a
 * handover between two autonomous units is not that problem. Here the thing under examination is
 * the shared routine and the quality the receiving side actually gets, so the content deliberately
 * routes towards agreeing, asking and renegotiating rather than towards persuading.
 *
 * What this is not: a competency framework, an assessment, or a validated taxonomy. The groups and
 * capabilities are editorial choices, written in observable terms so a reader can disagree with
 * them against a record. The two sources were consulted for the shape of an argument, not as
 * evidence that this application works; each `limits` field says what its source does not establish.
 *
 * Ids are kebab-case and chosen not to collide with the leadership pack, because the registry
 * treats a duplicate id as an authoring bug: a stored record pointing at an ambiguous capability
 * could no longer be explained to the person who created it.
 */
import type {
  CampaignDefinition,
  CapabilityDefinition,
  CapabilityGroupDefinition,
  ContentPack,
  MethodDefinition,
  SourceRef,
} from '~/content/types'

// ------------------------------------------------------------------ Sources
//
// Held as named consts so that the same reference cannot drift into two different wordings in
// two methods, which would make the citation unreliable without anybody noticing.

const WORK_DESIGN_SOURCE: SourceRef = {
  title: 'SMART work design: Accumulated evidence and future directions',
  author: 'Parker, S. K., & Knight, C.',
  url: 'https://onlinelibrary.wiley.com/doi/full/10.1002/hrm.22200',
  sourceType: 'academic',
  citedOn: '2026-11-11',
  retrieved: false,
  verificationNote:
    'The page was not retrieved while authoring this pack: publisher hosts are not reachable from the build environment. Title, authors and the claim attributed here are unverified and must be checked against the publisher before this content is used outside this repository.',
  supportedClaim:
    'Supports the claim that the characteristics of work itself, and not only individual skill, shape how work turns out; it is a synthesis of work-design models and the evidence behind them, not validation of this application to handovers between units.',
}

const PLANNING_SOURCE: SourceRef = {
  title: 'The when and how of planning: 642 tests of implementation intentions',
  author: 'Sheeran, P., Listrom, O., & Gollwitzer, P. M.',
  url: 'https://www.tandfonline.com/doi/full/10.1080/10463283.2024.2334563',
  sourceType: 'academic',
  citedOn: '2026-11-11',
  retrieved: false,
  verificationNote:
    'The page was not retrieved while authoring this pack: publisher hosts are not reachable from the build environment. Title, authors and the claim attributed here are unverified and must be checked against the publisher before this content is used outside this repository.',
  supportedClaim:
    'Supports cue-linked action planning; consulted at abstract level, and it does not establish transfer to agreements between organisational units.',
}

// ------------------------------------------------------------------ Capability groups
//
// Only the ids in the CapabilityGroup union may be used. Summaries are worded to hold for any
// pack that reuses the same group id, because the registry keeps one definition per id.

const COLLABORATION_GROUPS: CapabilityGroupDefinition[] = [
  {
    id: 'coordination',
    title: 'Coordination',
    summary: 'Who does what, who decides, and what each side expected.',
  },
  {
    id: 'shared-routines',
    title: 'Shared routines',
    summary: 'Routines two units follow together, and the quality that actually arrives.',
  },
  {
    id: 'relationships',
    title: 'Relationships',
    summary: 'Room for disagreement, and for another account of the same situation.',
  },
]

// ------------------------------------------------------------------ Capabilities

const COLLABORATION_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: 'compare-expectations',
    title: 'Compare what each side expected',
    group: 'coordination',
    observable:
      'Asks the sending and the receiving side separately what each expected the handover to contain, and writes the two answers down side by side without merging them into one.',
    nextExperiment:
      'Before the next handover, ask the receiving team’s coordinator what they expect to receive, and write it next to what your own side expected to send.',
    limits:
      'Comparing expectations does not say which expectation is reasonable. Both stated expectations can also differ from what either side actually does in practice.',
  },
  {
    id: 'surface-handover-gap',
    title: 'Name a gap in a handover',
    group: 'coordination',
    observable:
      'Describes one specific difference between what was handed over and what the receiving side needed, in terms of the work itself rather than the people involved.',
    nextExperiment:
      'Take one handover that went badly and write the gap as a single sentence about the work, with no reference to anybody’s effort or attitude.',
    limits:
      'Naming a gap does not establish its cause. A gap visible in the artefact may be produced by timing, tooling or workload that the handover itself does not show.',
  },
  {
    id: 'agree-minimal-routine',
    title: 'Agree a minimal shared routine',
    group: 'shared-routines',
    observable:
      'Proposes the smallest routine both units could follow: a cue, two or three items at most, a stated number of handovers, and a point at which it is reviewed or dropped.',
    nextExperiment:
      'Propose one routine with at most two items, for the next three handovers, and agree the date on which both sides look at it again.',
    limits:
      'Agreement to a routine is not adoption of it. This definition says nothing about routines imposed from above or prescribed by regulation, where agreeing is not on offer.',
  },
  {
    id: 'check-received-quality',
    title: 'Check what the receiving side actually got',
    group: 'shared-routines',
    observable:
      'Asks the receiving side what they could use from the last handover and what they had to redo, and records that answer as their account rather than as a verdict.',
    nextExperiment:
      'After the next handover, ask the receiving team’s coordinator what they had to redo, and record it in their words rather than your summary of it.',
    limits:
      'One account of received quality is one account. It does not measure quality, and the answer may be shaped by what the receiving side expects you to do with it.',
  },
  {
    id: 'renegotiate-agreement',
    title: 'Renegotiate an agreement that is not holding',
    group: 'relationships',
    observable:
      'Reopens a routine that is being skipped by asking what makes it hard to follow, and offers to change or drop it instead of restating it.',
    nextExperiment:
      'Take one agreement that is being skipped and ask the other side what would have to change for it to be worth following.',
    limits:
      'This covers renegotiation between units with comparable room to act. It does not cover a routine one side cannot decline, where the question is authority rather than agreement.',
  },
]

// ------------------------------------------------------------------ Methods

const COLLABORATION_METHODS: MethodDefinition[] = [
  {
    id: 'describe-handover-as-work',
    title: 'Describe the handover as work, not as willingness',
    summary:
      'A set of questions about the handover itself — its timing, its form, who has any say in it and who ever hears what became of it — used before anybody proposes training or a new template.',
    explanation:
      'A difficult handover is usually discussed as a matter of effort: the sending side should be more careful, the receiving side more patient. Work design research starts somewhere else. It describes features of work itself, such as how much variety and meaning it carries, how much room a person has to decide how to do it, how much contact and feedback they have with the people affected, and whether the demands placed on them are tolerable. It relates those features to how the work turns out. Read across to a handover, the questions change. Does the sending side ever find out what happened to what it sent. Does the receiving side have any say in the form it arrives in. Is anybody’s time budget large enough for the checking this handover quietly assumes. Who sees the whole path, and who sees only one end of it. This method uses those questions to describe the handover you have, in the form it currently exists, before any remedy is on the table. It is a way of looking, not a conclusion about either unit.',
    whenToUse: [
      'The same handover goes wrong in roughly the same way, with different people each time.',
      'The discussion has already settled on who should try harder, before anybody has described what actually moves across.',
      'You can see the sending end or the receiving end, but nobody present can describe both.',
    ],
    whenItMayNotFit: [
      'The form of the handover is fixed by regulation or contract, so describing it differently changes nothing.',
      'A single handover failed once, for a reason both sides already agree on.',
      'The difficulty is an open dispute between two people, where examining the work would read as avoiding it.',
    ],
    limits:
      'This is a lens for describing a handover, not a verdict on one. The source synthesises work-design models and the evidence behind them; it does not establish that redesigning a handover between two units improves what the receiving side gets, it was not conducted on handovers, and nothing in it validates this use of it. The citation itself was not retrieved while this pack was written, so the attribution is unverified. The questions can also make a workload problem look like a design problem.',
    sources: [WORK_DESIGN_SOURCE],
    prompts: [
      'Describe one recent handover in the form it arrived — what, when, in what state — without saying yet whether it was good.',
      'Which part of this handover could each side change on its own authority, and which part is set by something outside both units?',
      'Does anyone on the sending side ever find out what happened to what they sent? If not, what would be the smallest way to find out?',
      'If the work were arranged differently — different timing, different form, a short conversation instead of a document — which would you want to test first, and which would you rule out and why?',
    ],
    example: {
      title: 'Fictional example: two teams at an invented firm, Harbour Logistics',
      narrative:
        'This example is invented. At Harbour Logistics, a fictional company, a planning team sends fortnightly route extracts to a billing team. Billing returns about half of them. The first account is that planning is careless. Someone instead describes the work: the extract is cut on Friday afternoon, the planner never sees what billing does with it, and billing has no say in the columns. Described that way, two different questions appear — whether the cut could happen earlier in the week, and whether a planner could watch billing use one extract. Neither question settles anything. Both are cheaper to ask than a training course, and either could turn out to be the wrong question.',
    },
    capabilityIds: ['compare-expectations', 'surface-handover-gap', 'check-received-quality'],
    fitsChallenges: ['handover', 'ownership'],
  },
  {
    id: 'cue-linked-agreement',
    title: 'Write a minimal agreement as a cue and an action',
    summary:
      'Turning “we will communicate better” into a named moment and a named action that both units could recognise afterwards, for a stated number of handovers.',
    explanation:
      'Intentions tend to fail at the moment of action rather than at the moment of deciding. A large body of planning research examines one device for that gap: stating in advance which situation will trigger which action, so the situation does the remembering. The reviewed evidence concerns individuals planning their own behaviour, and the size of the effect varies with how specific the cue is and how much the person wanted the outcome to begin with. This method borrows the shape only. When two units agree a minimal routine, write it as a cue and an action that each side could recognise afterwards: when the extract is handed over on a Thursday, the sending side names the two open items in the ticket, and the receiving side replies within a day whether that is enough. Then fix how many handovers the agreement runs for, and when both sides look at it again. A general commitment has no cue, so afterwards nobody can say whether it happened, and the discussion returns to whose impression is right.',
    whenToUse: [
      'Both units have said they want the handover to improve and nothing has changed in the form it takes.',
      'A previous agreement exists but neither side can say when it is meant to apply.',
      'You want something you could review in three handovers rather than at the end of a quarter.',
    ],
    whenItMayNotFit: [
      'Following the routine would cost one side something it is measured on, in which case the obstacle is the measure, not the plan.',
      'The handover is irregular enough that no cue would recur inside the review period.',
      'The two sides disagree about what the handover is for, which a cue cannot settle.',
    ],
    limits:
      'The reviewed trials concern individuals forming plans for their own behaviour. They do not establish that a cue-linked agreement between two units holds, that one unit can plan on another’s behalf, or that any transfer to organisational routines occurs; the source was consulted at abstract level and the page was not retrieved while this pack was written, so the attribution is unverified. A precise cue also does nothing about an agreement that is skipped because following it is expensive for one side.',
    sources: [PLANNING_SOURCE],
    prompts: [
      'Write the agreement as a cue and an action: when X happens, this side does Y. Does the cue name a moment both sides would notice?',
      'What would you see, or not see, in the next three handovers that would tell you the agreement was followed?',
      'Which obstacle do you expect first, and what fallback would you accept — including asking someone else, or stopping the agreement?',
      'If the other unit will not agree to this, is there a smaller version one side could do alone, and would that still be worth doing?',
    ],
    example: {
      title: 'Fictional example: two items for three handovers',
      narrative:
        'This example is invented. In a fictional agency, a research unit and a communications unit argue about draft quality. The agreed wording had been “share earlier”, which nobody could check afterwards. They replace it with a cue: when a draft is sent for comment, the covering message lists the two numbers that are still provisional, and the communications unit replies by the next morning if either blocks them. It runs for three drafts. On the second draft the list is forgotten, and that is noted rather than treated as a verdict. At the review the two units keep the cue and drop the next-morning reply, which neither side had managed. Whether the drafts were better remains an open question.',
    },
    capabilityIds: ['agree-minimal-routine', 'renegotiate-agreement', 'check-received-quality'],
    fitsChallenges: ['handover', 'adoption'],
  },
]

// ------------------------------------------------------------------ Campaign
//
// The branch structure is the substance of this campaign, not decoration. Three of the four
// branches lead away from personal persuasion on purpose: one to the person's own side of the
// work, one to a negotiated routine, one to the conditions, and one to an honest stop when the
// handover has not happened. The conditions branch carries a routeNote because that is the branch
// a user is most likely to read as an instruction to practise harder.

const HANDOVER_CAMPAIGN: CampaignDefinition = {
  id: 'handover-between-units',
  version: 1,
  title: 'A handover between two units',
  purpose:
    'Look at one recurring handover between two units that do not report to each other: describe a case that went through and one that did not, compare what each side expected, test a minimal agreement if that is the right move, and ask the receiving side what they actually got.',
  limits:
    'This campaign does not assess either unit and does not settle who is right about the handover. It cannot establish that a minimal agreement improves anything: a handful of handovers, observed by one person who is also a party to them, is not evidence of an effect. It does not cover handovers whose form is fixed by contract or regulation, and it holds no view on which unit should change.',
  challenge: 'handover',
  situationPrompt:
    'A fictional example, offered only if you have no situation of your own yet. At Harbour Logistics, an invented company, a planning team hands route extracts to a billing team every fortnight. One extract last month went straight through; the next came back three times. Nobody has written down what either side expects an extract to contain.',
  firstStepId: 'orient-handover',
  steps: [
    {
      id: 'orient-handover',
      title: 'Which handover, and what room do you have',
      kind: 'orient',
      intent:
        'Establish which handover this is about and what the person can decide, recommend or negotiate about it.',
      prompt:
        'Pick one handover between two units that you are part of. In a sentence or two, say what moves across: a document, data, a case, a build, a decision. Then say what you could decide about it yourself, what you could recommend, and what you would have to negotiate with the other side. If this handover has not happened yet, say so — that leads somewhere different rather than nowhere.',
      choices: [
        {
          id: 'orient-pick-handover',
          label: 'I have a handover in mind',
          nextStepId: 'observe-two-cases',
          route: 'personal-practice',
        },
        {
          id: 'orient-not-happened',
          label: 'This handover has not happened yet',
          hint: 'There is nothing to observe yet. That is a position, not a failure.',
          nextStepId: 'handover-not-yet',
          route: 'conditions',
          seedConstraints: ['no-opportunity'],
        },
      ],
    },
    {
      id: 'observe-two-cases',
      title: 'One that went through, one that did not',
      kind: 'notice',
      intent:
        'Collect two concrete descriptions before any explanation, so later interpretation has something to be checked against.',
      prompt:
        'Describe two handovers of the same kind: one that went through without rework, and one that was difficult. Keep to what happened — what was sent, when, in what form, what came back, how many times. Leave out, for now, why you think the difficult one was difficult. That comes next and is kept separate on purpose.',
      template: {
        id: 'observe-handover-cases',
        kind: 'observation',
        route: 'personal-practice',
        title: 'Describe two handovers without explaining them',
        suggestedPlan: {
          cue: 'When the next handover of this kind goes out, and in the same sitting for one difficult case you remember',
          action:
            'Write what was sent, in what form, when, and what came back, for one straightforward case and one difficult case',
          obstacle: 'Writing the explanation instead of the description',
          fallback: 'Keep two separate notes: one for what happened, one for what you take it to mean',
          signal:
            'Two descriptions another person could read without being told which one was the difficult case',
        },
        capabilityIds: ['compare-expectations', 'surface-handover-gap'],
        methodIds: ['describe-handover-as-work'],
      },
      choices: [
        {
          id: 'two-cases-recorded',
          label: 'I have described both cases',
          nextStepId: 'competing-accounts',
          route: 'personal-practice',
        },
        {
          id: 'only-one-case',
          label: 'I only have one case',
          hint: 'One is enough to carry on with. Note which side of the comparison is missing.',
          nextStepId: 'competing-accounts',
          route: 'personal-practice',
        },
        {
          id: 'no-case-to-observe',
          label: 'There is nothing recent enough to describe',
          nextStepId: 'handover-not-yet',
          route: 'conditions',
          seedConstraints: ['no-opportunity'],
        },
      ],
    },
    {
      id: 'competing-accounts',
      title: 'Explanations that would fit both cases',
      kind: 'hypothesise',
      intent:
        'Hold several explanations open at once and keep them marked as explanations rather than findings.',
      prompt:
        'You now have descriptions. Write two or three explanations that would each fit them, and label each one as an explanation rather than a finding. One might be about what your own side hands over. One might be about a routine the two units never agreed. One might be about conditions neither side controls, such as timing, staffing or what each unit is measured on. Which of them would you most want to be wrong about, and what would show you that you were?',
      choices: [
        {
          id: 'explain-own-practice',
          label: 'What I hand over may be unclear',
          nextStepId: 'choose-next-move',
          route: 'personal-practice',
          seedHypothesis: {
            category: 'personal-practice',
            text: 'What I send may leave out something the receiving side needs, and I have not checked which part.',
          },
        },
        {
          id: 'explain-missing-routine',
          label: 'The two units never agreed a routine',
          nextStepId: 'choose-next-move',
          route: 'shared-practice',
          seedHypothesis: {
            category: 'shared-practice',
            text: 'The two units have no agreed routine for this handover, so each applies its own standard and neither is written down.',
          },
        },
        {
          id: 'explain-conditions',
          label: 'The conditions pull the two sides apart',
          nextStepId: 'choose-next-move',
          route: 'conditions',
          seedHypothesis: {
            category: 'conditions',
            text: 'The two units are measured on different things, so care taken at the handover costs one of them something.',
          },
        },
      ],
    },
    {
      id: 'choose-next-move',
      title: 'Choose one next move',
      kind: 'choose',
      intent:
        'Choose a single next move, with asking for a routine and waiting both offered as real moves rather than as last resorts.',
      prompt:
        'Pick the move you would actually make in the next fortnight. These lead to different places and none of them is the correct answer; you can come back and take another.',
      choices: [
        {
          id: 'choose-own-practice',
          label: 'Change something on my own side first',
          hint: 'Needs nobody else’s agreement.',
          nextStepId: 'sharpen-own-handover',
          route: 'personal-practice',
          seedHypothesis: {
            category: 'personal-practice',
            text: 'Part of the difficulty is in what my side hands over, and changing one item would show whether that is so.',
          },
        },
        {
          id: 'choose-shared-agreement',
          label: 'Take a minimal agreement to the other unit',
          hint: 'A routine both sides follow, not a request that they try harder.',
          nextStepId: 'rehearse-the-proposal',
          route: 'shared-practice',
          seedHypothesis: {
            category: 'shared-practice',
            text: 'A two-item routine, agreed for three handovers, would change what arrives more than any further explaining would.',
          },
        },
        {
          id: 'choose-raise-conditions',
          label: 'Raise it as a condition instead',
          hint: 'There is no shared routine to follow, or the incentives pull against one.',
          nextStepId: 'ask-for-shared-routine',
          route: 'conditions',
          seedConstraints: ['no-shared-routine'],
          seedHypothesis: {
            category: 'conditions',
            text: 'No routine exists for this handover and neither unit can set one alone, so the next move is a request rather than an attempt.',
          },
        },
        {
          id: 'choose-not-yet',
          label: 'Nothing is coming up to act on',
          hint: 'No handover is due inside the period you would review.',
          nextStepId: 'handover-not-yet',
          route: 'conditions',
          seedConstraints: ['no-opportunity'],
        },
      ],
    },
    {
      id: 'sharpen-own-handover',
      title: 'Change one thing on your own side',
      kind: 'prepare',
      intent:
        'Plan one change to the person’s own side of the handover, small enough to try once and to observe.',
      prompt:
        'Choose one thing about what you send that you could change on your own authority, and plan it as a single attempt: the cue, the action, the obstacle you expect, what you would do instead if that obstacle appears, and what you could observe afterwards. This branch needs nobody else to agree to anything, which is also its limit: it cannot change what the other side does.',
      template: {
        id: 'tighten-own-handover',
        kind: 'real-attempt',
        route: 'personal-practice',
        title: 'Add the one item they came back for last time',
        suggestedPlan: {
          cue: 'Before you send the next handover of this kind',
          action:
            'Add the one item the receiving side had to come back for last time, and say in the covering note that you have added it',
          obstacle: 'There is no time before the deadline',
          fallback:
            'Send it as it stands and note which item you could not add, rather than dropping the attempt',
          signal: 'Whether the receiving side comes back for that same item again',
        },
        capabilityIds: ['surface-handover-gap', 'compare-expectations'],
        methodIds: ['describe-handover-as-work'],
      },
      choices: [
        {
          id: 'own-practice-to-review',
          label: 'I have tried it — look at what came back',
          nextStepId: 'review-received-quality',
          route: 'personal-practice',
        },
        {
          id: 'own-practice-needs-agreement',
          label: 'This only works if both sides do it',
          hint: 'Then it is a shared agreement rather than a personal change.',
          nextStepId: 'rehearse-the-proposal',
          route: 'shared-practice',
        },
      ],
    },
    {
      id: 'rehearse-the-proposal',
      title: 'Rehearse putting the agreement',
      kind: 'rehearse',
      intent:
        'Practise proposing a minimal routine against a sceptical counterpart, and find out which item survives the first objection.',
      prompt:
        'You are going to propose a small shared routine. Rehearse it once against the script below. The point is not to win the exchange. It is to find out which of your two items survives the first objection, what you would accept instead, and which objection you have no answer to yet. This is recorded as a rehearsal and never as something that happened at work.',
      template: {
        id: 'rehearse-minimal-agreement',
        kind: 'rehearsal',
        route: 'shared-practice',
        title: 'Rehearsal: proposing two items to a sceptical counterpart',
        suggestedPlan: {
          cue: 'A quarter of an hour on your own, before you speak to the other unit',
          action:
            'Work through the script once, then write the two items you would keep and the one you would drop',
          obstacle: 'The rehearsal turns into planning how to win the argument',
          fallback: 'Stop and write down what following the routine would cost the other side',
          signal: 'Two items written down, and one objection you cannot yet answer',
        },
        capabilityIds: ['agree-minimal-routine', 'renegotiate-agreement'],
        methodIds: ['cue-linked-agreement'],
        rehearsal: {
          role: 'the receiving team’s coordinator, who doubts that a shared checklist would help',
          opening:
            'You wanted to talk about the handover. I should say at the start that I do not think another checklist is the answer.',
          lines: [
            'We had a template two years ago. People filled it in and the work still arrived incomplete.',
            'What would be on this list that is not already in the ticket?',
            'My team is measured on throughput. Working through a list does not help us with that.',
            'If we agree to this, who decides when something is not good enough to accept?',
            'I would rather you simply asked us before you sent the next one.',
            'Two items, for three handovers, and then we both look at whether anything changed. I could try that.',
          ],
          note: 'This is a scripted practice. The lines are fiction, written in advance for rehearsal; they are not a record of anything anybody said at work, and a rehearsal is not workplace application.',
        },
      },
      choices: [
        {
          id: 'rehearsal-done-propose',
          label: 'Now make the proposal for real',
          nextStepId: 'test-minimal-agreement',
          route: 'shared-practice',
        },
        {
          id: 'rehearsal-shows-conditions',
          label: 'Every version of this costs the other side something',
          hint: 'If each option runs against what they are measured on, that is a condition rather than a conversation.',
          nextStepId: 'ask-for-shared-routine',
          route: 'conditions',
          seedConstraints: ['conflicting-incentives'],
        },
      ],
    },
    {
      id: 'test-minimal-agreement',
      title: 'Put the minimal agreement to the other unit',
      kind: 'attempt',
      intent:
        'Propose the routine for real, for a fixed number of handovers, and record what was agreed, changed or refused.',
      prompt:
        'Make the proposal for real: a cue, at most two items, a stated number of handovers, and a point at which both sides look at it again. Afterwards, record what was agreed, what was refused, and what you changed on the spot. A refusal is a result and is worth recording as one; it is not a failed attempt.',
      template: {
        id: 'try-minimal-agreement',
        kind: 'real-attempt',
        route: 'shared-practice',
        title: 'Propose two items and a cue, for three handovers',
        suggestedPlan: {
          cue: 'At the next planning contact with the receiving team’s coordinator',
          action:
            'Propose a cue and two items, for three handovers, with a date on which both sides look at it again',
          obstacle: 'The other side proposes something much larger, or declines the routine',
          fallback:
            'Ask what they would accept for three handovers, and record the refusal in their words if there is one',
          signal: 'A cue and action both sides can repeat back, or a recorded refusal',
        },
        capabilityIds: ['agree-minimal-routine', 'compare-expectations'],
        methodIds: ['cue-linked-agreement', 'describe-handover-as-work'],
      },
      choices: [
        {
          id: 'attempt-to-review',
          label: 'It ran — look at what the receiving side got',
          nextStepId: 'review-received-quality',
          route: 'shared-practice',
        },
        {
          id: 'attempt-did-not-happen',
          label: 'The handover never came round',
          nextStepId: 'handover-not-yet',
          route: 'conditions',
          seedConstraints: ['no-opportunity'],
        },
      ],
    },
    {
      id: 'ask-for-shared-routine',
      title: 'Ask for a routine, or raise the incentives',
      kind: 'follow-up',
      intent:
        'Make the request to whoever could set a routine or change the measures, and follow up on whatever answer comes back.',
      prompt:
        'Name the condition in one sentence: there is no agreed routine for this handover, or the two units are measured on things that pull against each other. Then decide who you would put it to — a line manager, a sponsor, both units’ coordinators together — by role, not by name. Plan the request, then record what came back, including no answer and not now. You do not need a solution in order to make the request.',
      routeNote:
        'This step is about conditions, not about your own skill. If the two units have no agreed routine for this handover, or are measured on things that pull against each other, no amount of personal practice will fix that: the practice would simply be absorbed by the conditions. Asking for a shared routine, or raising the incentives with someone who could change them, is a legitimate and complete answer here. The campaign can end on it, and the record will say that is what you did.',
      template: {
        id: 'request-shared-routine',
        kind: 'real-attempt',
        route: 'conditions',
        title: 'Make the request and record the answer',
        suggestedPlan: {
          cue: 'At your next one-to-one, or the next time this handover is reopened',
          action:
            'State the condition in one sentence and ask for an agreed routine, or ask how the two units’ measures are meant to fit together',
          obstacle: 'You are asked for a proposal you do not have',
          fallback:
            'Ask which roles would have to agree, and leave the request open rather than inventing a solution on the spot',
          signal: 'An answer on the record — yes, no or not now — and a date it will be looked at again',
        },
        capabilityIds: ['surface-handover-gap', 'renegotiate-agreement'],
        methodIds: ['describe-handover-as-work'],
      },
      choices: [
        {
          id: 'ask-made-close',
          label: 'The request is made — close this here',
          hint: 'The request is the outcome. Nothing further is required of you.',
          nextStepId: null,
          route: 'conditions',
        },
        {
          id: 'ask-made-review',
          label: 'Something changed — look at what arrives now',
          nextStepId: 'review-received-quality',
          route: 'conditions',
        },
      ],
    },
    {
      id: 'review-received-quality',
      title: 'What the receiving side actually got',
      kind: 'review',
      intent:
        'Separate what was observed from what it was taken to mean, and get the receiving side’s own account of what arrived.',
      prompt:
        'Write what you observed in the handovers since your attempt. Then, separately, what you take it to mean. Then one explanation that competes with yours. Finally, ask the receiving team’s coordinator what they could use and what they had to redo, and record their answer in their words rather than your summary. Three handovers cannot tell you whether the agreement worked, so hold the conclusion loosely.',
      template: {
        id: 'observe-received-quality',
        kind: 'observation',
        route: 'shared-practice',
        title: 'Ask the receiving side what arrived',
        suggestedPlan: {
          cue: 'After the third handover under the agreement',
          action:
            'Ask the receiving team’s coordinator what they could use and what they had to redo, and write their answer in their words',
          obstacle: 'They answer politely rather than concretely',
          fallback: 'Ask what they did with the last one, step by step, instead of asking whether it was good',
          signal: 'A description of rework in the receiving side’s own words, kept separate from your view of it',
        },
        capabilityIds: ['check-received-quality', 'compare-expectations'],
        methodIds: ['cue-linked-agreement', 'describe-handover-as-work'],
      },
      choices: [
        {
          id: 'review-repeat-shared',
          label: 'Adjust the agreement and run it again',
          nextStepId: 'test-minimal-agreement',
          route: 'shared-practice',
        },
        {
          id: 'review-raise-conditions',
          label: 'The routine is being skipped for reasons neither side controls',
          nextStepId: 'ask-for-shared-routine',
          route: 'conditions',
        },
        {
          id: 'review-close',
          label: 'Stop here and keep the record',
          hint: 'Stopping after one review is a complete use of this campaign.',
          nextStepId: null,
          route: 'personal-practice',
        },
      ],
    },
    {
      id: 'handover-not-yet',
      title: 'The handover has not happened',
      kind: 'close',
      intent:
        'Close the campaign when there is no handover to work with, without recording that as a failed attempt.',
      prompt:
        'The handover has not come round yet, or it was cancelled. Nothing is owed here. If it would be useful, note the cue you will watch for — the next time this kind of work crosses between the two units — and the first thing you would look at when it does. You can close this now and start again later, or describe an earlier case instead.',
      choices: [
        {
          id: 'not-yet-close',
          label: 'Close this for now',
          hint: 'No opportunity is a result. It is not a failed attempt and nothing is marked incomplete.',
          nextStepId: null,
          route: 'conditions',
        },
        {
          id: 'not-yet-look-back',
          label: 'Describe a handover from before instead',
          nextStepId: 'observe-two-cases',
          route: 'personal-practice',
        },
      ],
    },
  ],
}

// ------------------------------------------------------------------ Pack

export const COLLABORATION_PACK: ContentPack = {
  id: 'collaboration-v1',
  version: 1,
  title: 'Collaboration',
  domainLabel: 'Collaboration',
  summary:
    'Capabilities, two methods and one campaign for handovers between units that do not report to each other: comparing what each side expected, agreeing a minimal routine, and looking at the quality the receiving side actually gets.',
  note: 'This pack is a provisional authored map, not a validated competency taxonomy. The groups, capabilities and campaign branches are editorial choices, written so that each can be observed and argued with; they have not been derived from job analysis, checked for coverage, or validated against any outcome. Nothing here assesses anybody, and no combination of entries amounts to a measure of how well two units work together.',
  capabilityGroups: COLLABORATION_GROUPS,
  capabilities: COLLABORATION_CAPABILITIES,
  methods: COLLABORATION_METHODS,
  campaigns: [HANDOVER_CAMPAIGN],
}
