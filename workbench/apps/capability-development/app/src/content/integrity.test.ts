/**
 * Properties every installed content pack must satisfy, checked by walking INSTALLED_PACKS rather
 * than by naming today's two packs. A future pack is held to the same properties automatically,
 * which is the point: these are product rules about what may be offered to a person, not a
 * description of the content that happens to exist.
 *
 * Each failure names the pack, campaign, step or id at fault, so a content author can find the
 * offending entry without reading the test.
 */
import { describe, expect, it } from 'vitest'
import { createDemoUserData } from '~/content/demo'
import { createContentRegistry, INSTALLED_PACKS } from '~/content/index'
import type {
  ActivityTemplate,
  CampaignDefinition,
  CampaignStep,
  ContentPack,
} from '~/content/types'
import { deriveCapabilityEvidence } from '~/domain/evidence'
import { ACTIVITY_KINDS, CONSTRAINT_KINDS, DEVELOPMENT_ROUTES } from '~/domain/types'
import { validateUserData } from '~/domain/validation'

const registry = createContentRegistry(INSTALLED_PACKS)

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_SHAPE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
/**
 * An invitation to write down who somebody is. The app records other people by role only, so a
 * prompt asking for a name would collect a third party's data that the person never consented to
 * having stored in somebody else's development journal.
 */
const ASKS_FOR_IDENTITY =
  /\b(their|his|her|the (colleague|person)['’]?s?) (full )?(name|surname|email|e-mail|phone number)\b/i

/** Minimum lengths below which a field states nothing useful to the person reading it. */
const MIN_LIMITS_LENGTH = 40
const MIN_ROUTE_NOTE_LENGTH = 40
const MIN_REHEARSAL_NOTE_LENGTH = 80
const MIN_UNRETRIEVED_NOTE_LENGTH = 60
const MIN_REHEARSAL_LINES = 3

// ------------------------------------------------------------------ Walking the installed content

interface CampaignAt {
  pack: ContentPack
  campaign: CampaignDefinition
}

interface StepAt extends CampaignAt {
  step: CampaignStep
}

interface TemplateAt extends StepAt {
  template: ActivityTemplate
}

const allCampaigns: CampaignAt[] = INSTALLED_PACKS.flatMap((pack) =>
  pack.campaigns.map((campaign) => ({ pack, campaign })),
)

const allSteps: StepAt[] = allCampaigns.flatMap(({ pack, campaign }) =>
  campaign.steps.map((step) => ({ pack, campaign, step })),
)

const allTemplates: TemplateAt[] = allSteps.flatMap((at) =>
  at.step.template === undefined ? [] : [{ ...at, template: at.step.template }],
)

function where({ pack, campaign }: CampaignAt): string {
  return `pack ${pack.id} campaign ${campaign.id}`
}

function whereStep(at: StepAt): string {
  return `${where(at)} step ${at.step.id}`
}

function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id)
    seen.add(id)
  }
  return [...repeated]
}

/** Every step the person can actually arrive at by following choices from the first step. */
function reachableSteps(campaign: CampaignDefinition): Set<string> {
  const byId = new Map(campaign.steps.map((s) => [s.id, s]))
  const seen = new Set<string>()
  const queue: string[] = [campaign.firstStepId]
  while (queue.length > 0) {
    const id = queue.shift()
    if (id === undefined || seen.has(id)) continue
    seen.add(id)
    const step = byId.get(id)
    if (step === undefined) continue
    for (const choice of step.choices) {
      if (choice.nextStepId !== null && !seen.has(choice.nextStepId)) queue.push(choice.nextStepId)
    }
  }
  return seen
}

/** Steps from which a closing choice can still be reached, directly or by following choices. */
function stepsThatCanClose(campaign: CampaignDefinition): Set<string> {
  const closing = new Set<string>()
  let changed = true
  while (changed) {
    changed = false
    for (const step of campaign.steps) {
      if (closing.has(step.id)) continue
      const closes = step.choices.some(
        (choice) => choice.nextStepId === null || closing.has(choice.nextStepId),
      )
      if (closes) {
        closing.add(step.id)
        changed = true
      }
    }
  }
  return closing
}

/** Strings a person is invited to answer, or is read aloud, with a location for each. */
function personFacingStrings(): { at: string; field: string; text: string }[] {
  const strings: { at: string; field: string; text: string }[] = []
  for (const pack of INSTALLED_PACKS) {
    for (const method of pack.methods) {
      method.prompts.forEach((text, i) => {
        strings.push({ at: `pack ${pack.id} method ${method.id}`, field: `prompts[${i}]`, text })
      })
    }
  }
  for (const at of allSteps) {
    strings.push({ at: whereStep(at), field: 'prompt', text: at.step.prompt })
    if (at.step.routeNote !== undefined) {
      strings.push({ at: whereStep(at), field: 'routeNote', text: at.step.routeNote })
    }
  }
  for (const at of allTemplates) {
    const { template } = at
    const plan = template.suggestedPlan
    for (const [field, text] of Object.entries(plan)) {
      if (typeof text === 'string') {
        strings.push({ at: `${whereStep(at)} template ${template.id}`, field: `suggestedPlan.${field}`, text })
      }
    }
    if (template.rehearsal !== undefined) {
      strings.push({
        at: `${whereStep(at)} template ${template.id}`,
        field: 'rehearsal.opening',
        text: template.rehearsal.opening,
      })
      template.rehearsal.lines.forEach((line, i) => {
        strings.push({
          at: `${whereStep(at)} template ${template.id}`,
          field: `rehearsal.lines[${i}]`,
          text: line,
        })
      })
    }
  }
  return strings
}

/**
 * A run of digits long enough to be a telephone number. Nine digits is the threshold so that a
 * calendar date in authored text is not mistaken for a contact detail.
 */
function looksLikePhoneNumber(text: string): boolean {
  const runs = text.match(/[+\d][\d ()-]{5,}\d/g) ?? []
  return runs.some((run) => run.replace(/\D/g, '').length >= 9)
}

// ------------------------------------------------------------------ Ids

describe('content ids', () => {
  it('is non-empty and kebab-case everywhere a record could point', () => {
    // A stored record holds the id, not the title. An id with a space, a capital or an accident of
    // copy-paste is still exportable, which makes it hard to fix once anybody has records.
    const offenders: string[] = []
    const check = (id: string, at: string) => {
      if (id.trim() === '') offenders.push(`${at}: empty id`)
      else if (!KEBAB_CASE.test(id)) offenders.push(`${at}: "${id}" is not kebab-case`)
    }

    for (const pack of INSTALLED_PACKS) {
      for (const capability of pack.capabilities) check(capability.id, `pack ${pack.id} capability`)
      for (const method of pack.methods) check(method.id, `pack ${pack.id} method`)
      for (const campaign of pack.campaigns) check(campaign.id, `pack ${pack.id} campaign`)
    }
    for (const at of allSteps) {
      check(at.step.id, `${where(at)} step`)
      for (const choice of at.step.choices) check(choice.id, `${whereStep(at)} choice`)
    }
    for (const at of allTemplates) check(at.template.id, `${whereStep(at)} template`)

    expect(offenders, 'ids that are empty or not kebab-case').toEqual([])
  })

  it('is unique within its scope', () => {
    // Step ids are scoped to a campaign and choice ids to a step; capability, method, campaign and
    // template ids are resolved across the whole installed content, so a clash there makes a
    // record ambiguous and no longer explainable to the person who created it.
    const offenders: string[] = []

    const capabilityIds = INSTALLED_PACKS.flatMap((p) => p.capabilities.map((c) => c.id))
    for (const id of duplicates(capabilityIds)) offenders.push(`capability id "${id}" is defined twice`)
    const methodIds = INSTALLED_PACKS.flatMap((p) => p.methods.map((m) => m.id))
    for (const id of duplicates(methodIds)) offenders.push(`method id "${id}" is defined twice`)
    const campaignIds = allCampaigns.map(({ campaign }) => campaign.id)
    for (const id of duplicates(campaignIds)) offenders.push(`campaign id "${id}" is defined twice`)
    const templateIds = allTemplates.map(({ template }) => template.id)
    for (const id of duplicates(templateIds)) offenders.push(`template id "${id}" is defined twice`)
    const packIds = INSTALLED_PACKS.map((p) => p.id)
    for (const id of duplicates(packIds)) offenders.push(`pack id "${id}" is installed twice`)

    for (const at of allCampaigns) {
      for (const id of duplicates(at.campaign.steps.map((s) => s.id))) {
        offenders.push(`${where(at)}: step id "${id}" appears twice`)
      }
    }
    for (const at of allSteps) {
      for (const id of duplicates(at.step.choices.map((c) => c.id))) {
        offenders.push(`${whereStep(at)}: choice id "${id}" appears twice`)
      }
    }

    expect(offenders, 'duplicate ids').toEqual([])
  })
})

// ------------------------------------------------------------------ Step graph

describe('campaign step graph', () => {
  it('starts at a step that exists', () => {
    for (const at of allCampaigns) {
      const ids = at.campaign.steps.map((s) => s.id)
      expect(ids, `${where(at)} firstStepId "${at.campaign.firstStepId}"`).toContain(at.campaign.firstStepId)
    }
  })

  it('points every branch at a step in the same campaign, or at the end', () => {
    // A dangling target strands the person mid-campaign: the path record holds a step the campaign
    // cannot show, and there is no branch out of it.
    const offenders: string[] = []
    for (const at of allCampaigns) {
      const ids = new Set(at.campaign.steps.map((s) => s.id))
      for (const step of at.campaign.steps) {
        for (const choice of step.choices) {
          if (choice.nextStepId === null) continue
          if (!ids.has(choice.nextStepId)) {
            offenders.push(
              `${where(at)} step ${step.id} choice ${choice.id}: nextStepId "${choice.nextStepId}" is not a step of this campaign`,
            )
          }
        }
      }
    }
    expect(offenders, 'dangling branch targets').toEqual([])
  })

  it('leaves no step the person cannot reach', () => {
    // An unreachable step is authored work nobody will ever see, and usually a sign that a branch
    // was renamed without its target being updated.
    const offenders: string[] = []
    for (const at of allCampaigns) {
      const reachable = reachableSteps(at.campaign)
      for (const step of at.campaign.steps) {
        if (!reachable.has(step.id)) {
          offenders.push(`${where(at)}: step ${step.id} cannot be reached from ${at.campaign.firstStepId}`)
        }
      }
    }
    expect(offenders, 'unreachable steps').toEqual([])
  })

  it('gives every step at least one choice', () => {
    // Without a choice the person has arrived somewhere they can neither continue from nor close.
    const offenders: string[] = []
    for (const at of allSteps) {
      if (at.step.choices.length === 0) offenders.push(`${whereStep(at)} has no choices`)
    }
    expect(offenders, 'steps with no way onward').toEqual([])
  })

  it('leaves a way out of every step', () => {
    // No step may trap the person in a cycle with no closing branch. Reaching a closing choice
    // transitively is enough: campaigns are allowed to loop, as long as the loop can be left.
    const offenders: string[] = []
    for (const at of allCampaigns) {
      const canClose = stepsThatCanClose(at.campaign)
      for (const step of at.campaign.steps) {
        if (!canClose.has(step.id)) {
          offenders.push(`${where(at)}: step ${step.id} cannot reach a branch that closes the campaign`)
        }
      }
    }
    expect(offenders, 'steps with no exit').toEqual([])
  })
})

// ------------------------------------------------------------------ Routes

describe('development routes', () => {
  it('labels every branch with a known route', () => {
    const offenders: string[] = []
    for (const at of allSteps) {
      for (const choice of at.step.choices) {
        if (!DEVELOPMENT_ROUTES.includes(choice.route)) {
          offenders.push(`${whereStep(at)} choice ${choice.id}: unknown route "${choice.route}"`)
        }
      }
    }
    expect(offenders, 'unknown routes').toEqual([])
  })

  it('offers all three routes in every campaign', () => {
    // A campaign whose every branch is personal practice would hand the person responsibility for
    // an institutional problem, which is the product failure this application exists to avoid.
    for (const at of allCampaigns) {
      const routes = new Set(at.campaign.steps.flatMap((s) => s.choices.map((c) => c.route)))
      const missing = DEVELOPMENT_ROUTES.filter((route) => !routes.has(route))
      expect(missing, `${where(at)} offers no branch on these routes`).toEqual([])
    }
  })
})

// ------------------------------------------------------------------ Conditions

describe('conditions branches', () => {
  it('offers a conditions branch in every campaign', () => {
    for (const at of allCampaigns) {
      const conditions = at.campaign.steps.flatMap((s) =>
        s.choices.filter((c) => c.route === 'conditions').map((c) => `${s.id}/${c.id}`),
      )
      expect(conditions.length, `${where(at)} has no conditions branch`).toBeGreaterThan(0)
    }
  })

  it('explains at least one conditions step in a note', () => {
    // The conditions branch is the one a person is most likely to read as an instruction to
    // practise harder. At least one such step has to say, in words, that it is not that.
    for (const at of allCampaigns) {
      const explained = at.campaign.steps.filter(
        (s) => s.choices.some((c) => c.route === 'conditions') && (s.routeNote ?? '').trim() !== '',
      )
      expect(
        explained.map((s) => s.id).length,
        `${where(at)} has no conditions step carrying a routeNote`,
      ).toBeGreaterThan(0)
    }
  })

  it('never leaves a route note too short to do its job', () => {
    const offenders: string[] = []
    for (const at of allSteps) {
      const note = at.step.routeNote
      if (note === undefined) continue
      if (note.trim().length < MIN_ROUTE_NOTE_LENGTH) {
        offenders.push(`${whereStep(at)}: routeNote is ${note.trim().length} characters`)
      }
    }
    expect(offenders, `route notes shorter than ${MIN_ROUTE_NOTE_LENGTH} characters`).toEqual([])
  })
})

// ------------------------------------------------------------------ No opportunity

describe('the no-opportunity path', () => {
  it('lets every campaign record that there was nothing to try, and stop there', () => {
    // An absent opportunity is one of the commonest reasons a development plan produces nothing.
    // A campaign that cannot record it pushes the person towards inventing an attempt.
    for (const at of allCampaigns) {
      const canClose = stepsThatCanClose(at.campaign)
      const branches = at.campaign.steps.flatMap((step) =>
        step.choices
          .filter((choice) => (choice.seedConstraints ?? []).includes('no-opportunity'))
          .map((choice) => ({ step, choice })),
      )
      expect(branches.length, `${where(at)} has no branch seeding "no-opportunity"`).toBeGreaterThan(0)

      const dead = branches.filter(
        ({ choice }) => choice.nextStepId !== null && !canClose.has(choice.nextStepId),
      )
      expect(
        dead.map(({ step, choice }) => `${step.id}/${choice.id}`),
        `${where(at)}: no-opportunity branches that cannot close the campaign`,
      ).toEqual([])
    }
  })
})

// ------------------------------------------------------------------ Seeded records

describe('seeded constraints and hypotheses', () => {
  it('seeds only constraints and hypothesis categories the domain knows', () => {
    // A seeded record is written into the person's own journal on confirmation. An unknown value
    // would be rejected by validation on the next import, losing the record silently.
    const offenders: string[] = []
    for (const at of allSteps) {
      for (const choice of at.step.choices) {
        for (const constraint of choice.seedConstraints ?? []) {
          if (!CONSTRAINT_KINDS.includes(constraint)) {
            offenders.push(`${whereStep(at)} choice ${choice.id}: unknown constraint "${constraint}"`)
          }
        }
        const hypothesis = choice.seedHypothesis
        if (hypothesis === undefined) continue
        if (!DEVELOPMENT_ROUTES.includes(hypothesis.category)) {
          offenders.push(`${whereStep(at)} choice ${choice.id}: unknown hypothesis category "${hypothesis.category}"`)
        }
        if (hypothesis.text.trim() === '') {
          offenders.push(`${whereStep(at)} choice ${choice.id}: empty hypothesis text`)
        }
      }
    }
    expect(offenders, 'invalid seeded records').toEqual([])
  })
})

// ------------------------------------------------------------------ Templates

describe('activity templates', () => {
  it('uses an activity kind the domain knows', () => {
    const offenders: string[] = []
    for (const at of allTemplates) {
      if (!ACTIVITY_KINDS.includes(at.template.kind)) {
        offenders.push(`${whereStep(at)} template ${at.template.id}: unknown kind "${at.template.kind}"`)
      }
    }
    expect(offenders, 'unknown activity kinds').toEqual([])
  })

  it('refers only to capabilities and methods some pack defines', () => {
    // Planning an activity from a template copies these ids into the person's record. An id no
    // pack defines fails the planActivity command at runtime, in front of the person.
    const offenders: string[] = []
    for (const at of allTemplates) {
      for (const id of at.template.capabilityIds) {
        if (registry.capability(id) === undefined) {
          offenders.push(`${whereStep(at)} template ${at.template.id}: unknown capability "${id}"`)
        }
      }
      for (const id of at.template.methodIds) {
        if (registry.method(id) === undefined) {
          offenders.push(`${whereStep(at)} template ${at.template.id}: unknown method "${id}"`)
        }
      }
    }
    expect(offenders, 'templates referring to content nothing defines').toEqual([])
  })

  it('never pre-fills a review date', () => {
    // The person picks the date they will look back on this. A pre-filled one would be a date
    // nobody chose, sitting in their own plan.
    const offenders: string[] = []
    for (const at of allTemplates) {
      if ('reviewOn' in at.template.suggestedPlan) {
        offenders.push(`${whereStep(at)} template ${at.template.id}: suggestedPlan sets reviewOn`)
      }
      if (at.template.suggestedPlan.reviewOn !== undefined) {
        offenders.push(
          `${whereStep(at)} template ${at.template.id}: suggestedPlan.reviewOn is "${at.template.suggestedPlan.reviewOn}"`,
        )
      }
    }
    expect(offenders, 'templates pre-filling a review date').toEqual([])
  })
})

// ------------------------------------------------------------------ Rehearsals

describe('rehearsals', () => {
  it('labels a scripted counterpart as a rehearsal, and nothing else', () => {
    // The rehearsal/real distinction is a product invariant: a scripted exchange is never recorded
    // or credited as workplace application. A script on a real-attempt template, or a rehearsal
    // without one, would blur exactly that line.
    const offenders: string[] = []
    for (const at of allTemplates) {
      const { template } = at
      const label = `${whereStep(at)} template ${template.id}`
      if (template.kind === 'rehearsal' && template.rehearsal === undefined) {
        offenders.push(`${label}: kind is rehearsal but no script is attached`)
      }
      if (template.rehearsal !== undefined && template.kind !== 'rehearsal') {
        offenders.push(`${label}: has a rehearsal script but kind is "${template.kind}"`)
      }
    }
    expect(offenders, 'mislabelled rehearsals').toEqual([])
  })

  it('gives each script a counterpart, an opening and enough lines to be worth doing', () => {
    const offenders: string[] = []
    const scripts = allTemplates.filter((at) => at.template.rehearsal !== undefined)
    expect(scripts.length, 'installed content offers at least one rehearsal script').toBeGreaterThan(0)

    for (const at of scripts) {
      const script = at.template.rehearsal
      if (script === undefined) continue
      const label = `${whereStep(at)} template ${at.template.id}`
      if (script.role.trim() === '') offenders.push(`${label}: empty role`)
      if (script.opening.trim() === '') offenders.push(`${label}: empty opening`)
      if (script.lines.length < MIN_REHEARSAL_LINES) {
        offenders.push(`${label}: ${script.lines.length} lines, fewer than ${MIN_REHEARSAL_LINES}`)
      }
      script.lines.forEach((line, i) => {
        if (line.trim() === '') offenders.push(`${label}: lines[${i}] is empty`)
      })
    }
    expect(offenders, 'incomplete rehearsal scripts').toEqual([])
  })

  it('says in its note that the script is fiction and not a record of real work', () => {
    // Both claims have to be there. "This is scripted" alone leaves the person free to read the
    // rehearsal as something that happened at work; saying it is not a record, without saying it
    // is fiction, leaves the counterpart looking like a simulation of a real colleague.
    const offenders: string[] = []
    for (const at of allTemplates) {
      const script = at.template.rehearsal
      if (script === undefined) continue
      const label = `${whereStep(at)} template ${at.template.id}`
      const note = script.note.trim()
      if (note.length < MIN_REHEARSAL_NOTE_LENGTH) {
        offenders.push(`${label}: note is ${note.length} characters, fewer than ${MIN_REHEARSAL_NOTE_LENGTH}`)
      }
      if (!/script|fiction|fictional/i.test(note)) {
        offenders.push(`${label}: note does not say the exchange is scripted or fictional`)
      }
      if (!/not a record|never a record|not .{0,20}at work/i.test(note)) {
        offenders.push(`${label}: note does not say it is not a record of real work`)
      }
    }
    expect(offenders, 'rehearsal notes that do not make both claims').toEqual([])
  })
})

// ------------------------------------------------------------------ Citations

describe('citations', () => {
  it('carries its verification state, every time', () => {
    // A citation shown without its verification state would read as a checked source. Recording a
    // page as consulted when nobody opened it is invented verification, which this project forbids.
    const offenders: string[] = []
    for (const pack of INSTALLED_PACKS) {
      for (const method of pack.methods) {
        method.sources.forEach((source, i) => {
          const label = `pack ${pack.id} method ${method.id} sources[${i}]`
          if (source.title.trim() === '') offenders.push(`${label}: empty title`)
          if (source.author.trim() === '') offenders.push(`${label}: empty author`)
          if (!source.url.startsWith('https://')) offenders.push(`${label}: url "${source.url}" is not https://`)
          if (!ISO_DATE.test(source.citedOn)) offenders.push(`${label}: citedOn "${source.citedOn}" is not YYYY-MM-DD`)
          if (source.supportedClaim.trim() === '') offenders.push(`${label}: empty supportedClaim`)
          if (typeof source.retrieved !== 'boolean') {
            offenders.push(`${label}: retrieved is "${typeof source.retrieved}" rather than a boolean`)
          }
          const note = source.verificationNote.trim()
          if (note === '') offenders.push(`${label}: empty verificationNote`)
          else if (source.retrieved === false && note.length < MIN_UNRETRIEVED_NOTE_LENGTH) {
            // An unretrieved citation has to say what was not checked, not merely that something
            // was not: the reader is being asked to judge how much weight the source can bear.
            offenders.push(
              `${label}: unretrieved, but verificationNote is only ${note.length} characters`,
            )
          }
        })
      }
    }
    expect(offenders, 'citations missing their verification state').toEqual([])
  })
})

// ------------------------------------------------------------------ Limits

describe('stated limits', () => {
  it('says what every capability, method and campaign does not establish', () => {
    // Nothing is offered without saying what it does not establish. A blank or token `limits`
    // leaves the person with a definition that looks like an assessment.
    const offenders: string[] = []
    const check = (limits: string, label: string) => {
      const text = limits.trim()
      if (text.length < MIN_LIMITS_LENGTH) offenders.push(`${label}: limits is ${text.length} characters`)
    }
    for (const pack of INSTALLED_PACKS) {
      for (const capability of pack.capabilities) check(capability.limits, `pack ${pack.id} capability ${capability.id}`)
      for (const method of pack.methods) check(method.limits, `pack ${pack.id} method ${method.id}`)
      for (const campaign of pack.campaigns) check(campaign.limits, `pack ${pack.id} campaign ${campaign.id}`)
    }
    expect(offenders, `limits shorter than ${MIN_LIMITS_LENGTH} characters`).toEqual([])
  })
})

// ------------------------------------------------------------------ Third parties

describe('other people in authored text', () => {
  it('never invites the person to write down who somebody is', () => {
    // Records about other people are kept by role. A prompt asking for a name, an email or a phone
    // number would collect a third party's details into somebody else's private journal, where
    // that third party cannot see, correct or remove them.
    const offenders: string[] = []
    const strings = personFacingStrings()
    expect(strings.length, 'there is person-facing text to check').toBeGreaterThan(0)

    for (const { at, field, text } of strings) {
      if (ASKS_FOR_IDENTITY.test(text)) offenders.push(`${at} ${field}: asks for a person's identity`)
      if (EMAIL_SHAPE.test(text)) offenders.push(`${at} ${field}: contains something email-shaped`)
      if (looksLikePhoneNumber(text)) offenders.push(`${at} ${field}: contains something phone-shaped`)
    }
    expect(offenders, 'authored text inviting a third party to be identified').toEqual([])
  })
})

// ------------------------------------------------------------------ Demo records

describe('demo records', () => {
  it('validates against the installed content', () => {
    // The demo is loaded through the ordinary import path. If it would not validate, the first
    // thing a new person sees is an error, or worse, records the app cannot explain.
    const result = validateUserData(createDemoUserData(), {
      knownCapabilityIds: registry.capabilityIds(),
      knownMethodIds: registry.methodIds(),
    })
    expect(result.ok ? [] : result.errors, 'demo validation errors').toEqual([])
  })

  it('refers only to installed campaign definitions and steps they contain', () => {
    const demo = createDemoUserData()
    expect(demo.campaigns.length, 'the demo shows at least one campaign').toBeGreaterThan(0)

    const offenders: string[] = []
    for (const campaign of demo.campaigns) {
      const definition = registry.campaign(campaign.definitionId)
      if (definition === undefined) {
        offenders.push(`demo campaign ${campaign.id}: definitionId "${campaign.definitionId}" is not installed`)
        continue
      }
      campaign.path.forEach((entry, i) => {
        if (registry.step(campaign.definitionId, entry.stepId) === undefined) {
          offenders.push(
            `demo campaign ${campaign.id} path[${i}]: step "${entry.stepId}" is not in ${campaign.definitionId}`,
          )
        }
      })
      if (campaign.currentStepId !== null && registry.step(campaign.definitionId, campaign.currentStepId) === undefined) {
        offenders.push(
          `demo campaign ${campaign.id}: currentStepId "${campaign.currentStepId}" is not in ${campaign.definitionId}`,
        )
      }
    }
    expect(offenders, 'demo records pointing at content that does not exist').toEqual([])
  })

  it('says on its face that it is fictional, and identifies nobody', () => {
    // The demo sits in the same interface as the person's own records. If it did not announce
    // itself as invented, somebody could take a demo attempt for a real one of their own.
    const demo = createDemoUserData()
    expect(demo.profile.displayName ?? '', 'demo profile.displayName').toMatch(/fiction/i)

    const offenders: string[] = []
    for (const item of demo.evidence) {
      const attribution = item.attribution
      if (attribution === undefined) continue
      if (EMAIL_SHAPE.test(attribution)) offenders.push(`demo evidence ${item.id}: attribution is email-shaped`)
      if (looksLikePhoneNumber(attribution)) offenders.push(`demo evidence ${item.id}: attribution is phone-shaped`)
    }
    expect(offenders, 'demo attributions that are not roles').toEqual([])
  })

  it('never lets a rehearsal count as a real attempt', () => {
    // The demo is the first thing a person reads about what this app records. If its rehearsal
    // were counted as workplace application, the demo itself would make the claim the product
    // exists to refuse.
    const demo = createDemoUserData()
    const capabilities = registry.capabilities()
    const derived = deriveCapabilityEvidence(demo, capabilities)

    // Expected counts, derived here from the demo's own activities, attempts and reviews: a real
    // attempt counts only when it happened in a described situation, was attempted, was reviewed,
    // and the cue actually arrived.
    const attempted = new Set(demo.attempts.map((a) => a.activityId))
    const reviewed = new Set(demo.reviews.map((r) => r.activityId))
    const situationIds = new Set(demo.situations.map((s) => s.id))
    const outcomeOf = new Map(demo.attempts.map((a) => [a.activityId, a.outcome]))
    const countsAsReal = (activityId: string): boolean => {
      const activity = demo.activities.find((a) => a.id === activityId)
      if (activity === undefined) return false
      return (
        activity.kind === 'real-attempt' &&
        situationIds.has(activity.situationId) &&
        attempted.has(activity.id) &&
        reviewed.has(activity.id) &&
        outcomeOf.get(activity.id) !== 'no-opportunity'
      )
    }

    const offenders: string[] = []
    for (const capability of capabilities) {
      const expected = demo.activities.filter(
        (a) => a.capabilityIds.includes(capability.id) && countsAsReal(a.id),
      ).length
      const actual = derived.find((d) => d.capabilityId === capability.id)?.counts.realAttempts
      if (actual !== expected) {
        offenders.push(`capability ${capability.id}: realAttempts ${String(actual)}, expected ${expected}`)
      }
    }
    expect(offenders, 'real-attempt counts that do not match the demo records').toEqual([])

    const countedAsReal = new Set(
      derived.flatMap((d) => d.refs.filter((r) => r.kind === 'real attempt').flatMap((r) => (r.activityId === undefined ? [] : [r.activityId]))),
    )
    const rehearsals = demo.activities.filter((a) => a.kind === 'rehearsal')
    expect(rehearsals.length, 'the demo contains a rehearsal to check').toBeGreaterThan(0)
    for (const activity of rehearsals) {
      expect([...countedAsReal], `demo rehearsal ${activity.id} counted as a real attempt`).not.toContain(activity.id)
    }

    // And the rehearsal is not simply ignored: it is recorded as a rehearsal, which is what makes
    // the check above a distinction rather than an omission.
    const rehearsalsCounted = derived.reduce((total, d) => total + d.counts.rehearsals, 0)
    expect(rehearsalsCounted, 'the demo rehearsal is recorded as a rehearsal').toBeGreaterThan(0)
  })
})

describe('a rehearsal script shows every line it authors', () => {
  it('never repeats the opening as the first reply', () => {
    // Regression: the panel seeds the transcript with `opening` and then takes replies from
    // `lines` starting at index 0. A pack that also put the opening in `lines[0]` would make the
    // counterpart say the same thing twice; a pack that did not would have been fine. Two packs
    // following opposite conventions is how an authored objection silently never gets shown.
    const offenders: string[] = []
    for (const pack of INSTALLED_PACKS) {
      for (const campaign of pack.campaigns) {
        for (const step of campaign.steps) {
          const script = step.template?.rehearsal
          if (!script) continue
          if (script.lines[0] === script.opening) {
            offenders.push(`${pack.id}/${campaign.id}/${step.id}: lines[0] repeats the opening`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('authors at least one script, so the check above is not vacuous', () => {
    const scripts = INSTALLED_PACKS.flatMap((pack) =>
      pack.campaigns.flatMap((campaign) => campaign.steps.flatMap((step) => (step.template?.rehearsal ? [step.template.rehearsal] : []))),
    )
    expect(scripts.length).toBeGreaterThan(0)
  })
})
