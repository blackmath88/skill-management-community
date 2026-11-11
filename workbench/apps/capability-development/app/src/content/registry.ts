import type { ChallengeKind, Id } from '~/domain/types'
import type {
  CampaignDefinition,
  CampaignStep,
  CapabilityDefinition,
  CapabilityGroupDefinition,
  ContentPack,
  MethodDefinition,
} from './types'

/**
 * Lookup over the installed packs. The application layer depends on this interface, never on a
 * global catalogue, so a different domain pack needs no code change anywhere else.
 *
 * Replaces Leader Me's direct `import { SKILLS }` coupling in its state provider.
 */
export interface ContentRegistry {
  readonly packs: readonly ContentPack[]
  capability(id: Id): CapabilityDefinition | undefined
  capabilities(): readonly CapabilityDefinition[]
  capabilityGroups(): readonly CapabilityGroupDefinition[]
  method(id: Id): MethodDefinition | undefined
  methods(): readonly MethodDefinition[]
  campaign(id: Id): CampaignDefinition | undefined
  campaigns(): readonly CampaignDefinition[]
  /** The step as authored in that campaign definition. */
  step(campaignId: Id, stepId: Id): CampaignStep | undefined
  campaignsForChallenge(challenge: ChallengeKind): readonly CampaignDefinition[]
  capabilityIds(): readonly Id[]
  methodIds(): readonly Id[]
  /** Which pack a capability belongs to, for display grouping. */
  packOfCapability(id: Id): ContentPack | undefined
}

export class DuplicateContentIdError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DuplicateContentIdError'
  }
}

/**
 * Build a registry. Duplicate ids across packs are a content authoring bug, not something to
 * resolve silently: a record referring to an ambiguous capability could not be explained.
 */
export function createRegistry(packs: readonly ContentPack[]): ContentRegistry {
  const capabilities = new Map<Id, CapabilityDefinition>()
  const capabilityPack = new Map<Id, ContentPack>()
  const groups = new Map<string, CapabilityGroupDefinition>()
  const methods = new Map<Id, MethodDefinition>()
  const campaigns = new Map<Id, CampaignDefinition>()

  const claim = <T>(map: Map<string, T>, id: string, value: T, what: string) => {
    if (map.has(id)) throw new DuplicateContentIdError(`Duplicate ${what} id "${id}" across content packs.`)
    map.set(id, value)
  }

  const packIds = new Set<Id>()
  for (const pack of packs) {
    if (packIds.has(pack.id)) throw new DuplicateContentIdError(`Duplicate content pack id "${pack.id}".`)
    packIds.add(pack.id)
    // Group definitions are display metadata and two packs may legitimately use the same group.
    // The first pack's wording wins, deterministically: silently taking the last one would make
    // the heading a person sees depend on pack load order.
    for (const group of pack.capabilityGroups) if (!groups.has(group.id)) groups.set(group.id, group)
    for (const capability of pack.capabilities) {
      claim(capabilities, capability.id, capability, 'capability')
      capabilityPack.set(capability.id, pack)
    }
    for (const method of pack.methods) claim(methods, method.id, method, 'method')
    for (const campaign of pack.campaigns) claim(campaigns, campaign.id, campaign, 'campaign')
  }

  const stepIndex = new Map<string, CampaignStep>()
  for (const campaign of campaigns.values()) {
    for (const step of campaign.steps) stepIndex.set(`${campaign.id}::${step.id}`, step)
  }

  const allCapabilities = [...capabilities.values()]
  const allMethods = [...methods.values()]
  const allCampaigns = [...campaigns.values()]

  return {
    packs,
    capability: (id) => capabilities.get(id),
    capabilities: () => allCapabilities,
    capabilityGroups: () => [...groups.values()],
    method: (id) => methods.get(id),
    methods: () => allMethods,
    campaign: (id) => campaigns.get(id),
    campaigns: () => allCampaigns,
    step: (campaignId, stepId) => stepIndex.get(`${campaignId}::${stepId}`),
    campaignsForChallenge: (challenge: ChallengeKind) =>
      allCampaigns.filter((c) => c.challenge === challenge),
    capabilityIds: () => allCapabilities.map((c) => c.id),
    methodIds: () => allMethods.map((m) => m.id),
    packOfCapability: (id) => capabilityPack.get(id),
  }
}
