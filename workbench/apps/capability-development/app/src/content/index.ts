/**
 * The installed content.
 *
 * Two packs, with deliberately different mechanisms. Leadership frames most work as something an
 * individual can influence by speaking differently; the collaboration pack's handover problem is
 * about a shared routine and the quality the receiving side gets. Keeping both installed is the
 * cheapest available check that nothing in the code assumes leadership is the only domain.
 */
import { createRegistry, type ContentRegistry } from './registry'
import { LEADERSHIP_PACK } from './leadership/pack'
import { COLLABORATION_PACK } from './collaboration/pack'
import type { ContentPack } from './types'

export const INSTALLED_PACKS: readonly ContentPack[] = [LEADERSHIP_PACK, COLLABORATION_PACK]

export function createContentRegistry(packs: readonly ContentPack[] = INSTALLED_PACKS): ContentRegistry {
  return createRegistry(packs)
}

export { LEADERSHIP_PACK, COLLABORATION_PACK }
export type { ContentRegistry }
