/**
 * tokens.js
 * Dual token pool system: batting tokens + pitching tokens.
 * Power-up tiers: Spark (1T), Boost (3T), Surge (6T), Blitz (10T).
 * GDD §6
 */

// ─── Power-up tiers ───────────────────────────────────────────────────────────

export const POWERUP = {
  SPARK: { id: 'spark', cost: 1, label: 'Spark',  description: 'Small boost. Expires after 3 innings.' },
  BOOST: { id: 'boost', cost: 3, label: 'Boost',  description: 'Medium boost.' },
  SURGE: { id: 'surge', cost: 6, label: 'Surge',  description: 'Large boost.' },
  BLITZ: { id: 'blitz', cost: 10, label: 'Blitz', description: 'Maximum boost.' },
}

// ─── Token effects ────────────────────────────────────────────────────────────

// Batting token effects (applied during at-bat)
export const BATTING_EFFECTS = {
  // Zone prediction aids
  hot_zone_reveal:     { cost: 2,  label: 'Hot Zone Reveal',     description: 'Reveals pitcher\'s top 3 tendency zones before guess.' },
  pitch_type_tip:      { cost: 3,  label: 'Pitch Type Tip',      description: '+1 die to contact pool if type prediction is correct.' },
  full_count_patience: { cost: 1,  label: 'Patience',            description: 'On a walk, gain +2 batting tokens.' },
  // Ball flight
  pull_shift:          { cost: 2,  label: 'Pull Shift',          description: 'Moves ball flight one zone toward pull side.' },
  oppo_push:           { cost: 2,  label: 'Oppo Push',           description: 'Moves ball flight one zone toward opposite field.' },
  gap_finder:          { cost: 4,  label: 'Gap Finder',          description: 'Forces ball to nearest gap zone. No infield contact.' },
  infield_in:          { cost: 3,  label: 'Infield In',          description: 'Converts shallow OF/infield to slow roller. Maximizes arm pressure.' },
  // Information
  scouting_report:     { cost: 10, label: 'Scouting Report',     description: 'Reveals reliever full tendency + pitch repertoire on entry. Negates info reset.' },
  extra_die:           { cost: 4,  label: 'Extra Die',           description: '+1 die to contact pool this at-bat.' },
}

// Pitching token effects
export const PITCHING_EFFECTS = {
  waste_pitch:         { cost: 1, label: 'Waste Pitch',    description: 'Pitch breaks out of zone — auto miss if batter chases.' },
  location_lock:       { cost: 3, label: 'Location Lock',  description: 'Pitch hits exactly intended zone regardless of arm score.' },
  strikeout_setup:     { cost: 2, label: 'K Setup',        description: '+15% effectiveness bonus on next pitch in strikeout count.' },
  zone_reset:          { cost: 5, label: 'Zone Reset',     description: 'Clear zone fatigue from one over-used zone.' },
  pitch_mix:           { cost: 2, label: 'Pitch Mix',      description: 'Conceal pitch type: batter\'s type tendency reveal is delayed 3 pitches.' },
}

// ─── Token pool state ─────────────────────────────────────────────────────────

/**
 * Build initial token state for a game.
 * @param {{ battingStart?: number, pitchingStart?: number }} opts
 * @returns {{ batting: TokenPool, pitching: TokenPool }}
 */
export function buildTokenState(opts = {}) {
  return {
    batting:  buildPool(opts.battingStart  ?? 6),
    pitching: buildPool(opts.pitchingStart ?? 6),
  }
}

function buildPool(startTokens) {
  return {
    total: startTokens,
    spent: 0,
    available: startTokens,
    history: [],   // [{ inning, half, effect, cost }]
  }
}

/**
 * Spend tokens from a pool.
 * @param {object} pool       — batting or pitching pool
 * @param {number} cost       — tokens to spend
 * @param {string} effectId   — which effect was used
 * @param {object} context    — { inning, half }
 * @returns {{ success: boolean, pool: object }}
 */
export function spendTokens(pool, cost, effectId, context = {}) {
  if (pool.available < cost) {
    return { success: false, pool }
  }
  pool.available -= cost
  pool.spent += cost
  pool.history.push({ ...context, effectId, cost })
  return { success: true, pool }
}

/**
 * Award tokens to a pool (e.g. after a strikeout, walk, or hit).
 * @param {object} pool
 * @param {number} amount
 * @param {string} reason
 * @returns {object} updated pool
 */
export function awardTokens(pool, amount, reason = '') {
  pool.available = Math.min(pool.available + amount, pool.total + 4) // soft cap: total + 4 overflow
  pool.total = Math.max(pool.total, pool.available)
  if (reason) pool.history.push({ awarded: amount, reason })
  return pool
}

/**
 * Earn tokens based on at-bat outcome.
 * Called after each at-bat completes.
 * @param {object} tokenState
 * @param {string} outcome     — OUTCOME constant
 * @param {string} side        — 'batting' | 'pitching'
 * @returns {object} updated tokenState
 */
export function earnTokensFromOutcome(tokenState, outcome, side) {
  const awards = {
    batting: {
      home_run:    3,
      double:      2,
      single:      1,
      walk:        1,
      double_play: 0,
      strikeout:   0,
      out:         0,
    },
    pitching: {
      strikeout:   3,
      double_play: 2,
      out:         1,
      walk:        0,
      single:      0,
      double:      0,
      home_run:    0,
    },
  }

  const amount = awards[side]?.[outcome] ?? 0
  if (amount > 0) {
    awardTokens(tokenState[side], amount, outcome)
  }
  return tokenState
}

/**
 * Check if a Spark power-up has expired (applied for only 3 innings).
 * @param {object} pool
 * @param {number} currentInning
 * @returns {boolean}
 */
export function isSparkExpired(pool, currentInning) {
  const spark = pool.history.find(h => h.effectId === 'spark')
  if (!spark) return false
  return (currentInning - (spark.inning ?? 1)) >= 3
}

/**
 * Get available power-ups the player can afford.
 * @param {object} pool
 * @returns {object[]} array of affordable POWERUP entries
 */
export function getAffordablePowerups(pool) {
  return Object.values(POWERUP).filter(p => p.cost <= pool.available)
}
