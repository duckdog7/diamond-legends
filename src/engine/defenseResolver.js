/**
 * defenseResolver.js
 * Probability gradient → out / hit / error.
 * Arm strength determines runner advancement on successful plays.
 * GDD §5.6, §5.7
 */

import matrix from '../data/ballFlightMatrix.json'
import { CONTACT } from './contactResolver'
import { FIELD_ZONE } from './ballFlight'

const SUCCESS_PROBS = matrix._defensiveSuccessProbabilities

// ─── Outcome types ────────────────────────────────────────────────────────────

export const OUTCOME = {
  OUT:          'out',
  SINGLE:       'single',
  DOUBLE:       'double',
  TRIPLE:       'triple',
  HOME_RUN:     'home_run',
  ERROR:        'error',
  DOUBLE_PLAY:  'double_play',
  STRIKEOUT:    'strikeout',
  WALK:         'walk',
}

// Deep zones can produce triples/HR; infield zones can't
const DEEP_ZONES = new Set([FIELD_ZONE.DEEP_LF_LCF, FIELD_ZONE.DEEP_CF_RCF, FIELD_ZONE.DEEP_RF])
const SHALLOW_OF_ZONES = new Set([FIELD_ZONE.SHALLOW_LF, FIELD_ZONE.SHALLOW_CF, FIELD_ZONE.SHALLOW_RF, FIELD_ZONE.SHALLOW_CF_RF])

/**
 * Resolve a fielded ball → game outcome.
 * @param {object} params
 * @param {object} params.fielderCard    — the card of the primary fielder
 * @param {string} params.fieldZone      — from ballFlight
 * @param {string} params.baseDifficulty — routine/moderate/difficult/exceptional
 * @param {string} params.contact        — CONTACT tier
 * @param {string} params.extraBaseRisk  — 'none'|'low'|'high'
 * @param {boolean} params.armMatters    — whether arm score affects runner hold
 * @param {boolean} params.doublePlayEligible
 * @param {number}  params.doublePlayBonus
 * @param {boolean} params.runnersOn     — true if any runner is on base
 * @returns {{ outcome: string, bases: number, error: boolean, runnerAdvance: boolean }}
 */
export function resolveDefense({
  fielderCard,
  fieldZone,
  baseDifficulty,
  contact,
  extraBaseRisk = 'low',
  armMatters = false,
  doublePlayEligible = false,
  doublePlayBonus = 0,
  runnersOn = false,
}) {
  const gloveTool = fielderCard?.tools?.fielding ?? 60
  const armTool   = fielderCard?.tools?.arm ?? 60

  // ── 1. Success probability ─────────────────────────────────────────────────
  const probRow = SUCCESS_PROBS[baseDifficulty] ?? SUCCESS_PROBS.moderate
  const successProb = interpolateProb(gloveTool, probRow)
  const roll = Math.random()

  // ── 2. On a miss: determine hit type ──────────────────────────────────────
  if (roll > successProb) {
    return resolveHit(contact, fieldZone, extraBaseRisk, armTool, armMatters)
  }

  // ── 3. Successful play — check for double play ─────────────────────────────
  if (doublePlayEligible && runnersOn) {
    const dpProb = 0.35 + doublePlayBonus
    if (Math.random() < dpProb) {
      return { outcome: OUTCOME.DOUBLE_PLAY, bases: 0, error: false, runnerAdvance: false, outs: 2 }
    }
  }

  // ── 4. Out — arm score determines if runner advances ──────────────────────
  let runnerAdvance = false
  if (armMatters && runnersOn) {
    // High arm: 80%+ chance to hold runner; low arm: 40%
    const holdProb = 0.40 + (armTool / 100) * 0.45
    runnerAdvance = Math.random() > holdProb
  }

  return { outcome: OUTCOME.OUT, bases: 0, error: false, runnerAdvance, outs: 1 }
}

/**
 * Interpolate success probability from glove score.
 * @param {number} gloveTool  0–100
 * @param {{ glove80plus, glove60, glove40 }} probRow
 * @returns {number} 0–1
 */
function interpolateProb(gloveTool, probRow) {
  if (gloveTool >= 80) return probRow.glove80plus
  if (gloveTool >= 60) {
    const t = (gloveTool - 60) / 20
    return probRow.glove60 + t * (probRow.glove80plus - probRow.glove60)
  }
  if (gloveTool >= 40) {
    const t = (gloveTool - 40) / 20
    return probRow.glove40 + t * (probRow.glove60 - probRow.glove40)
  }
  return probRow.glove40 * (gloveTool / 40)
}

/**
 * Determine hit type when defense fails.
 */
function resolveHit(contact, fieldZone, extraBaseRisk, armTool, armMatters) {
  // Home run: barrel contact + deep zone
  if (contact === CONTACT.BARREL && DEEP_ZONES.has(fieldZone)) {
    if (Math.random() < 0.55) {
      return { outcome: OUTCOME.HOME_RUN, bases: 4, error: false, runnerAdvance: true, outs: 0 }
    }
  }

  // Barrel + shallow OF or line drive: strong extra base chance
  if (contact === CONTACT.BARREL || contact === CONTACT.HARD) {
    if (DEEP_ZONES.has(fieldZone)) {
      // Low arm = runner goes extra base
      const extraBase = extraBaseRisk === 'high' || (armMatters && armTool < 65)
      return {
        outcome: extraBase ? OUTCOME.DOUBLE : OUTCOME.SINGLE,
        bases: extraBase ? 2 : 1,
        error: false,
        runnerAdvance: true,
        outs: 0,
      }
    }
    if (SHALLOW_OF_ZONES.has(fieldZone)) {
      return { outcome: OUTCOME.SINGLE, bases: 1, error: false, runnerAdvance: armTool < 60, outs: 0 }
    }
    // Hard infield hit
    return { outcome: OUTCOME.SINGLE, bases: 1, error: false, runnerAdvance: false, outs: 0 }
  }

  // Solid contact
  if (contact === CONTACT.SOLID) {
    if (DEEP_ZONES.has(fieldZone)) {
      return { outcome: OUTCOME.DOUBLE, bases: 2, error: false, runnerAdvance: true, outs: 0 }
    }
    if (SHALLOW_OF_ZONES.has(fieldZone)) {
      return { outcome: OUTCOME.SINGLE, bases: 1, error: false, runnerAdvance: false, outs: 0 }
    }
    return { outcome: OUTCOME.SINGLE, bases: 1, error: false, runnerAdvance: false, outs: 0 }
  }

  // Weak contact: mostly errors or bleeders
  const isError = Math.random() < 0.3
  return {
    outcome: isError ? OUTCOME.ERROR : OUTCOME.SINGLE,
    bases: 1,
    error: isError,
    runnerAdvance: false,
    outs: 0,
  }
}

/**
 * Find the best fielder card for a given field zone from a defensive lineup.
 * @param {string} fieldZone
 * @param {object[]} lineupCards  — array of card objects with position
 * @returns {object|null} fielder card
 */
export function getFielder(fieldZone, lineupCards) {
  const zoneMeta = matrix._fieldZoneMap?.[fieldZone]
  const primaryPositions = zoneMeta?.fielders ?? ['CF']

  for (const pos of primaryPositions) {
    const card = lineupCards.find(c =>
      c.position === pos || (c.positions ?? []).includes(pos)
    )
    if (card) return card
  }

  // Fallback: return any fielder
  return lineupCards[0] ?? null
}
