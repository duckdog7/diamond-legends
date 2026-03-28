/**
 * baserunningResolver.js
 *
 * Handles all ball-in-play baserunning and throw resolution.
 * Replaces the implicit runner logic in defenseResolver.js for the in-play phase.
 *
 * Architecture:
 *   1. getBallType()         — classify field zone as ground / fly / liner
 *   2. getLeadTimeBonus()    — how much of a head start does the runner have
 *   3. projectThrow()        — raw math preview (no roll) for UI display
 *   4. resolveThrow()        — adds ±randomness for final resolution
 *   5. buildRunnerScenarios() — full scenario list for in-play UI
 *   6. resolveRunnerScenarios() — apply decisions, compute final state
 */

import throwMatrixData from '../data/throwMatrix.json'

// ─── Ball type ─────────────────────────────────────────────────────────────────

export const BALL_TYPE = {
  GROUND: 'ground',
  FLY:    'fly',
  LINER:  'liner',
}

export function getBallType(fieldZone) {
  if (!fieldZone) return BALL_TYPE.LINER
  if (fieldZone.startsWith('infield')) return BALL_TYPE.GROUND
  if (fieldZone.startsWith('deep'))    return BALL_TYPE.FLY
  return BALL_TYPE.LINER
}

// ─── Throw probability table ───────────────────────────────────────────────────

const THROW_PROBS = throwMatrixData._throwSuccessProbabilities

/**
 * Interpolate base out probability from arm score and distance tier.
 * Returns a 0–1 probability that the throw retires the runner.
 */
function baseOutProb(armScore, distanceTier) {
  const row = THROW_PROBS[distanceTier] ?? THROW_PROBS.medium
  if (armScore >= 80) return row.arm80
  if (armScore >= 60) return row.arm60 + ((armScore - 60) / 20) * (row.arm80 - row.arm60)
  if (armScore >= 40) return row.arm40 + ((armScore - 40) / 20) * (row.arm60 - row.arm40)
  return row.arm40 * (armScore / 40)
}

// ─── Lead time ─────────────────────────────────────────────────────────────────

/**
 * How much of a running head start does the runner have, in probability-modifier units.
 * Returned as a fraction added to the out probability (negative = runner advantage).
 *
 * Positive = defender advantage (closer throw, no time for runner).
 * Negative = runner advantage (more time to get there).
 */
export function getLeadTimeBonus({ ballType, fieldDifficulty, isForced, runnerStartBase, isBatterRunner = false }) {
  // Base: a normal runner in motion on contact
  let bonus = -0.08

  // Ground ball: runner goes the instant bat hits ball — more time
  if (ballType === BALL_TYPE.GROUND) bonus -= 0.08
  // Fly ball: runner waits for catch — less time (must tag up)
  if (ballType === BALL_TYPE.FLY)    bonus += 0.12
  // Liner: medium read time, runner hesitates
  if (ballType === BALL_TYPE.LINER)  bonus += 0.04

  // Difficult/exceptional play took the fielder longer to get the ball
  if (fieldDifficulty === 'difficult')   bonus -= 0.06
  if (fieldDifficulty === 'exceptional') bonus -= 0.14

  // Forced runner was already committed to run
  if (isForced) bonus -= 0.04

  // Runner already at 3B: short distance to home
  if (runnerStartBase === 3) bonus -= 0.05

  // Batter-runner: less "runway" advantage than an experienced baserunner
  if (isBatterRunner) bonus += 0.03

  return bonus
}

// ─── Projection (no roll) ──────────────────────────────────────────────────────

/**
 * Project throw outcome — pure math, no randomness.
 * Used for the UI preview so the player can make an informed decision.
 *
 * @param {string} fielderPosition   — 'RF', '3B', etc.
 * @param {number} fielderArmScore   — 0–100
 * @param {string|number} toBase     — 'home' | 1 | 2 | 3
 * @param {number} runnerSpeedScore  — 0–100
 * @param {number} leadTimeBonus     — from getLeadTimeBonus()
 * @returns {{ outProb, label, effectiveArm, runnerSpeed, throwData }}
 */
export function projectThrow({ fielderPosition, fielderArmScore, toBase, runnerSpeedScore, leadTimeBonus }) {
  const baseLabel  = toBase === 0 ? 'home' : `${toBase}B`
  const throwData  = throwMatrixData[fielderPosition]?.[baseLabel]

  if (!throwData) {
    return { outProb: 0, label: 'No throw', effectiveArm: 0, runnerSpeed: runnerSpeedScore, throwData: null }
  }

  // Base probability purely from arm vs distance
  let outProb = baseOutProb(fielderArmScore, throwData.distanceTier)

  // Speed modifier: above/below neutral (60) shifts probability
  const speedDelta = (runnerSpeedScore - 60) / 100
  outProb -= speedDelta * 0.30  // fast runner (80) reduces out prob by ~6%; slow (40) increases by ~6%

  // Lead time modifier
  outProb += leadTimeBonus

  outProb = Math.max(0.02, Math.min(0.97, outProb))

  const label = outProb >= 0.65 ? 'Lean OUT'
              : outProb >= 0.50 ? 'Coin flip'
              : outProb >= 0.35 ? 'Lean SAFE'
              : 'SAFE likely'

  return {
    outProb: Math.round(outProb * 100),  // percentage for display
    outProbRaw: outProb,
    label,
    throwData,
  }
}

// ─── Resolution (with randomness) ─────────────────────────────────────────────

/**
 * Resolve a throw — same math as projectThrow() but adds a ±12 roll.
 * The roll is the game's tension: close calls can go either way.
 */
export function resolveThrow({ fielderPosition, fielderArmScore, toBase, runnerSpeedScore, leadTimeBonus }) {
  const baseLabel  = toBase === 0 ? 'home' : `${toBase}B`
  const throwData  = throwMatrixData[fielderPosition]?.[baseLabel]

  if (!throwData) return { safe: true, margin: 30, marginLabel: 'no throw possible' }

  let outProb = baseOutProb(fielderArmScore, throwData.distanceTier)
  const speedDelta = (runnerSpeedScore - 60) / 100
  outProb -= speedDelta * 0.30
  outProb += leadTimeBonus

  // ±12% random variance — close calls genuinely uncertain
  const roll = (Math.random() - 0.5) * 0.24
  const finalProb = Math.max(0.01, Math.min(0.99, outProb + roll))

  const isOut = Math.random() < finalProb
  const margin = Math.round(Math.abs(finalProb - 0.5) * 100)
  const marginLabel = margin < 8 ? 'bang-bang'
                    : margin < 22 ? 'comfortable'
                    : 'not close'

  return { safe: !isOut, isOut, margin, marginLabel, throwData }
}

// ─── Scenario builder ──────────────────────────────────────────────────────────

/**
 * Build all runner advancement scenarios for an in-play ball.
 * This is the input to InPlayScene — what the player sees and decides.
 *
 * @param {object} params
 * @param {string}  params.fieldZone        — from resolveBallFlight
 * @param {object}  params.fielderCard       — primary fielder card (full object)
 * @param {boolean} params.fieldingSuccess   — did fielder catch/field the ball?
 * @param {string}  params.contact           — CONTACT tier
 * @param {string}  params.baseDifficulty    — 'routine'|'moderate'|'difficult'|'exceptional'
 * @param {object}  params.batterCard        — the batter's full card
 * @param {Array}   params.bases             — [null|{card}, null|{card}, null|{card}] (1B, 2B, 3B)
 * @returns {{ ballType, scenarios }}
 */
export function buildRunnerScenarios({
  fieldZone,
  fielderCard,
  fieldingSuccess,
  contact,
  baseDifficulty,
  batterCard,
  bases,
}) {
  const ballType    = getBallType(fieldZone)
  const fielderPos  = fielderCard?.position ?? fielderCard?.slot ?? 'CF'
  const fielderArm  = fielderCard?.tools?.arm ?? 60

  const [runner1B, runner2B, runner3B] = bases ?? [null, null, null]

  // Helper: build a scenario object
  function makeScenario({ id, runnerCard, fromBase, toBase, isForced = false, isBatterRunner = false,
                          isTagUp = false, requiresDecision, autoDecision = null, isDefiniteOut = false,
                          autoSafe = false }) {
    const leadBonus = getLeadTimeBonus({
      ballType,
      fieldDifficulty: baseDifficulty,
      isForced,
      runnerStartBase: fromBase ?? 0,
      isBatterRunner,
    })
    const speedScore = runnerCard?.tools?.speed ?? 60
    const armScore   = fielderArm

    const projection = isDefiniteOut
      ? { outProb: 95, outProbRaw: 0.95, label: 'OUT', throwData: null }
      : autoSafe
        ? { outProb: 5, outProbRaw: 0.05, label: 'SAFE', throwData: null }
        : projectThrow({ fielderPosition: fielderPos, fielderArmScore: armScore, toBase, runnerSpeedScore: speedScore, leadTimeBonus: leadBonus })

    const baseLabel = toBase === 0 ? 'Home' : `${toBase}B`
    const fromLabel = fromBase === null ? 'batter' : fromBase === 0 ? 'home' : `${fromBase}B`

    return {
      id,
      runnerCard,
      fromBase,
      toBase,
      baseLabel,
      fromLabel,
      isForced,
      isBatterRunner,
      isTagUp,
      requiresDecision,
      autoDecision,
      projection,
      leadTimeBonus: leadBonus,
      fielderPos,
      fielderArm: armScore,
      runnerSpeed: speedScore,
      isDefiniteOut,
      autoSafe,
    }
  }

  const scenarios = []

  // ────────────────────────────────────────────────────────────────────────────
  // GROUND BALL — FIELDED CLEANLY
  // ────────────────────────────────────────────────────────────────────────────
  if (fieldingSuccess && ballType === BALL_TYPE.GROUND) {
    // Runner on 3B: send/hold decision — is it worth trying to score?
    if (runner3B) {
      scenarios.push(makeScenario({
        id: 'runner_3B_to_home',
        runnerCard: runner3B.card,
        fromBase: 3, toBase: 0,
        isForced: false, requiresDecision: true,
      }))
    }
    // Runner on 2B: usually holds on a fielded ground ball
    if (runner2B) {
      scenarios.push(makeScenario({
        id: 'runner_2B_hold',
        runnerCard: runner2B.card,
        fromBase: 2, toBase: 2,
        isForced: false, requiresDecision: false, autoDecision: 'hold', autoSafe: true,
      }))
    }

    if (!runner1B) {
      // No force: fielder throws to 1B, batter likely out (unless slow fielder or fast batter)
      scenarios.push(makeScenario({
        id: 'batter_to_1B',
        runnerCard: batterCard,
        fromBase: null, toBase: 1,
        isForced: true, isBatterRunner: true, requiresDecision: false, autoDecision: 'send',
      }))
    } else {
      // Force play — runner on 1B must go to 2B
      scenarios.push(makeScenario({
        id: 'runner_1B_force_2B',
        runnerCard: runner1B.card,
        fromBase: 1, toBase: 2,
        isForced: true, requiresDecision: false, autoDecision: 'send',
      }))
      // Batter reaches 1B (defense took the force at 2B — no DP in v1)
      scenarios.push(makeScenario({
        id: 'batter_to_1B',
        runnerCard: batterCard,
        fromBase: null, toBase: 1,
        isForced: true, isBatterRunner: true, requiresDecision: false, autoDecision: 'send', autoSafe: true,
      }))
    }
    return scenarios
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GROUND BALL — NOT FIELDED (single through the infield)
  // ────────────────────────────────────────────────────────────────────────────
  if (!fieldingSuccess && ballType === BALL_TYPE.GROUND) {
    if (runner3B) {
      // Runner from 3rd scores easily on a ground ball through the infield
      scenarios.push(makeScenario({
        id: 'runner_3B_scores',
        runnerCard: runner3B.card,
        fromBase: 3, toBase: 0,
        isForced: false, requiresDecision: false, autoDecision: 'send', autoSafe: true,
      }))
    }
    if (runner2B) {
      // Send to score or hold at 3rd?
      scenarios.push(makeScenario({
        id: 'runner_2B_to_home',
        runnerCard: runner2B.card,
        fromBase: 2, toBase: 0,
        isForced: false, requiresDecision: true,
      }))
    }
    if (runner1B) {
      // Advance to 3rd or hold at 2nd?
      scenarios.push(makeScenario({
        id: 'runner_1B_to_3B',
        runnerCard: runner1B.card,
        fromBase: 1, toBase: 3,
        isForced: false, requiresDecision: true,
      }))
    }
    // Batter always reaches 1B on a ground ball single
    scenarios.push(makeScenario({
      id: 'batter_to_1B',
      runnerCard: batterCard,
      fromBase: null, toBase: 1,
      isForced: true, isBatterRunner: true, requiresDecision: false, autoDecision: 'send', autoSafe: true,
    }))
    return scenarios
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FLY BALL / LINER — CAUGHT
  // ────────────────────────────────────────────────────────────────────────────
  if (fieldingSuccess && (ballType === BALL_TYPE.FLY || ballType === BALL_TYPE.LINER)) {
    // Batter is out (no scenario needed for batter)

    if (runner3B) {
      // Tag up from 3rd — classic sacrifice fly opportunity
      scenarios.push(makeScenario({
        id: 'runner_3B_tag_home',
        runnerCard: runner3B.card,
        fromBase: 3, toBase: 0,
        isForced: false, isTagUp: true, requiresDecision: true,
      }))
    }
    if (runner2B && fieldZone?.startsWith('deep')) {
      // Tag from 2nd to 3rd on a deep fly ball only
      scenarios.push(makeScenario({
        id: 'runner_2B_tag_3B',
        runnerCard: runner2B.card,
        fromBase: 2, toBase: 3,
        isForced: false, isTagUp: true, requiresDecision: true,
      }))
    }
    // If no runners can tag, we still need at least one scenario to show the out
    if (scenarios.length === 0) {
      scenarios.push({
        id: 'batter_flyout',
        runnerCard: batterCard,
        fromBase: null, toBase: null,
        isForced: false, isBatterRunner: true, isTagUp: false,
        requiresDecision: false, autoDecision: 'out',
        projection: { outProb: 100, label: 'OUT', throwData: null },
        isDefiniteOut: true, autoSafe: false,
        fielderPos, fielderArm, runnerSpeed: batterCard?.tools?.speed ?? 60,
      })
    }
    return scenarios
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FLY BALL / LINER — NOT CAUGHT (outfield hit)
  // ────────────────────────────────────────────────────────────────────────────
  if (!fieldingSuccess && (ballType === BALL_TYPE.FLY || ballType === BALL_TYPE.LINER)) {
    const isDeep    = fieldZone?.startsWith('deep')
    const isShallow = fieldZone?.startsWith('shallow')

    if (runner3B) {
      scenarios.push(makeScenario({
        id: 'runner_3B_scores',
        runnerCard: runner3B.card,
        fromBase: 3, toBase: 0,
        isForced: false, requiresDecision: false, autoDecision: 'send', autoSafe: true,
      }))
    }
    if (runner2B) {
      if (isShallow) {
        // Shallow hit — can they score? Risky
        scenarios.push(makeScenario({
          id: 'runner_2B_to_home',
          runnerCard: runner2B.card,
          fromBase: 2, toBase: 0,
          isForced: false, requiresDecision: true,
        }))
      } else {
        // Deep hit — runner on 2B scores easily
        scenarios.push(makeScenario({
          id: 'runner_2B_scores',
          runnerCard: runner2B.card,
          fromBase: 2, toBase: 0,
          isForced: false, requiresDecision: false, autoDecision: 'send', autoSafe: true,
        }))
      }
    }
    if (runner1B) {
      const targetBase = isDeep ? 3 : 2
      scenarios.push(makeScenario({
        id: `runner_1B_to_${targetBase}B`,
        runnerCard: runner1B.card,
        fromBase: 1, toBase: targetBase,
        isForced: false, requiresDecision: isDeep,  // deep hit: decision to try for 3rd
        autoDecision: isDeep ? null : 'send',
      }))
    }
    // Batter: 1B (shallow) or attempt 2B (deep)
    const batterTarget = isDeep ? 2 : 1
    scenarios.push(makeScenario({
      id: 'batter_advance',
      runnerCard: batterCard,
      fromBase: null, toBase: batterTarget,
      isForced: true, isBatterRunner: true, requiresDecision: false, autoDecision: 'send', autoSafe: true,
    }))
    return scenarios
  }

  return scenarios
}

// ─── Scenario resolution ───────────────────────────────────────────────────────

/**
 * Apply player send/hold decisions, resolve all throws with randomness.
 * Returns the final game-state delta.
 *
 * @param {object[]} scenarios         — from buildRunnerScenarios
 * @param {object}   sendDecisions     — { [scenarioId]: 'send' | 'hold' }
 * @returns {{ runsScored, newBases, outsRecorded, plays }}
 *   newBases: [null|{card}, null|{card}, null|{card}]  (1B, 2B, 3B)
 *   plays:    [{id, safe, scores, held, marginLabel, runner}]
 */
export function resolveRunnerScenarios(scenarios, sendDecisions = {}) {
  let runsScored    = 0
  let outsRecorded  = 0
  const newBases    = [null, null, null]
  const plays       = []

  for (const s of scenarios) {
    // Determine effective decision
    const decision = s.requiresDecision
      ? (sendDecisions[s.id] ?? 'hold')
      : (s.autoDecision ?? 'hold')

    // Batter fly-out — mark out directly
    if (s.autoDecision === 'out' || s.isDefiniteOut) {
      outsRecorded++
      plays.push({ id: s.id, safe: false, scores: false, held: false, marginLabel: 'out', runner: s.runnerCard?.name ?? '?' })
      continue
    }

    // Hold: runner stays where they were
    if (decision === 'hold') {
      const baseIdx = s.fromBase !== null ? s.fromBase - 1 : -1
      if (baseIdx >= 0 && baseIdx <= 2) {
        newBases[baseIdx] = { card: s.runnerCard }
      }
      plays.push({ id: s.id, safe: true, scores: false, held: true, marginLabel: 'held', runner: s.runnerCard?.name ?? '?' })
      continue
    }

    // Send: resolve the throw
    if (s.autoSafe) {
      // No throw contest — runner is safe
      if (s.toBase === 0) {
        runsScored++
        plays.push({ id: s.id, safe: true, scores: true, held: false, marginLabel: 'not close', runner: s.runnerCard?.name ?? '?' })
      } else if (s.toBase !== null) {
        const baseIdx = s.toBase - 1
        if (baseIdx >= 0 && baseIdx <= 2) newBases[baseIdx] = { card: s.runnerCard }
        plays.push({ id: s.id, safe: true, scores: false, held: false, marginLabel: 'safe', runner: s.runnerCard?.name ?? '?' })
      }
      continue
    }

    // Contested throw
    const throwResult = resolveThrow({
      fielderPosition: s.fielderPos,
      fielderArmScore: s.fielderArm,
      toBase:          s.toBase,
      runnerSpeedScore: s.runnerSpeed,
      leadTimeBonus:   s.leadTimeBonus,
    })

    if (throwResult.isOut) {
      outsRecorded++
      plays.push({ id: s.id, safe: false, scores: false, held: false, marginLabel: throwResult.marginLabel, runner: s.runnerCard?.name ?? '?' })
    } else {
      if (s.toBase === 0) {
        runsScored++
        plays.push({ id: s.id, safe: true, scores: true, held: false, marginLabel: throwResult.marginLabel, runner: s.runnerCard?.name ?? '?' })
      } else if (s.toBase !== null) {
        const baseIdx = s.toBase - 1
        if (baseIdx >= 0 && baseIdx <= 2) newBases[baseIdx] = { card: s.runnerCard }
        plays.push({ id: s.id, safe: true, scores: false, held: false, marginLabel: throwResult.marginLabel, runner: s.runnerCard?.name ?? '?' })
      }
    }
  }

  return { runsScored, newBases, outsRecorded, plays }
}
