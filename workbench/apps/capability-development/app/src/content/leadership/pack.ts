/**
 * The leadership content pack: the first practice domain.
 *
 * Leadership is first because the predecessor application's content was leadership content, and
 * because the owner's own practice is there. It is not a claim that leadership is the most
 * important domain, and the collaboration pack exists specifically to check that nothing in the
 * code assumes leadership is the only one.
 */
import type { ContentPack } from '~/content/types'
import { LEADERSHIP_CAPABILITIES, LEADERSHIP_GROUPS } from './capabilities'
import { LEADERSHIP_METHODS, METHOD_NOTE } from './methods'
import { NEXT_DECISION_CAMPAIGN } from './campaign-next-decision'

export const LEADERSHIP_PACK: ContentPack = {
  id: 'leadership-v1',
  version: 1,
  title: 'Leadership',
  domainLabel: 'Leadership',
  summary:
    'Working with direction, coordination, disagreement and learning in situations where you may not be the one who decides.',
  note: `${METHOD_NOTE} None of the sources behind this pack was retrieved while it was written: no publisher host is reachable from the build environment, so every citation is marked unverified and shows why.`,
  capabilityGroups: LEADERSHIP_GROUPS,
  capabilities: LEADERSHIP_CAPABILITIES,
  methods: LEADERSHIP_METHODS,
  campaigns: [NEXT_DECISION_CAMPAIGN],
}
