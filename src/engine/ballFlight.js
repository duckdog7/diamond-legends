/**
 * ballFlight.js
 * Maps pitch type × contact zone → field zone.
 * Applies token effects (pull shift, oppo push, gap finder, infield in).
 * GDD §5.5, §5.8
 */

import matrix from '../data/ballFlightMatrix.json'
import { CONTACT } from './contactResolver'

// ─── Field zones ──────────────────────────────────────────────────────────────

export const FIELD_ZONE = {
  INFIELD_LEFT:        'infield_left',
  INFIELD_MIDDLE:      'infield_middle',
  INFIELD_RIGHT:       'infield_right',
  INFIELD_LEFT_LINE:   'infield_left_line',
  INFIELD_HARD_GROUND: 'infield_hard_ground',
  SHALLOW_LF:          'shallow_lf',
  SHALLOW_CF:          'shallow_cf',
  SHALLOW_RF:          'shallow_rf',
  SHALLOW_CF_RF:       'shallow_cf_rf',
  DEEP_LF_LCF:         'deep_lf_lcf',
  DEEP_CF_RCF:         'deep_cf_rcf',
  DEEP_RF:             'deep_rf',
}

// Zone adjacency for token effects (pull/oppo shift)
// Each zone has a pull-side and oppo-side neighbor
const ZONE_SHIFT = {
  [FIELD_ZONE.INFIELD_RIGHT]:   { pull: FIELD_ZONE.INFIELD_MIDDLE, oppo: FIELD_ZONE.INFIELD_RIGHT },
  [FIELD_ZONE.INFIELD_MIDDLE]:  { pull: FIELD_ZONE.INFIELD_LEFT,   oppo: FIELD_ZONE.INFIELD_RIGHT },
  [FIELD_ZONE.INFIELD_LEFT]:    { pull: FIELD_ZONE.INFIELD_LEFT,   oppo: FIELD_ZONE.INFIELD_MIDDLE },
  [FIELD_ZONE.INFIELD_LEFT_LINE]: { pull: FIELD_ZONE.INFIELD_LEFT_LINE, oppo: FIELD_ZONE.INFIELD_LEFT },
  [FIELD_ZONE.INFIELD_HARD_GROUND]: { pull: FIELD_ZONE.INFIELD_LEFT, oppo: FIELD_ZONE.INFIELD_RIGHT },
  [FIELD_ZONE.SHALLOW_RF]:      { pull: FIELD_ZONE.SHALLOW_CF,    oppo: FIELD_ZONE.SHALLOW_RF },
  [FIELD_ZONE.SHALLOW_CF]:      { pull: FIELD_ZONE.SHALLOW_LF,    oppo: FIELD_ZONE.SHALLOW_RF },
  [FIELD_ZONE.SHALLOW_LF]:      { pull: FIELD_ZONE.SHALLOW_LF,    oppo: FIELD_ZONE.SHALLOW_CF },
  [FIELD_ZONE.SHALLOW_CF_RF]:   { pull: FIELD_ZONE.SHALLOW_CF,    oppo: FIELD_ZONE.SHALLOW_RF },
  [FIELD_ZONE.DEEP_CF_RCF]:     { pull: FIELD_ZONE.DEEP_LF_LCF,  oppo: FIELD_ZONE.DEEP_CF_RCF },
  [FIELD_ZONE.DEEP_LF_LCF]:     { pull: FIELD_ZONE.DEEP_LF_LCF,  oppo: FIELD_ZONE.DEEP_CF_RCF },
  [FIELD_ZONE.DEEP_RF]:         { pull: FIELD_ZONE.DEEP_CF_RCF,  oppo: FIELD_ZONE.DEEP_RF },
}

const GAP_ZONES = [FIELD_ZONE.DEEP_LF_LCF, FIELD_ZONE.DEEP_CF_RCF]
const INFIELD_ZONES = new Set([
  FIELD_ZONE.INFIELD_LEFT, FIELD_ZONE.INFIELD_MIDDLE, FIELD_ZONE.INFIELD_RIGHT,
  FIELD_ZONE.INFIELD_LEFT_LINE, FIELD_ZONE.INFIELD_HARD_GROUND,
])

/**
 * Determine the contact zone bucket from the thrown zone.
 * Pitch zones map to contact zones: top row = high, mid row = mid, bottom row = low.
 * @param {string} pitchZone  e.g. 'TL', 'MC', 'BR'
 * @returns {'high'|'mid'|'low'}
 */
function contactBucket(pitchZone) {
  if (!pitchZone) return 'mid'
  const row = pitchZone[0]
  if (row === 'T') return 'high'
  if (row === 'M') return 'mid'
  return 'low'
}

/**
 * Resolve ball flight: pitch type + contact zone → field zone.
 * @param {object} params
 * @param {string} params.pitchType    — e.g. 'FB'
 * @param {string} params.thrownZone   — e.g. 'TC'
 * @param {string} params.contact      — CONTACT tier (must not be NONE)
 * @param {object} params.tokenEffects — { pullShift, oppoPush, gapFinder, infieldIn }
 * @returns {{ fieldZone: string, primaryFielder: string, baseDifficulty: string, extraBaseRisk: string, armMatters: boolean, doublePlayEligible: boolean }}
 */
export function resolveBallFlight({ pitchType, thrownZone, contact, typeCorrect = false, tokenEffects = {} }) {
  const typeMatrix = matrix[pitchType]
  if (!typeMatrix) return fallbackFlight()

  // Knuckleball: random
  if (pitchType === 'KN') {
    const knData = typeMatrix.any
    const pool = knData.zonePool
    const diffPool = knData.difficultyPool
    const fieldZone = pool[Math.floor(Math.random() * pool.length)]
    const zoneMeta = matrix._fieldZoneMap[fieldZone] ?? {}
    const baseDifficulty = diffPool[Math.floor(Math.random() * diffPool.length)]
    return {
      fieldZone,
      primaryFielder: (zoneMeta.fielders ?? ['CF'])[0],
      baseDifficulty,
      extraBaseRisk: baseDifficulty === 'difficult' || baseDifficulty === 'exceptional' ? 'high' : 'low',
      armMatters: zoneMeta.armMatters ?? false,
      doublePlayEligible: false,
    }
  }

  // Single-bucket pitch types (SL, SK, CF)
  const bucket = typeMatrix.any ? 'any' : contactBucket(thrownZone)
  const entry = typeMatrix[bucket] ?? typeMatrix.any ?? typeMatrix.mid ?? fallbackFlight()

  let fieldZone = entry.fieldZone

  // ── Apply token effects ────────────────────────────────────────────────────
  if (tokenEffects.infieldIn && !INFIELD_ZONES.has(fieldZone)) {
    fieldZone = FIELD_ZONE.INFIELD_HARD_GROUND
  } else if (tokenEffects.gapFinder && !INFIELD_ZONES.has(fieldZone)) {
    // Force nearest gap — pick random gap zone
    fieldZone = GAP_ZONES[Math.floor(Math.random() * GAP_ZONES.length)]
  } else if (tokenEffects.pullShift) {
    fieldZone = ZONE_SHIFT[fieldZone]?.pull ?? fieldZone
  } else if (tokenEffects.oppoPush) {
    fieldZone = ZONE_SHIFT[fieldZone]?.oppo ?? fieldZone
  }

  // ── Contact quality upgrades difficulty ───────────────────────────────────
  let baseDifficulty = entry.baseDifficulty ?? 'moderate'
  if (contact === CONTACT.BARREL) {
    baseDifficulty = upgradeDifficulty(baseDifficulty)
  } else if (contact === CONTACT.WEAK) {
    baseDifficulty = downgradeDifficulty(baseDifficulty)
  }

  const zoneMeta = matrix._fieldZoneMap[fieldZone] ?? {}

  let extraBaseRisk = entry.extraBaseRisk ?? 'low'
  if (typeCorrect) {
    if (extraBaseRisk === 'none') extraBaseRisk = 'low'
    else if (extraBaseRisk === 'low') extraBaseRisk = 'high'
    // 'high' stays 'high'
  }

  return {
    fieldZone,
    primaryFielder: (Array.isArray(entry.primaryFielder) ? entry.primaryFielder[0] : entry.primaryFielder) ?? (zoneMeta.fielders ?? ['CF'])[0],
    baseDifficulty,
    extraBaseRisk,
    armMatters: entry.armMatters ?? zoneMeta.armMatters ?? false,
    doublePlayEligible: entry.doublePlayEligible ?? false,
    doublePlayBonus: entry.doublePlayBonus ?? 0,
  }
}

function upgradeDifficulty(d) {
  const order = ['routine', 'moderate', 'difficult', 'exceptional']
  const idx = order.indexOf(d)
  return order[Math.min(order.length - 1, idx + 1)]
}

function downgradeDifficulty(d) {
  const order = ['routine', 'moderate', 'difficult', 'exceptional']
  const idx = order.indexOf(d)
  return order[Math.max(0, idx - 1)]
}

function fallbackFlight() {
  return {
    fieldZone: FIELD_ZONE.INFIELD_MIDDLE,
    primaryFielder: 'SS',
    baseDifficulty: 'moderate',
    extraBaseRisk: 'low',
    armMatters: true,
    doublePlayEligible: false,
    doublePlayBonus: 0,
  }
}
