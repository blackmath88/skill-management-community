/**
 * Deterministic checks on provider output.
 *
 * These are not a content filter and they are not an attempt to detect every bad suggestion. They
 * refuse a small set of specific things the product must never show, whatever a provider returns:
 * a claim to have awarded progression, a statement that somebody is a personality type, an
 * assessment of competence, a declaration that a structural problem is now solved, and a request
 * for somebody's name or contact details.
 *
 * A refused proposal is recorded as invalid rather than silently dropped, so the behaviour is
 * visible in the interface and in the tests.
 */

export interface GuardViolation {
  rule: string
  /** Shown to the user next to the refused suggestion. */
  reason: string
}

interface Rule {
  id: string
  pattern: RegExp
  reason: string
}

const RULES: readonly Rule[] = [
  {
    id: 'awards-progression',
    pattern: /\b(award(ed|ing)?|grant(ed|ing)?|earn(ed|s)?|give[ns]?\syou)\b[^.]{0,40}\b(xp|experience points?|points?|a level|level \d|a badge|credit)\b/i,
    reason: 'A suggestion cannot award or promise practice experience. Only your own recorded activities do that.',
  },
  {
    id: 'claims-progression-authority',
    pattern: /\b(you (have )?(now )?(reached|unlocked|achieved)|i(’|')?ve (marked|recorded|logged|saved))\b/i,
    reason: 'A suggestion cannot record anything or mark a milestone. Nothing is saved until you save it.',
  },
  {
    id: 'personality-type',
    pattern: /\byou(’|')?re? (an?|the) \b(introvert|extrovert|extravert|enfp|intj|type [a-z]|\w+ personality)\b|\byour personality type\b|\byou are a natural\b/i,
    reason: 'This app does not diagnose personality. A suggestion may not describe who you are.',
  },
  {
    id: 'competence-assessment',
    pattern: /\byour (competence|competency|skill level|ability level|proficiency|maturity level)\b|\byou (are|aren(’|')?t) (competent|skilled|proficient) (at|in)\b|\bscore (of|is) \d+\s*\/\s*\d+\b/i,
    reason: 'This app does not assess competence. A suggestion may not rate you.',
  },
  {
    id: 'declares-structural-problem-solved',
    pattern: /\b(this|the) (structural|organisational|organizational|systemic) (problem|issue|barrier)[^.]{0,40}\b(is|has been) (now )?(solved|resolved|fixed|addressed)\b/i,
    reason: 'A suggestion cannot declare a structural problem solved. Only what actually changed in your organisation can show that.',
  },
  {
    id: 'requests-identifying-details',
    pattern: /\b(what(’|')?s|what is|give me|tell me|provide) (their|his|her|the colleague(’|')?s|the person(’|')?s) (full )?(name|surname|email|e-mail|phone|number|address)\b/i,
    reason: 'A suggestion may not ask for somebody’s name or contact details. Roles are enough.',
  },
  {
    id: 'claims-real-application',
    pattern: /\b(that|this) (rehearsal|practice|simulation)[^.]{0,30}\bcounts as\b[^.]{0,30}\b(real|actual|workplace|application)\b/i,
    reason: 'A rehearsal is never recorded as workplace application, whatever a suggestion says about it.',
  },
]

/** Longest a single proposal may be. A wall of text is not a reviewable proposal. */
export const MAX_PROPOSAL_CHARS = 1_200
/** Most proposals one response may offer, so the user is choosing rather than wading. */
export const MAX_PROPOSALS_PER_RESPONSE = 5

export function checkText(text: string): GuardViolation[] {
  const violations: GuardViolation[] = []
  for (const rule of RULES) {
    if (rule.pattern.test(text)) violations.push({ rule: rule.id, reason: rule.reason })
  }
  return violations
}

export const GUARD_RULE_IDS: readonly string[] = RULES.map((rule) => rule.id)
