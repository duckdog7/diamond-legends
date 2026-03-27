/**
 * batterAI.js
 * AI batter guess logic — used when the player is pitching (bottom half).
 *
 * The AI guesses which zone and pitch type the player will throw,
 * weighted by the pitcher's remaining zone budget (with noise).
 */

const ZONE_KEYS = ['TL','TC','TR','ML','MC','MR','BL','BC','BR']

/**
 * AI batter makes a zone + type guess.
 *
 * @param {object} pitchState  — player pitcher's pitchState (remainingBudget, repertoire)
 * @param {object} count       — { balls, strikes }
 * @returns {{ zone: string, type: string }}
 */
export function selectAIBatterGuess(pitchState, count = { balls: 0, strikes: 0 }) {
  const repertoire = pitchState?.repertoire ?? ['FB']
  const rb         = pitchState?.remainingBudget ?? {}

  // ── Zone guess: weighted by remaining budget + randomness ───────────────────
  const zw = {}
  let totalZW = 0
  ZONE_KEYS.forEach(z => {
    const w = Math.max(0.1, (rb[z] ?? 1) * (0.35 + Math.random() * 0.65))
    zw[z] = w; totalZW += w
  })
  let guessZone = 'MC'
  let r = Math.random() * totalZW
  for (const [z, w] of Object.entries(zw)) {
    r -= w
    if (r <= 0) { guessZone = z; break }
  }

  // ── Type guess: count-weighted repertoire ───────────────────────────────────
  const tw = {}
  let totalTW = 0
  repertoire.forEach(t => {
    let w = 1.0
    if (t === 'FB') w = count.strikes === 0 ? 1.6 : 1.2
    else if (t === 'SL' || t === 'CB') w = count.strikes >= 2 ? 1.4 : 0.85
    else if (t === 'CH') w = count.balls === count.strikes ? 1.1 : 0.9
    tw[t] = w; totalTW += w
  })
  let guessType = repertoire[0]
  r = Math.random() * totalTW
  for (const [t, w] of Object.entries(tw)) {
    r -= w
    if (r <= 0) { guessType = t; break }
  }

  return { zone: guessZone, type: guessType }
}
