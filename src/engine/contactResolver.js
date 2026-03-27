/**
 * contactResolver.js
 * Resolves contact quality from prediction accuracy + batter tools + pitch type modifiers.
 * GDD §5.4
 */

import pitchTypes from '../data/pitchTypes.json'

// Contact quality tiers
export const CONTACT = {
  NONE:    'none',     // no swing / both wrong — count advances
  WEAK:    'weak',     // foul balls, soft outs
  SOLID:   'solid',    // moderate contact, fielder play
  HARD:    'hard',     // well-struck ball, extra base risk
  BARREL:  'barrel',   // best possible — HR territory
}

// Die pool sizes per prediction result
const BASE_POOL = {
  bothCorrect:         4,
  zoneCorrectTypeWrong: 3,
  typeCorrectZoneWrong: 2,
  bothWrong:           0,
}

// Tier thresholds: roll total needed to achieve each contact level
// Pool of 4d6-style dice is simulated as a score 0–100
const TIER_THRESHOLDS = {
  [CONTACT.BARREL]: 85,
  [CONTACT.HARD]:   65,
  [CONTACT.SOLID]:  40,
  [CONTACT.WEAK]:   15,
  // below 15 = foul / no contact even if pool > 0
}

/**
 * Main contact resolution.
 * @param {object} params
 * @param {object} params.batterCard       — full card object
 * @param {object} params.pitcherCard      — full card object
 * @param {string} params.pitchType        — e.g. 'FB'
 * @param {string} params.thrownZone       — actual zone pitched
 * @param {string} params.batterZoneGuess  — batter's zone prediction
 * @param {string} params.batterTypeGuess  — batter's pitch type prediction
 * @param {number} params.batterTokenBonus — extra die bonus from tokens (0–2)
 * @param {boolean} params.isHotZone       — true if zone is in batter's hot zone
 * @param {string} params.count            — e.g. '0-2' (balls-strikes)
 * @returns {{ contact: string, roll: number, pool: number, predictionResult: string }}
 */
export function resolveContact({
  batterCard,
  pitcherCard,
  pitchType,
  thrownZone,
  batterZoneGuess,
  batterTypeGuess,
  batterTokenBonus = 0,
  isHotZone = false,
  count = '0-0',
}) {
  const typeData = pitchTypes.find(p => p.id === pitchType)

  // ── 1. Prediction accuracy ─────────────────────────────────────────────────
  const zoneCorrect = thrownZone === batterZoneGuess
  const typeCorrect = pitchType === batterTypeGuess

  let predictionResult
  if (zoneCorrect && typeCorrect) predictionResult = 'bothCorrect'
  else if (zoneCorrect) predictionResult = 'zoneCorrectTypeWrong'
  else if (typeCorrect) predictionResult = 'typeCorrectZoneWrong'
  else predictionResult = 'bothWrong'

  // Special case: Curveball both wrong = automatic miss (GDD §5.3)
  if (pitchType === 'CB' && predictionResult === 'bothWrong') {
    return { contact: CONTACT.NONE, roll: 0, pool: 0, predictionResult, automatic: 'miss' }
  }

  // No contact: count advances as ball or strike
  if (predictionResult === 'bothWrong') {
    return { contact: CONTACT.NONE, roll: 0, pool: 0, predictionResult }
  }

  // ── 2. Build dice pool ─────────────────────────────────────────────────────
  let pool = BASE_POOL[predictionResult]

  // Hot zone: +1 die on both-correct
  if (isHotZone && predictionResult === 'bothCorrect') pool += 1

  // Token bonus
  pool += batterTokenBonus

  // Changeup zone-correct type-wrong: drops contact tier by 1 (handled below)
  const changupTierDrop = pitchType === 'CH' && predictionResult === 'zoneCorrectTypeWrong'

  // Cut fastball: power pool -1 die on any contact
  const cfPowerPenalty = pitchType === 'CF'
  if (cfPowerPenalty) pool = Math.max(1, pool - 1)

  // ── 3. Batter tool modifier ────────────────────────────────────────────────
  // Use average_tool for contact quality, power_tool for barrel ceiling
  const avgTool = batterCard.tools?.average ?? 60
  const pwrTool = batterCard.tools?.power ?? 60

  // Scale 0–100 tools to a -10 to +20 roll modifier
  const avgMod = Math.round((avgTool - 60) / 4)
  const pwrMod = Math.round((pwrTool - 60) / 8)   // power affects upper end more

  // ── 4. Roll ───────────────────────────────────────────────────────────────
  // Simulate dice pool: each die is 1d20, sum, scale to 0–100
  let rawRoll = 0
  for (let i = 0; i < pool; i++) rawRoll += Math.random() * 20
  const roll = Math.min(100, Math.max(0, Math.round((rawRoll / (pool * 20)) * 100) + avgMod))

  // ── 5. Determine contact tier ──────────────────────────────────────────────
  let contact
  if (roll >= TIER_THRESHOLDS[CONTACT.BARREL] + pwrMod) contact = CONTACT.BARREL
  else if (roll >= TIER_THRESHOLDS[CONTACT.HARD]) contact = CONTACT.HARD
  else if (roll >= TIER_THRESHOLDS[CONTACT.SOLID]) contact = CONTACT.SOLID
  else if (roll >= TIER_THRESHOLDS[CONTACT.WEAK]) contact = CONTACT.WEAK
  else contact = CONTACT.NONE  // foul / no contact despite swing

  // Changeup tier drop
  if (changupTierDrop) {
    const order = [CONTACT.NONE, CONTACT.WEAK, CONTACT.SOLID, CONTACT.HARD, CONTACT.BARREL]
    const idx = order.indexOf(contact)
    contact = order[Math.max(0, idx - 1)]
  }

  return { contact, roll, pool, predictionResult }
}

/**
 * Determine if the pitch is a called strike (batter did not swing / both wrong).
 * Zone is in strike zone = TC, MC, BC, ML, MR, TL, TR, BL, BR (all 9 are "in" for simplicity).
 * Edge zones (corners) can be balls — this is a simplified model.
 * @param {string} zone
 * @returns {boolean}
 */
export function isStrikeZone(zone) {
  // Corner zones are borderline; mid zones are strikes
  const strikeZones = new Set(['TC','MC','BC','ML','MR'])
  const borderZones = new Set(['TL','TR','BL','BR'])
  if (strikeZones.has(zone)) return true
  // Corners: 65% chance of being called strike
  if (borderZones.has(zone)) return Math.random() < 0.65
  return false
}

/**
 * Advance the count based on a no-contact pitch result.
 * @param {{ balls: number, strikes: number }} count
 * @param {string} zone  — thrown zone
 * @returns {{ balls: number, strikes: number, outcome: 'ball'|'strike'|'strikeout'|'walk' }}
 */
export function advanceCount(count, zone) {
  const inZone = isStrikeZone(zone)
  let { balls, strikes } = count

  if (inZone) {
    strikes += 1
    if (strikes >= 3) return { balls, strikes, outcome: 'strikeout' }
    return { balls, strikes, outcome: 'strike' }
  } else {
    balls += 1
    if (balls >= 4) return { balls, strikes, outcome: 'walk' }
    return { balls, strikes, outcome: 'ball' }
  }
}
