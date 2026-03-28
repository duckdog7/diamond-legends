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

import { buildPitchState, recordPitch, selectAIPitch, penalizeBallAcrossZones } from './pitchAI'
import { resolveContact, advanceCount, CONTACT } from './contactResolver'
import { resolveBallFlight } from './ballFlight'
import { resolveDefense, getFielder, OUTCOME } from './defenseResolver'
import { earnTokensFromOutcome } from './tokens'
import { getBallType, buildRunnerScenarios, resolveRunnerScenarios } from './baserunningResolver'

// ─── Home run pre-check ───────────────────────────────────────────────────────
// Must match the logic in defenseResolver.resolveHit() to keep parity.
const HR_DEEP_ZONES = new Set(['deep_lf_lcf', 'deep_cf_rcf', 'deep_rf'])

function checkHomeRun(contact, fieldZone) {
  return contact === CONTACT.BARREL && HR_DEEP_ZONES.has(fieldZone) && Math.random() < 0.55
}

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
  bases = null,   // [null|{card}, null|{card}, null|{card}] — runner card refs
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
    bases: bases ?? [null, null, null],
    phase: getInningPhase(inning),

    // Resolution history (this at-bat)
    pitchLog: [],   // [{ zone, pitchType, batterZoneGuess, batterTypeGuess, contact, fieldZone, outcome }]

    // Status
    status: 'awaiting_pitch',   // awaiting_pitch | awaiting_guess | resolving | in_play | complete
    result: null,               // final OUTCOME when complete
    error: false,
    outs: 0,

    // In-play data (populated when status === 'in_play')
    inPlayData: null,

    // Pre-computed runner resolution (set by resumeAtBat, used by advanceAfterResult)
    inPlayResolution: null,
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
    // Ball penalty: proportionally drain remaining zone budgets when a ball is thrown
    if (!isInZone) penalizeBallAcrossZones(state.pitchState)

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
    typeCorrect: contactResult.typeCorrect ?? false,
    tokenEffects: {
      pullShift:  tokenEffects.pullShift  ?? false,
      oppoPush:   tokenEffects.oppoPush   ?? false,
      gapFinder:  tokenEffects.gapFinder  ?? false,
      infieldIn:  tokenEffects.infieldIn  ?? false,
    },
  })

  const fielderCard = getFielder(flightResult.fieldZone, state.defenseLineup)

  // ── Home run pre-check — resolve immediately, skip in-play ───────────────
  if (checkHomeRun(contactResult.contact, flightResult.fieldZone)) {
    earnTokensFromOutcome(state.tokenState, OUTCOME.HOME_RUN, 'batting')
    earnTokensFromOutcome(state.tokenState, OUTCOME.HOME_RUN, 'pitching')
    const pitchEntry = {
      zone: thrownZone, pitchType, coord: aiCoord, guessCoord,
      batterZoneGuess, batterTypeGuess,
      contact: contactResult.contact,
      predictionResult: contactResult.predictionResult,
      fieldZone: flightResult.fieldZone,
      primaryFielder: flightResult.primaryFielder,
      baseDifficulty: flightResult.baseDifficulty,
      outcome: OUTCOME.HOME_RUN,
    }
    return { ...state, pitchLog: [...state.pitchLog, pitchEntry], status: 'complete', result: OUTCOME.HOME_RUN, outs: 0 }
  }

  // ── Step 6: Enter in-play — build scenario for UI ────────────────────────
  // Determine fielding success (glove roll) now so InPlayScene knows whether
  // this is a hit or an out-with-throw.
  const gloveTool = fielderCard?.tools?.fielding ?? 60
  const probRow   = { glove80plus: 0.98, glove60: 0.90, glove40: 0.78 }  // routine fallback
  const successProbs = { routine: { glove80plus: 0.98, glove60: 0.90, glove40: 0.78 }, moderate: { glove80plus: 0.85, glove60: 0.72, glove40: 0.55 }, difficult: { glove80plus: 0.65, glove60: 0.48, glove40: 0.30 }, exceptional: { glove80plus: 0.35, glove60: 0.20, glove40: 0.08 } }
  const diffRow   = successProbs[flightResult.baseDifficulty] ?? successProbs.moderate
  const successP  = gloveTool >= 80 ? diffRow.glove80plus
                  : gloveTool >= 60 ? diffRow.glove60 + ((gloveTool - 60) / 20) * (diffRow.glove80plus - diffRow.glove60)
                  : gloveTool >= 40 ? diffRow.glove40 + ((gloveTool - 40) / 20) * (diffRow.glove60 - diffRow.glove40)
                  : diffRow.glove40 * (gloveTool / 40)
  const fieldingSuccess = Math.random() < successP

  const scenarios = buildRunnerScenarios({
    fieldZone:      flightResult.fieldZone,
    fielderCard,
    fieldingSuccess,
    contact:        contactResult.contact,
    baseDifficulty: flightResult.baseDifficulty,
    batterCard:     state.batterCard,
    bases:          state.bases,
  })

  const pitchEntry = {
    zone: thrownZone, pitchType, coord: aiCoord, guessCoord,
    batterZoneGuess, batterTypeGuess,
    contact: contactResult.contact,
    predictionResult: contactResult.predictionResult,
    fieldZone: flightResult.fieldZone,
    primaryFielder: flightResult.primaryFielder,
    baseDifficulty: flightResult.baseDifficulty,
    outcome: null,  // filled in by resumeAtBat
  }

  return {
    ...state,
    pitchLog: [...state.pitchLog, pitchEntry],
    status: 'in_play',
    inPlayData: {
      flightResult,
      fielderCard,
      fieldingSuccess,
      ballType:      getBallType(flightResult.fieldZone),
      contact:       contactResult.contact,
      scenarios,
      bases:         state.bases ?? [null, null, null],
      defenseLineup: state.defenseLineup ?? [],
      pitcherCard:   state.pitcherCard ?? null,
    },
    inPlayResolution: null,
  }
}

// ─── Resume at-bat after in-play decisions ────────────────────────────────────

/**
 * Called after the player has made send/hold decisions in InPlayScene.
 * Resolves all throws, computes the final outcome, and returns a completed atBatState.
 *
 * @param {object} state           — atBatState with status === 'in_play'
 * @param {object} sendDecisions   — { [scenarioId]: 'send' | 'hold' }
 * @returns {object}               — completed atBatState
 */
export function resumeAtBat(state, sendDecisions = {}) {
  if (state.status !== 'in_play' || !state.inPlayData) return state

  const { scenarios, fieldingSuccess, ballType, flightResult } = state.inPlayData

  const { runsScored, newBases, outsRecorded, plays } = resolveRunnerScenarios(scenarios, sendDecisions)

  // Determine play outcome label
  let outcome
  if (!fieldingSuccess) {
    // Ball got through — determine hit type
    const isDeep = flightResult.fieldZone?.startsWith('deep')
    if (ballType === 'ground') outcome = OUTCOME.SINGLE
    else if (isDeep) outcome = OUTCOME.DOUBLE
    else outcome = OUTCOME.SINGLE
  } else if (ballType === 'ground') {
    outcome = OUTCOME.OUT
  } else {
    // Fly/liner caught
    outcome = OUTCOME.OUT
  }

  // Check for extra outs (runner thrown out)
  const totalOuts = outsRecorded

  earnTokensFromOutcome(state.tokenState, outcome, 'batting')
  earnTokensFromOutcome(state.tokenState, outcome, 'pitching')

  // Patch the last pitch log entry with the final outcome
  const updatedPitchLog = state.pitchLog.map((p, i) =>
    i === state.pitchLog.length - 1 ? { ...p, outcome } : p
  )

  return {
    ...state,
    pitchLog: updatedPitchLog,
    status: 'complete',
    result: outcome,
    outs: totalOuts,
    inPlayResolution: {
      runsScored,
      newBases,
      outsRecorded,
      plays,
    },
  }
}

// ─── Inning management helpers ────────────────────────────────────────────────

/**
 * Build a half-inning runner state.
 */
export function createHalfInningState() {
  return {
    outs:  0,
    bases: [null, null, null],  // [1B, 2B, 3B] — null | { card }
    runs:  0,
  }
}

/**
 * Apply an at-bat result to half-inning state.
 * For in-play at-bats, uses the pre-computed inPlayResolution.
 * For non-contact at-bats (K, BB), falls back to simple advancement logic.
 *
 * @param {object} halfInning
 * @param {object} atBatResult  — completed atBatState
 * @returns {object} updated halfInning
 */
export function applyAtBatResult(halfInning, atBatResult) {
  // ── In-play path: use pre-computed runner resolution ──────────────────────
  if (atBatResult.inPlayResolution) {
    const { runsScored, newBases, outsRecorded } = atBatResult.inPlayResolution
    return {
      outs:  halfInning.outs + outsRecorded,
      bases: newBases,
      runs:  runsScored,
    }
  }

  const { result } = atBatResult
  const { outs: currentOuts, bases: baseState, runs: currentRuns } = halfInning
  // Normalise legacy boolean bases to null-based runner slots
  const norm   = (b) => (b === false || b === undefined ? null : b)
  const batter = atBatResult.batterCard ? { card: atBatResult.batterCard } : null

  // Outs (strikeout / fielded out without in-play — should be rare now)
  if (result === OUTCOME.STRIKEOUT) {
    return { outs: currentOuts + 1, bases: baseState.map(norm), runs: currentRuns }
  }
  if (result === OUTCOME.DOUBLE_PLAY) {
    return { outs: Math.min(3, currentOuts + 2), bases: baseState.map(norm), runs: currentRuns }
  }

  const b = baseState.map(norm)  // working copy with card objects or null

  // Walk: batter to first, force runners along
  if (result === OUTCOME.WALK) {
    let scoring = 0
    if (b[0] && b[1] && b[2]) { scoring++; b[2] = null }
    if (b[0] && b[1]) b[2] = b[1]
    if (b[0]) b[1] = b[0]
    b[0] = batter
    return { outs: currentOuts, bases: b, runs: currentRuns + scoring }
  }

  // Home run: everyone scores, bases clear
  if (result === OUTCOME.HOME_RUN) {
    const scoring = 1 + b.filter(Boolean).length
    return { outs: currentOuts, bases: [null, null, null], runs: currentRuns + scoring }
  }

  // Triple: all runners score, batter to 3B
  if (result === OUTCOME.TRIPLE) {
    const scoring = b.filter(Boolean).length
    return { outs: currentOuts, bases: [null, null, batter], runs: currentRuns + scoring }
  }

  // Double: 2B/3B runners score; 1B runner may score (runnerAdvance)
  if (result === OUTCOME.DOUBLE) {
    const runnerAdvance = atBatResult.runnerAdvance ?? false
    let scoring = 0
    if (b[2]) { scoring++; b[2] = null }
    if (b[1]) { scoring++; b[1] = null }
    if (b[0]) {
      if (runnerAdvance) { scoring++; b[0] = null }
      else { b[2] = b[0]; b[0] = null }
    }
    b[1] = batter
    return { outs: currentOuts, bases: b, runs: currentRuns + scoring }
  }

  // Single: advance all runners one base
  let scoring = 0
  if (b[2]) { scoring++; b[2] = null }
  if (b[1]) { b[2] = b[1]; b[1] = null }
  if (b[0]) { b[1] = b[0]; b[0] = null }
  b[0] = batter
  return { outs: currentOuts, bases: b, runs: currentRuns + scoring }
}
