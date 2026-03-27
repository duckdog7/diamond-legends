/**
 * gameStore.js
 * Active at-bat state, count, score, inning, phase.
 * The live game loop state — resets each game.
 */

import { create } from 'zustand'
import { buildPitchState } from '../engine/pitchAI'
import { buildTokenState } from '../engine/tokens'
import {
  createAtBatState, stepAtBat, applyAtBatResult, getInningPhase,
} from '../engine/atBat'
import { OUTCOME } from '../engine/defenseResolver'

const MAX_INNINGS = 9

const EMPTY_HALF = { outs: 0, bases: [false, false, false], runs: 0 }

export const useGameStore = create((set, get) => ({
  // ── Game lifecycle ──────────────────────────────────────────────────────────
  status: 'idle',       // 'idle' | 'active' | 'game_over'

  // ── Lineup ─────────────────────────────────────────────────────────────────
  playerLineup:   [],   // 9 batter cards (player's team)
  playerPitcher:  null, // pitcher card
  aiLineup:       [],   // 9 batter cards (AI team)
  aiPitcher:      null, // pitcher card

  // ── Score / inning ─────────────────────────────────────────────────────────
  inning:   1,
  half:     'top',      // 'top' (away batting) | 'bottom' (home batting)
  score:    { home: 0, away: 0 },
  outs:     0,
  bases:    [false, false, false],
  phase:    'early',

  // ── Batter rotation ────────────────────────────────────────────────────────
  batterIdx: 0,         // index into active team's lineup

  // ── Engine state ───────────────────────────────────────────────────────────
  pitchState:  null,
  tokenState:  null,
  atBat:       null,

  // ── History ────────────────────────────────────────────────────────────────
  pitchLog:    [],      // all pitches this game
  gameLog:     [],      // [{ inning, half, batterName, result, runs }]

  // ── Actions ────────────────────────────────────────────────────────────────

  startGame({ playerLineup, playerPitcher, aiLineup, aiPitcher }) {
    const pitchState = buildPitchState(aiPitcher)
    const tokenState = buildTokenState({ battingStart: 6, pitchingStart: 6 })
    const batterCard = playerLineup[0]
    const defenseLineup = aiLineup

    const atBat = createAtBatState({
      batterCard,
      pitcherCard: aiPitcher,
      defenseLineup,
      pitchState,
      tokenState,
      inning: 1,
      half: 'top',
      runnersOn: false,
    })

    set({
      status: 'active',
      playerLineup, playerPitcher,
      aiLineup, aiPitcher,
      inning: 1, half: 'top',
      score: { home: 0, away: 0 },
      outs: 0, bases: [false, false, false],
      phase: 'early',
      batterIdx: 0,
      pitchState, tokenState, atBat,
      pitchLog: [], gameLog: [],
    })
  },

  /**
   * Resolve one pitch. Called by AtBatScene after the player submits their guess.
   */
  resolvePitch({ batterZoneGuess, batterTypeGuess, tokenEffects = {} }) {
    const { atBat, pitchLog } = get()
    if (!atBat || atBat.status === 'complete') return

    const nextAtBat = stepAtBat(atBat, { batterZoneGuess, batterTypeGuess, tokenEffects })
    const lastPitch = nextAtBat.pitchLog[nextAtBat.pitchLog.length - 1]

    set({
      atBat: nextAtBat,
      pitchLog: lastPitch ? [...pitchLog, lastPitch] : pitchLog,
    })
  },

  /**
   * Advance after an at-bat result (out, hit, walk, etc.).
   * Handles inning transitions, score updates, and starting the next at-bat.
   */
  advanceAfterResult() {
    const {
      atBat, inning, half, score, outs, bases,
      playerLineup, aiLineup, playerPitcher, aiPitcher,
      batterIdx, gameLog, pitchLog,
    } = get()

    if (!atBat || atBat.status !== 'complete') return

    const halfState = { outs, bases, runs: 0 }
    const updated   = applyAtBatResult(halfState, atBat)
    let newOuts     = updated.outs
    let newBases    = updated.bases
    let newScore    = { ...score }

    if (updated.runs > 0) {
      if (half === 'top') newScore.away += updated.runs
      else newScore.home += updated.runs
    }

    // Log the at-bat
    const entry = {
      inning, half,
      batterName: atBat.batterCard?.name ?? '?',
      result: atBat.result,
      runs: updated.runs,
    }

    // ── 3 outs: end of half-inning ────────────────────────────────────────────
    if (newOuts >= 3) {
      const newHalf   = half === 'top' ? 'bottom' : 'top'
      const newInning = half === 'bottom' ? inning + 1 : inning

      if (newInning > MAX_INNINGS) {
        set({ status: 'game_over', score: newScore, outs: 3, gameLog: [...gameLog, entry] })
        return
      }

      // New half: reset pitch state for new pitcher side, reset batting order for that team
      const newPitcher    = newHalf === 'top' ? aiPitcher : playerPitcher
      const battingLineup = newHalf === 'top' ? playerLineup : aiLineup
      const defenseLineup = newHalf === 'top' ? aiLineup : playerLineup
      const newPitchState = buildPitchState(newPitcher)
      const newTokenState = buildTokenState({ battingStart: 6, pitchingStart: 6 })
      const newBatterIdx  = 0
      const newBatterCard = battingLineup[newBatterIdx]
      const newPhase      = getInningPhase(newInning)

      const newAtBat = createAtBatState({
        batterCard: newBatterCard,
        pitcherCard: newPitcher,
        defenseLineup,
        pitchState: newPitchState,
        tokenState: newTokenState,
        inning: newInning, half: newHalf,
        runnersOn: false,
      })

      set({
        inning: newInning, half: newHalf, phase: newPhase,
        score: newScore,
        outs: 0, bases: [false, false, false],
        batterIdx: newBatterIdx,
        pitchState: newPitchState, tokenState: newTokenState, atBat: newAtBat,
        gameLog: [...gameLog, entry],
      })
      return
    }

    // ── Continue half-inning: next batter ─────────────────────────────────────
    const battingLineup = half === 'top' ? playerLineup : aiLineup
    const pitcher       = half === 'top' ? aiPitcher : playerPitcher
    const defenseLineup = half === 'top' ? aiLineup : playerLineup
    const nextBatterIdx = (batterIdx + 1) % battingLineup.length
    const nextBatter    = battingLineup[nextBatterIdx]
    const runnersOn     = newBases.some(Boolean)

    // Preserve pitch state within half-inning (budget carries over)
    const { pitchState, tokenState } = get()

    const newAtBat = createAtBatState({
      batterCard: nextBatter,
      pitcherCard: pitcher,
      defenseLineup,
      pitchState,
      tokenState,
      inning, half,
      runnersOn,
    })

    set({
      outs: newOuts, bases: newBases, score: newScore,
      batterIdx: nextBatterIdx,
      atBat: newAtBat,
      gameLog: [...gameLog, entry],
    })
  },

  resetGame() {
    set({
      status: 'idle',
      inning: 1, half: 'top', score: { home: 0, away: 0 },
      outs: 0, bases: [false, false, false], phase: 'early',
      batterIdx: 0,
      pitchState: null, tokenState: null, atBat: null,
      pitchLog: [], gameLog: [],
    })
  },
}))
