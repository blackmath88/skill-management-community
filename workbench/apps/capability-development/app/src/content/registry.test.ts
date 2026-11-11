/**
 * The lookup layer every stored record depends on.
 *
 * A person's own records point at a capability, a method and a campaign step by id. If a lookup
 * throws on an id the installed content no longer has, the page showing their history breaks
 * rather than saying the definition is gone. If a step id resolves inside a campaign that never
 * authored it, the path they actually walked is quietly rewritten into one they never took.
 */
import { describe, expect, it } from 'vitest'
import { COLLABORATION_PACK, INSTALLED_PACKS, LEADERSHIP_PACK } from '~/content/index'
import { createRegistry, DuplicateContentIdError } from '~/content/registry'
import type {
  CampaignDefinition,
  CapabilityDefinition,
  CapabilityGroupDefinition,
  ContentPack,
  MethodDefinition,
} from '~/content/types'

// ------------------------------------------------------------------ Helpers

/** Fail loudly rather than silently skipping a property when the fixture content is empty. */
function requireFirst<T>(items: readonly T[], what: string): T {
  const item = items[0]
  if (item === undefined) throw new Error(`Test premise: expected at least one ${what}.`)
  return item
}

// Synthetic packs, so the duplicate-id and group-precedence properties can be stated without
// touching authored content. They are deliberately minimal: only the lookup layer is under test.

function syntheticCapability(id: string): CapabilityDefinition {
  return {
    id,
    title: `Synthetic capability ${id}`,
    group: 'learning',
    observable: 'Something a person in the room could see happening.',
    nextExperiment: 'Try it once and write down what happened.',
    limits: 'A synthetic definition used only to check the lookup layer.',
  }
}

function syntheticMethod(id: string): MethodDefinition {
  return {
    id,
    title: `Synthetic method ${id}`,
    summary: 'A synthetic lens.',
    explanation: 'A synthetic lens used only to check the lookup layer.',
    whenToUse: [],
    whenItMayNotFit: [],
    limits: 'Establishes nothing about anybody.',
    sources: [],
    prompts: [],
    example: { title: 'Fictional example', narrative: 'Invented for a test.' },
    capabilityIds: [],
    fitsChallenges: [],
  }
}

function syntheticCampaign(id: string): CampaignDefinition {
  return {
    id,
    version: 1,
    title: `Synthetic campaign ${id}`,
    purpose: 'Check the lookup layer.',
    limits: 'Assesses nobody and establishes nothing.',
    challenge: 'other',
    situationPrompt: 'A fictional situation, invented for a test.',
    firstStepId: 'only-step',
    steps: [
      {
        id: 'only-step',
        title: 'The only step',
        kind: 'close',
        intent: 'Exist, so a step lookup has something to find.',
        prompt: 'Nothing is asked of anybody here.',
        choices: [{ id: 'only-choice', label: 'Close it', nextStepId: null, route: 'personal-practice' }],
      },
    ],
  }
}

function syntheticPack(id: string, parts: Partial<ContentPack> = {}): ContentPack {
  return {
    id,
    version: 1,
    title: `Synthetic pack ${id}`,
    domainLabel: 'Synthetic',
    summary: 'A synthetic pack used only to check the lookup layer.',
    note: 'Not authored content. Nothing here is offered to a person.',
    capabilityGroups: [],
    capabilities: [],
    methods: [],
    campaigns: [],
    ...parts,
  }
}

const GROUP_A: CapabilityGroupDefinition = {
  id: 'direction',
  title: 'Direction, as the first pack words it',
  summary: 'The wording a person should see, because this pack is installed first.',
}

const GROUP_B: CapabilityGroupDefinition = {
  id: 'direction',
  title: 'Direction, as the second pack words it',
  summary: 'The wording that must not win, because load order would then decide a heading.',
}

// ------------------------------------------------------------------ Tests

describe('registry lookups over the installed packs', () => {
  it('resolves a capability, a method and a campaign by id', () => {
    const registry = createRegistry(INSTALLED_PACKS)
    const capability = requireFirst(LEADERSHIP_PACK.capabilities, 'leadership capability')
    const method = requireFirst(LEADERSHIP_PACK.methods, 'leadership method')
    const campaign = requireFirst(COLLABORATION_PACK.campaigns, 'collaboration campaign')

    expect(registry.capability(capability.id), `capability ${capability.id}`).toBe(capability)
    expect(registry.method(method.id), `method ${method.id}`).toBe(method)
    expect(registry.campaign(campaign.id), `campaign ${campaign.id}`).toBe(campaign)
  })

  it('returns undefined rather than throwing for an id nothing defines', () => {
    // A record may outlive the content it referred to. The interface must be able to say "gone"
    // without taking down the page the person is reading.
    const registry = createRegistry(INSTALLED_PACKS)
    expect(() => registry.capability('no-such-capability')).not.toThrow()
    expect(registry.capability('no-such-capability')).toBeUndefined()
    expect(registry.method('no-such-method')).toBeUndefined()
    expect(registry.campaign('no-such-campaign')).toBeUndefined()
    expect(registry.step('no-such-campaign', 'no-such-step')).toBeUndefined()
    expect(registry.packOfCapability('no-such-capability')).toBeUndefined()
  })

  it('scopes a step to its own campaign', () => {
    // Steps are per campaign. Resolving one campaign's step inside another would let a stored
    // path point at a step that campaign never offered, and the record would describe a route
    // the person did not take.
    const registry = createRegistry(INSTALLED_PACKS)
    const own = requireFirst(LEADERSHIP_PACK.campaigns, 'leadership campaign')
    const other = requireFirst(COLLABORATION_PACK.campaigns, 'collaboration campaign')
    const ownStep = requireFirst(own.steps, `step of campaign ${own.id}`)
    const otherStep = requireFirst(other.steps, `step of campaign ${other.id}`)

    expect(registry.step(own.id, ownStep.id), `${own.id}/${ownStep.id}`).toBe(ownStep)
    expect(registry.step(other.id, otherStep.id), `${other.id}/${otherStep.id}`).toBe(otherStep)
    expect(registry.step(own.id, otherStep.id), `${own.id} must not resolve ${otherStep.id}`).toBeUndefined()
    expect(registry.step(other.id, ownStep.id), `${other.id} must not resolve ${ownStep.id}`).toBeUndefined()
  })

  it('refuses a duplicate capability, method, campaign or pack id across packs', () => {
    // A duplicate id is an authoring bug, not something to resolve silently: a record pointing at
    // an ambiguous capability could no longer be explained to the person who created it.
    const duplicateCapability = [
      syntheticPack('pack-one', { capabilities: [syntheticCapability('shared-capability')] }),
      syntheticPack('pack-two', { capabilities: [syntheticCapability('shared-capability')] }),
    ]
    expect(() => createRegistry(duplicateCapability)).toThrow(DuplicateContentIdError)
    expect(() => createRegistry(duplicateCapability)).toThrow(/shared-capability/)

    const duplicateMethod = [
      syntheticPack('pack-one', { methods: [syntheticMethod('shared-method')] }),
      syntheticPack('pack-two', { methods: [syntheticMethod('shared-method')] }),
    ]
    expect(() => createRegistry(duplicateMethod)).toThrow(DuplicateContentIdError)
    expect(() => createRegistry(duplicateMethod)).toThrow(/shared-method/)

    const duplicateCampaign = [
      syntheticPack('pack-one', { campaigns: [syntheticCampaign('shared-campaign')] }),
      syntheticPack('pack-two', { campaigns: [syntheticCampaign('shared-campaign')] }),
    ]
    expect(() => createRegistry(duplicateCampaign)).toThrow(DuplicateContentIdError)
    expect(() => createRegistry(duplicateCampaign)).toThrow(/shared-campaign/)

    const duplicatePack = [syntheticPack('same-pack'), syntheticPack('same-pack')]
    expect(() => createRegistry(duplicatePack)).toThrow(DuplicateContentIdError)
    expect(() => createRegistry(duplicatePack)).toThrow(/same-pack/)
  })

  it('accepts the same capability group in two packs and keeps the first pack’s wording', () => {
    // Group definitions are display metadata, so two packs may legitimately use the same group.
    // Taking the last one would make the heading a person reads depend on pack load order.
    const first = syntheticPack('pack-one', { capabilityGroups: [GROUP_A] })
    const second = syntheticPack('pack-two', { capabilityGroups: [GROUP_B] })

    const forwards = createRegistry([first, second]).capabilityGroups()
    expect(forwards.filter((g) => g.id === 'direction'), 'one definition per group id').toHaveLength(1)
    expect(forwards.find((g) => g.id === 'direction')).toEqual(GROUP_A)

    // Reversed, the other pack is first, which is what makes "first wins" a real rule rather
    // than an accident of which object happens to be compared.
    const backwards = createRegistry([second, first]).capabilityGroups()
    expect(backwards.find((g) => g.id === 'direction')).toEqual(GROUP_B)
  })

  it('builds the same group list every time it is built', () => {
    const builds = [1, 2, 3, 4, 5].map(() => createRegistry(INSTALLED_PACKS).capabilityGroups())
    const expected = JSON.stringify(requireFirst(builds, 'registry build'))
    builds.forEach((groups, index) => {
      expect(JSON.stringify(groups), `build ${index + 1} differs from build 1`).toBe(expected)
    })

    // The installed packs share at least one group id with different wording, which is what the
    // precedence rule is for. If that stops being true, the rule above is no longer exercised
    // against real content and this test says so.
    const leadershipGroupIds = new Set(LEADERSHIP_PACK.capabilityGroups.map((g) => g.id))
    const shared = COLLABORATION_PACK.capabilityGroups.filter((g) => leadershipGroupIds.has(g.id))
    expect(shared.length, 'installed packs share a capability group id').toBeGreaterThan(0)

    const registry = createRegistry(INSTALLED_PACKS)
    for (const group of shared) {
      const authored = LEADERSHIP_PACK.capabilityGroups.find((g) => g.id === group.id)
      expect(registry.capabilityGroups().find((g) => g.id === group.id), `group ${group.id}`).toEqual(authored)
    }
  })

  it('lists every installed capability and method id', () => {
    const registry = createRegistry(INSTALLED_PACKS)
    const authoredCapabilityIds = INSTALLED_PACKS.flatMap((p) => p.capabilities.map((c) => c.id))
    const authoredMethodIds = INSTALLED_PACKS.flatMap((p) => p.methods.map((m) => m.id))

    expect([...registry.capabilityIds()].sort()).toEqual([...authoredCapabilityIds].sort())
    expect([...registry.methodIds()].sort()).toEqual([...authoredMethodIds].sort())
  })

  it('maps a capability back to the pack that defines it', () => {
    // The interface shows a person which domain a capability came from. Attributing it to the
    // wrong pack would misdescribe where the definition they are reading comes from.
    const registry = createRegistry(INSTALLED_PACKS)
    for (const pack of INSTALLED_PACKS) {
      for (const capability of pack.capabilities) {
        expect(registry.packOfCapability(capability.id)?.id, `capability ${capability.id}`).toBe(pack.id)
      }
    }
  })

  it('returns only the campaigns carrying a challenge', () => {
    const registry = createRegistry(INSTALLED_PACKS)
    const authored = INSTALLED_PACKS.flatMap((p) => p.campaigns)
    const challenges = [...new Set(authored.map((c) => c.challenge))]
    expect(challenges.length, 'at least one authored challenge').toBeGreaterThan(0)

    for (const challenge of challenges) {
      const returned = registry.campaignsForChallenge(challenge)
      const expectedIds = authored.filter((c) => c.challenge === challenge).map((c) => c.id)
      expect([...returned].map((c) => c.id).sort(), `challenge ${challenge}`).toEqual([...expectedIds].sort())
      for (const campaign of returned) {
        expect(campaign.challenge, `campaign ${campaign.id} returned for ${challenge}`).toBe(challenge)
      }
    }

    const unused = (['priorities', 'ownership', 'adoption', 'handover', 'other'] as const).filter(
      (c) => !challenges.includes(c),
    )
    for (const challenge of unused) {
      expect(registry.campaignsForChallenge(challenge), `challenge ${challenge}`).toHaveLength(0)
    }
  })
})
