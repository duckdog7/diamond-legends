/**
 * pitchAI.js
 * Pitcher AI: zone budget allocation, pitch selection, control simulation.
 *
 * Budget model:
 *   Each pitcher has maxPitches (from arm rating).
 *   All pitches are pre-allocated across the 9 zones proportionally to the pitcher's
 *   combined zone affinities.  As the AI pitches to a zone, remainingBudget[zone]
 *   decrements.  The zone heat display shows remainingBudget[zone] / totalRemaining,
 *   so a heavily-used zone shrinks in probability even mid-game.
 *
 *   Control check:  each pitch has a probability of landing outside the strike zone
 *   (isInZone = false).  A taken pitch that misses the zone is a ball.
 */

import pitchTypes from '../data/pitchTypes.json'

// ─── SVG coordinate constants (mirrors ZoneCanvas.jsx) ────────────────────────
const ZONE_X = 20, ZONE_Y = 20, ZONE_W = 180, ZONE_H = 180, CELL_W = 60, CELL_H = 60

const ZONE_KEYS = ['TL','TC','TR','ML','MC','MR','BL','BC','BR']

// ─── Max pitch computation ────────────────────────────────────────────────────
// arm 55 → ~80  |  arm 70 → ~90  |  arm 84 → ~99  |  arm 100 → ~110
function computeMaxPitches(arm = 60) {
  return Math.round(43 + arm * 0.67)
}

// ─── Combined zone affinity across repertoire ─────────────────────────────────
function combinedAffinity(repertoire) {
  const aff = {}
  ZONE_KEYS.forEach(z => { aff[z] = 0 })
  repertoire.forEach(typeId => {
    const td = pitchTypes.find(p => p.id === typeId)
    if (!td) return
    ZONE_KEYS.forEach(z => { aff[z] += (td.zoneAffinities[z] ?? 0.11) })
  })
  const sum = Object.values(aff).reduce((a, b) => a + b, 0) || 1
  ZONE_KEYS.forEach(z => { aff[z] /= sum })
  return aff
}

// ─── Allocate budget using floor + fractional-remainder distribution ──────────
function allocateBudget(aff, maxPitches) {
  const budget = {}
  let allocated = 0
  ZONE_KEYS.forEach(z => {
    budget[z] = Math.floor(aff[z] * maxPitches)
    allocated += budget[z]
  })
  // Distribute remainder to zones with highest fractional parts
  const remainder = maxPitches - allocated
  ;[...ZONE_KEYS]
    .sort((a, b) => (aff[b] * maxPitches) % 1 - (aff[a] * maxPitches) % 1)
    .slice(0, remainder)
    .forEach(z => { budget[z] += 1 })
  return budget
}

// ─── Ball-outside-zone coordinate ────────────────────────────────────────────
function ballCoord() {
  const side = Math.floor(Math.random() * 4)
  const mid  = ZONE_Y + ZONE_H / 2
  const ctr  = ZONE_X + ZONE_W / 2
  switch (side) {
    case 0: return { x: Math.max(4, ZONE_X - 6 - Math.random() * 12),          y: mid + (Math.random() - 0.5) * ZONE_H * 0.7 }
    case 1: return { x: Math.min(216, ZONE_X + ZONE_W + 6 + Math.random() * 12), y: mid + (Math.random() - 0.5) * ZONE_H * 0.7 }
    case 2: return { x: ctr + (Math.random() - 0.5) * ZONE_W * 0.7,             y: Math.min(255, ZONE_Y + ZONE_H + 8 + Math.random() * 18) }
    default: return { x: ctr + (Math.random() - 0.5) * ZONE_W * 0.7,            y: Math.max(4, ZONE_Y - 6 - Math.random() * 12) }
  }
}

// ─── buildPitchState ──────────────────────────────────────────────────────────
/**
 * Build initial pitch state for a pitcher card.
 * Allocates pitch budget across zones proportional to pitcher's tendencies.
 */
export function buildPitchState(pitcherCard) {
  const repertoire  = pitcherCard.pitchRepertoire ?? ['FB']
  const arm         = pitcherCard.tools?.arm ?? 60
  const maxPitches  = computeMaxPitches(arm)
  const aff         = combinedAffinity(repertoire)
  const initialBudget   = allocateBudget(aff, maxPitches)
  const remainingBudget = { ...initialBudget }

  const typeBudget = {}
  repertoire.forEach(t => { typeBudget[t] = 0 })

  return {
    pitcherCardId:  pitcherCard.id,
    repertoire,
    maxPitches,
    totalPitches:   0,
    initialBudget,      // snapshot — for reference / display of original tendencies
    remainingBudget,    // live: decrements per zone as pitches are thrown
    zoneBudget:     { ...initialBudget },  // alias kept for PitcherPanel ConditioningBar compat
    typeBudget,
    fatigueLevel:   0,
    isFatigued:     false,
  }
}

// ─── recordPitch ──────────────────────────────────────────────────────────────
/**
 * Record a pitch thrown — decrement zone budget, update fatigue.
 */
export function recordPitch(pitchState, zone, pitchType) {
  // Decrement zone budget
  if (pitchState.remainingBudget[zone] > 0) {
    pitchState.remainingBudget[zone] -= 1
  }
  pitchState.zoneBudget[zone] = (pitchState.zoneBudget[zone] ?? 0) + 1  // legacy counter
  pitchState.typeBudget[pitchType] = (pitchState.typeBudget[pitchType] ?? 0) + 1
  pitchState.totalPitches += 1

  // Fatigue ramps after 40% of max is used — reaches 100 at pitch limit
  const pctUsed = pitchState.totalPitches / (pitchState.maxPitches || 100)
  pitchState.fatigueLevel = Math.min(100, Math.max(0, ((pctUsed - 0.40) / 0.60) * 100))
  pitchState.isFatigued   = pitchState.fatigueLevel >= 60

  return pitchState
}

// ─── selectAIPitch ────────────────────────────────────────────────────────────
/**
 * AI pitch selection weighted by remaining zone budget.
 * Returns { zone, pitchType, coord, isInZone }.
 *
 * isInZone = false means the pitch misses the plate — a ball when taken.
 */
export function selectAIPitch(pitcherCard, pitchState, gameContext = {}) {
  const { count = { balls: 0, strikes: 0 }, inningPhase = 'early' } = gameContext
  const repertoire = pitchState.repertoire
  const arm        = pitcherCard.tools?.arm ?? 60

  // ── Select pitch type ──────────────────────────────────────────────────────
  const typeWeights = {}
  let totalTypeWeight = 0

  repertoire.forEach(typeId => {
    const td       = pitchTypes.find(p => p.id === typeId)
    if (!td) return
    const thrown   = pitchState.typeBudget[typeId] ?? 0
    const total    = pitchState.totalPitches || 1
    let weight     = 1.0

    if (typeId === 'FB' && count.strikes === 0) weight = 1.4
    if (typeId === 'SL' && count.balls <= 1 && count.strikes === 2) weight = 1.5
    if (typeId === 'CB' && count.strikes === 2) weight = 1.3
    if (typeId === 'CH' && count.balls === count.strikes) weight = 1.2
    if ((thrown / total) > 0.60) weight *= 0.5
    if (inningPhase === 'late') weight *= 1.1

    typeWeights[typeId]  = weight
    totalTypeWeight     += weight
  })

  let pitchType = repertoire[0]
  let rand = Math.random() * totalTypeWeight
  for (const [typeId, w] of Object.entries(typeWeights)) {
    rand -= w
    if (rand <= 0) { pitchType = typeId; break }
  }

  // ── Select zone — weighted by remaining budget ─────────────────────────────
  // Depleted zones (budget = 0) are truly unavailable as targets
  const zoneWeights = {}
  let totalZoneWeight = 0

  ZONE_KEYS.forEach(zone => {
    const remaining = pitchState.remainingBudget[zone] ?? 0
    if (remaining === 0) {
      zoneWeights[zone] = 0
      return
    }
    let weight = remaining

    // Count-situation bonuses still nudge toward certain zones
    if ((pitchType === 'SL' || pitchType === 'CB') && count.strikes === 2) {
      if (zone.startsWith('B')) weight *= 1.4
    }

    zoneWeights[zone]  = weight
    totalZoneWeight   += weight
  })

  // If all zones depleted (pitcher is done), fall back to MC
  if (totalZoneWeight === 0) {
    zoneWeights['MC'] = 1
    totalZoneWeight   = 1
  }

  let selectedZone = 'MC'
  rand = Math.random() * totalZoneWeight
  for (const [zone, w] of Object.entries(zoneWeights)) {
    rand -= w
    if (rand <= 0) { selectedZone = zone; break }
  }

  // ── Generate coordinate within selected zone ───────────────────────────────
  const col = selectedZone[1] === 'L' ? 0 : selectedZone[1] === 'C' ? 1 : 2
  const row = selectedZone[0] === 'T' ? 0 : selectedZone[0] === 'M' ? 1 : 2
  const m   = 8
  const coord = {
    x: ZONE_X + col * CELL_W + m + Math.random() * (CELL_W - m * 2),
    y: ZONE_Y + row * CELL_H + m + Math.random() * (CELL_H - m * 2),
  }

  // ── Control check: does the pitch actually hit the target zone? ─────────────
  // Base: arm 40 → ~52%  |  arm 60 → ~57%  |  arm 80 → ~62%  |  arm 100 → ~67%
  const baseControl = 0.42 + (arm / 100) * 0.25

  // Corner zones (TL/TR/BL/BR) are hardest to hit accurately; edges slightly harder than center
  const CORNER_ZONES = new Set(['TL', 'TR', 'BL', 'BR'])
  const EDGE_ZONES   = new Set(['TC', 'ML', 'MR', 'BC'])
  const zonePenalty  = CORNER_ZONES.has(selectedZone) ? 0.80
                     : EDGE_ZONES.has(selectedZone)   ? 0.91
                     : 1.0

  // Fatigue steadily erodes control — max -15% at full fatigue
  const fatigueRedux = (pitchState.fatigueLevel ?? 0) * 0.0015

  const controlProb = Math.max(0.38, baseControl * zonePenalty - fatigueRedux)
  const isInZone    = Math.random() < controlProb

  return {
    zone:      selectedZone,
    pitchType,
    coord:     isInZone ? coord : ballCoord(),
    isInZone,
  }
}

// ─── Remaining-budget zone summary (for display) ──────────────────────────────
/**
 * Returns { zone: pct } where pct = remainingBudget[zone] / totalRemaining.
 * This is exactly what the heatmap should display.
 */
export function getRemainingZonePcts(pitchState) {
  if (!pitchState?.remainingBudget) return {}
  const totalRemaining = Object.values(pitchState.remainingBudget).reduce((a, b) => a + b, 0) || 1
  const out = {}
  ZONE_KEYS.forEach(z => {
    out[z] = pitchState.remainingBudget[z] / totalRemaining
  })
  return out
}

// ─── Legacy helpers (used by PitcherPanel / UI) ───────────────────────────────
export function getZoneEffectiveness(pitcherCard, pitchState, zone, pitchType) {
  const remaining = pitchState.remainingBudget?.[zone] ?? 0
  const initial   = pitchState.initialBudget?.[zone]   ?? 1
  const depletion = 1 - remaining / Math.max(initial, 1)
  if (depletion > 0.75) return 0.60
  if (pitchState.isFatigued) return 0.85
  return 1.0
}

export function getFatiguedZones(pitcherCard, pitchState) {
  if (!pitchState?.remainingBudget) return []
  return ZONE_KEYS.filter(z => {
    const initial   = pitchState.initialBudget?.[z]   ?? 1
    const remaining = pitchState.remainingBudget?.[z] ?? 0
    return remaining / initial < 0.25
  })
}

export function getPitchTypeSummary(pitchState) {
  const total = pitchState.totalPitches || 1
  const out   = {}
  for (const [typeId, count] of Object.entries(pitchState.typeBudget ?? {})) {
    out[typeId] = { thrown: count, pct: Math.round((count / total) * 100) }
  }
  return out
}

export function getZoneSummary(pitchState) {
  if (!pitchState?.remainingBudget) return {}
  const total = pitchState.totalPitches || 1
  const out   = {}
  ZONE_KEYS.forEach(z => {
    const thrown = pitchState.initialBudget[z] - pitchState.remainingBudget[z]
    out[z] = { thrown, pct: Math.round((thrown / total) * 100) }
  })
  return out
}
