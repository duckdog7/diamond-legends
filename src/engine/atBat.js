/**
 * atBat.js
 * At-bat state machine. Orchestrates the full 7-step resolution chain per pitch.
 * GDD §5.1
 *
 * Usage:
 *   const state = createAtBatState({ batterCard, pitcherCard, defenseLineup, inning, half })
 *   const state2 = stepAtBat(state, { batterZoneGuess, batterTypeGuess, tokenEffects })
 *   // Repeat until state.status === 'complete'
 */

import { buildPitchState, recordPitch, selectAIPitch } from './pitchAI'
import { resolveContact, advanceCount, CONTACT } from './contactResolver'
import { resolveBallFlight } from './ballFlight'
import { resolveDefense, getFielder, OUTCOME } from './defenseResolver'
import { earnTokensFromOutcome } from './tokens'

// ─── Inning phases ────────────────────────────────────────────────────────────

export function getInningPhase(inning) {
  if (inning <= 3) return 'early'
  if (inning <= 6) return 'mid'
  return 'late'
}

// ─── State factory ────────────────────────────────────────────────────────────

/**
 * Create initial at-bat state.
 * @param {object} params
 * @param {object} params.batterCard       — batter's full card
 * @param {object} params.pitcherCard      — pitcher's full card
 * @param {object[]} params.defenseLineup  — array of fielder cards
 * @param {object} params.pitchState       — persistent pitch state across at-bats (from buildPitchState)
 * @param {object} params.tokenState       — persistent token state (from buildTokenState)
 * @param {number} params.inning           — 1–9
 * @param {'top'|'bottom'} params.half
 * @param {boolean} params.runnersOn       — simplified: any runner on base
 * @returns {object} atBatState
 */
export function createAtBatState({
  batterCard,
  pitcherCard,
  defenseLineup,
  pitchState,
  tokenState,
  inning = 1,
  half = 'top',
  runnersOn = false,
}) {
  return {
    // Identity
    batterCard,
    pitcherCard,
    defenseLineup,
    pitchState,     // mutable — shared across at-bats in a half-inning
    tokenState,     // mutable — shared across game

    // At-bat state
    count: { balls: 0, strikes: 0 },
    inning,
    half,
    runnersOn,
    phase: getInningPhase(inning),

    // Resolution history (this at-bat)
    pitchLog: [],   // [{ zone, pitchType, batterZoneGuess, batterTypeGuess, contact, fieldZone, outcome }]

    // Status
    status: 'awaiting_pitch',   // awaiting_pitch | awaiting_guess | resolving | complete
    result: null,               // final OUTCOME when complete
    bases: 0,
    error: false,
    runnerAdvance: false,
    outs: 0,
  }
}

// ─── Main step function ───────────────────────────────────────────────────────

/**
 * Advance the at-bat by one pitch.
 *
 * Caller provides the batter's decisions; pitcher AI makes its own selection.
 * Returns a new state object (non-mutating snapshot of mutable sub-objects).
 *
 * @param {object} state  — current atBatState
 * @param {object} input
 * @param {string} input.batterZoneGuess  — e.g. 'TC'
 * @param {string} input.batterTypeGuess  — e.g. 'FB'
 * @param {object} input.tokenEffects     — { pullShift, oppoPush, gapFinder, infieldIn, extraDie }
 * @param {string} [input.pitcherZone]    — override for human-controlled pitcher (optional)
 * @param {string} [input.pitcherType]    — override for human-controlled pitcher (optional)
 * @returns {object} updated atBatState
 */
export function stepAtBat(state, input) {
  if (state.status === 'complete') return state

  const {
    take          = false,
    batterZoneGuess,
    batterTypeGuess,
    guessCoord    = null,
    tokenEffects  = {},
    pitcherZone:  overrideZone,
    pitcherType:  overrideType,
  } = input

  // ── Step 1: Pitcher selects pitch ─────────────────────────────────────────
  const gameContext = { count: state.count, inningPhase: state.phase }
  const { zone: aiZone, pitchType: aiType, coord: aiCoord, isInZone = true } =
    selectAIPitch(state.pitcherCard, state.pitchState, gameContext)
  const thrownZone = overrideZone ?? aiZone
  const pitchType  = overrideType ?? aiType

  // ── Take-pitch path (batter does not swing) ───────────────────────────────
  if (take) {
    recordPitch(state.pitchState, thrownZone, pitchType)

    const newBalls   = isInZone ? state.count.balls   : state.count.balls   + 1
    const newStrikes = isInZone ? state.count.strikes + 1 : state.count.strikes

    const base = {
      zone: thrownZone, pitchType, coord: aiCoord, guessCoord,
      batterZoneGuess: null, batterTypeGuess: null,
      contact: CONTACT.NONE,
      tookPitch: true, isInZone,
    }

    if (!isInZone && newBalls >= 4) {
      earnTokensFromOutcome(state.tokenState, OUTCOME.WALK, 'batting')
      return {
        ...state,
        count: { balls: newBalls, strikes: newStrikes },
        pitchLog: [...state.pitchLog, { ...base, countOutcome: 'walk', predictionResult: 'ball' }],
        status: 'complete', result: OUTCOME.WALK, bases: 1,
      }
    }

    if (isInZone && newStrikes >= 3) {
      earnTokensFromOutcome(state.tokenState, OUTCOME.STRIKEOUT, 'batting')
      earnTokensFromOutcome(state.tokenState, OUTCOME.STRIKEOUT, 'pitching')
      return {
        ...state,
        count: { balls: newBalls, strikes: newStrikes },
        pitchLog: [...state.pitchLog, { ...base, countOutcome: 'strikeout', predictionResult: 'called_strike' }],
        status: 'complete', result: OUTCOME.STRIKEOUT, outs: 1,
      }
    }

    return {
      ...state,
      count: { balls: newBalls, strikes: newStrikes },
      pitchLog: [...state.pitchLog, {
        ...base,
        countOutcome:     isInZone ? 'called_strike' : 'ball',
        predictionResult: isInZone ? 'called_strike' : 'ball',
      }],
      status: 'awaiting_pitch',
    }
  }

  // ── Step 2: (Batter's guess is already provided as input) ─────────────────
  // Extra die from token effect
  const extraDie = tokenEffects.extraDie ? 1 : 0

  // ── Step 3 & 4: Contact quality resolution ────────────────────────────────
  const contactResult = resolveContact({
    batterCard: state.batterCard,
    pitcherCard: state.pitcherCard,
    pitchType,
    thrownZone,
    batterZoneGuess,
    batterTypeGuess,
    batterTokenBonus: extraDie,
    isHotZone: false,   // TODO: wire hot zone tracking in season layer
    count: `${state.count.balls}-${state.count.strikes}`,
  })

  // Record the pitch in persistent pitch state
  recordPitch(state.pitchState, thrownZone, pitchType)

  // ── No contact: advance count ─────────────────────────────────────────────
  if (contactResult.contact === CONTACT.NONE) {
    const countResult = advanceCount(state.count, thrownZone)

    const pitchEntry = {
      zone: thrownZone, pitchType, coord: aiCoord, guessCoord,
      batterZoneGuess, batterTypeGuess,
      contact: CONTACT.NONE, predictionResult: contactResult.predictionResult,
      countOutcome: countResult.outcome,
    }

    if (countResult.outcome === 'strikeout') {
      earnTokensFromOutcome(state.tokenState, OUTCOME.STRIKEOUT, 'pitching')
      earnTokensFromOutcome(state.tokenState, OUTCOME.STRIKEOUT, 'batting')
      return {
        ...state,
        count: { balls: countResult.balls, strikes: countResult.strikes },
        pitchLog: [...state.pitchLog, pitchEntry],
        status: 'complete',
        result: OUTCOME.STRIKEOUT,
        outs: 1,
      }
    }

    if (countResult.outcome === 'walk') {
      earnTokensFromOutcome(state.tokenState, OUTCOME.WALK, 'batting')
      return {
        ...state,
        count: { balls: countResult.balls, strikes: countResult.strikes },
        pitchLog: [...state.pitchLog, pitchEntry],
        status: 'complete',
        result: OUTCOME.WALK,
        bases: 1,
      }
    }

    return {
      ...state,
      count: { balls: countResult.balls, strikes: countResult.strikes },
      pitchLog: [...state.pitchLog, pitchEntry],
      status: 'awaiting_pitch',
    }
  }

  // ── Step 5: Ball flight lookup ────────────────────────────────────────────
  const flightResult = resolveBallFlight({
    pitchType,
    thrownZone,
    contact: contactResult.contact,
    tokenEffects: {
      pullShift:  tokenEffects.pullShift  ?? false,
      oppoPush:   tokenEffects.oppoPush   ?? false,
      gapFinder:  tokenEffects.gapFinder  ?? false,
      infieldIn:  tokenEffects.infieldIn  ?? false,
    },
  })

  // ── Step 6: Defensive resolution ─────────────────────────────────────────
  const fielderCard = getFielder(flightResult.fieldZone, state.defenseLineup)
  const defenseResult = resolveDefense({
    fielderCard,
    fieldZone:          flightResult.fieldZone,
    baseDifficulty:     flightResult.baseDifficulty,
    contact:            contactResult.contact,
    extraBaseRisk:      flightResult.extraBaseRisk,
    armMatters:         flightResult.armMatters,
    doublePlayEligible: flightResult.doublePlayEligible,
    doublePlayBonus:    flightResult.doublePlayBonus,
    runnersOn:          state.runnersOn,
  })

  // ── Step 7: Record outcome ────────────────────────────────────────────────
  const outcome = defenseResult.outcome
  earnTokensFromOutcome(state.tokenState, outcome, 'batting')
  earnTokensFromOutcome(state.tokenState, outcome, 'pitching')

  const pitchEntry = {
    zone: thrownZone, pitchType, coord: aiCoord, guessCoord,
    batterZoneGuess, batterTypeGuess,
    contact: contactResult.contact,
    predictionResult: contactResult.predictionResult,
    fieldZone: flightResult.fieldZone,
    primaryFielder: flightResult.primaryFielder,
    baseDifficulty: flightResult.baseDifficulty,
    outcome,
  }

  return {
    ...state,
    pitchLog: [...state.pitchLog, pitchEntry],
    status: 'complete',
    result: outcome,
    bases: defenseResult.bases,
    error: defenseResult.error,
    runnerAdvance: defenseResult.runnerAdvance,
    outs: defenseResult.outs ?? 0,
  }
}

// ─── Inning management helpers ────────────────────────────────────────────────

/**
 * Build a half-inning runner state.
 */
export function createHalfInningState() {
  return {
    outs: 0,
    bases: [false, false, false],  // [1B, 2B, 3B]
    runs: 0,
  }
}

/**
 * Apply an at-bat result to half-inning state.
 * Simplified runner advancement — handles the most common cases.
 * @param {object} halfInning
 * @param {object} atBatResult  — completed atBatState
 * @returns {object} updated halfInning
 */
export function applyAtBatResult(halfInning, atBatResult) {
  const { result, bases, runnerAdvance, outs } = atBatResult
  let { outs: currentOuts, bases: baseState, runs: currentRuns } = halfInning

  // Outs
  if (result === OUTCOME.OUT || result === OUTCOME.STRIKEOUT) {
    return { ...halfInning, outs: currentOuts + 1 }
  }

  if (result === OUTCOME.DOUBLE_PLAY) {
    return { ...halfInning, outs: Math.min(3, currentOuts + 2) }
  }

  // Walk: batter to first, force runners
  if (result === OUTCOME.WALK) {
    const newBases = [...baseState]
    let scoringRuns = 0
    if (newBases[0] && newBases[1] && newBases[2]) { scoringRuns = 1; newBases[2] = false }
    if (newBases[0] && newBases[1]) newBases[2] = true
    if (newBases[0]) newBases[1] = true
    newBases[0] = true
    return { ...halfInning, bases: newBases, runs: currentRuns + scoringRuns }
  }

  // Hit
  let newBases = [...baseState]
  let scoringRuns = 0

  if (result === OUTCOME.HOME_RUN) {
    scoringRuns = 1 + newBases.filter(Boolean).length
    newBases = [false, false, false]
    return { ...halfInning, bases: newBases, runs: currentRuns + scoringRuns }
  }

  if (result === OUTCOME.TRIPLE) {
    scoringRuns = newBases.filter(Boolean).length
    newBases = [false, false, true]
    return { ...halfInning, bases: newBases, runs: currentRuns + scoringRuns }
  }

  if (result === OUTCOME.DOUBLE) {
    // All runners score from 2B/3B; runner from 1B may score
    if (newBases[2]) { scoringRuns++; newBases[2] = false }
    if (newBases[1]) { scoringRuns++; newBases[1] = false }
    if (newBases[0]) {
      if (runnerAdvance) { scoringRuns++; newBases[0] = false }
      else { newBases[2] = true; newBases[0] = false }
    }
    newBases[1] = true
    return { ...halfInning, bases: newBases, runs: currentRuns + scoringRuns }
  }

  // Single
  if (newBases[2]) { scoringRuns++; newBases[2] = false }
  if (newBases[1]) { newBases[2] = true; newBases[1] = false }
  if (newBases[0]) { newBases[1] = true; newBases[0] = false }
  if (runnerAdvance && newBases[1]) { scoringRuns++; newBases[1] = false }
  newBases[0] = true

  return { ...halfInning, bases: newBases, runs: currentRuns + scoringRuns }
}
