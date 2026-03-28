/**
 * AtBatScene.jsx
 * Full at-bat screen — three-column layout with GameDay-style pitch zone.
 *
 * Layout:
 *   [Box Score HUD — sticky top]
 *   [Line Score — inning breakdown]
 *   [Pitcher Panel] | [Zone Canvas + controls] | [Batter Panel]
 *   [Field View (1/3)] | [Stats Panel (2/3)]
 *
 * Props:
 *   lineup            object[]  — player's batting order (all 9)
 *   pitcherCard       object    — AI starting pitcher
 *   defenseLineup     object[]  — AI fielders
 *   playerPitcherCard object    — player's pitcher (used in bottom half)
 *   aiLineup          object[]  — AI batting order (used in bottom half)
 *   onGameEnd         fn({ score, log })
 */

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AtBatHUD from './AtBatHUD'
import BatterUpOverlay from './BatterUpOverlay'
import Card from './Card'
import PitcherPanel from './PitcherPanel'
import BatterPanel from './BatterPanel'
import FieldView from './FieldView'
import GameStatsPanel from './GameStatsPanel'
import ZoneCanvas, { PITCH_COLORS } from './ZoneCanvas'
import InPlayScene from './InPlayScene'
import { colors, fonts, fontSize, radius } from '../theme'
import {
  createAtBatState, stepAtBat, resumeAtBat, applyAtBatResult, getInningPhase,
} from '../engine/atBat'
import { buildPitchState } from '../engine/pitchAI'
import { selectAIBatterGuess } from '../engine/batterAI'
import { buildTokenState, spendTokens } from '../engine/tokens'
import { OUTCOME } from '../engine/defenseResolver'
import pitchTypesData from '../data/pitchTypes.json'
import { getTeamForEra } from '../engine/teamUtils'

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_INNINGS = 9

// Zone coord generator (mirrors pitchAI.js constants)
const ZONE_X = 20, ZONE_Y = 20, CELL_W = 60, CELL_H = 60

function coordForZone(zone) {
  const m   = 8
  const col = zone[1] === 'L' ? 0 : zone[1] === 'C' ? 1 : 2
  const row = zone[0] === 'T' ? 0 : zone[0] === 'M' ? 1 : 2
  return {
    x: ZONE_X + col * CELL_W + m + Math.random() * (CELL_W - m * 2),
    y: ZONE_Y + row * CELL_H + m + Math.random() * (CELL_H - m * 2),
  }
}

const PITCH_SHORT = {
  FB: 'Fastball', CB: 'Curveball', CH: 'Changeup',
  SL: 'Slider',   SK: 'Sinker',   CF: 'Cut FB',   KN: 'Knuckleball',
}

function describePlay(batterCard, result, lastPitch) {
  const raw  = batterCard?.name ?? ''
  const name = raw.split(' ').pop() || 'Batter'
  const pt   = PITCH_SHORT[lastPitch?.pitchType] ?? ''
  const pf   = lastPitch?.primaryFielder
  const fz   = lastPitch?.fieldZone ?? ''

  switch (result) {
    case OUTCOME.HOME_RUN:    return `${name} HOMERS!`
    case OUTCOME.TRIPLE:      return `${name} triples`
    case OUTCOME.DOUBLE:      return `${name} doubles${pt ? ` on ${pt}` : ''}`
    case OUTCOME.SINGLE:      return `${name} singles${pt ? ` on ${pt}` : ''}`
    case OUTCOME.WALK:        return `${name} draws a walk`
    case OUTCOME.STRIKEOUT:
      return lastPitch?.tookPitch ? `${name} called out` : `${name} strikes out`
    case OUTCOME.DOUBLE_PLAY:
      return `${name} grounds into DP${pf ? ` (${pf})` : ''}`
    case OUTCOME.OUT: {
      if (fz.includes('deep') || fz.includes('shallow'))
        return `${name} flies out${pf ? ` to ${pf}` : ''}`
      if (fz.includes('infield'))
        return `${name} grounds out${pf ? ` to ${pf}` : ''}`
      return `${name} out${pf ? ` (${pf})` : ''}`
    }
    case OUTCOME.ERROR:       return `Error — ${name} reaches`
    default:                  return `${name}: ${result}`
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = {
  screen: {
    minHeight:  '100vh',
    background: 'linear-gradient(160deg, #07091a 0%, #0c1028 50%, #080e20 100%)',
    display:    'flex',
    flexDirection: 'column',
    fontFamily: fonts.body,
    color:      '#fff',
  },
  screenPitching: {
    minHeight:  '100vh',
    background: 'linear-gradient(160deg, #100a04 0%, #1a1006 50%, #0e100e 100%)',
    display:    'flex',
    flexDirection: 'column',
    fontFamily: fonts.body,
    color:      '#fff',
  },
  main: {
    display:    'flex',
    gap:        '20px',
    padding:    '20px',
    flex:       1,
    alignItems: 'flex-start',
  },
  sidePanel: {
    width:      '260px',
    flexShrink: 0,
  },
  center: {
    flex:          1,
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '12px',
    minWidth:      '280px',
  },
  toggleRow: {
    display: 'flex',
    gap:     '8px',
  },
  toggleBtn: (active) => ({
    padding:      '6px 16px',
    borderRadius: radius.md,
    fontSize:     fontSize.xs,
    fontWeight:   900,
    letterSpacing:'0.1em',
    cursor:       'pointer',
    border:       `1px solid ${active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)'}`,
    background:   active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
    color:        active ? '#fff' : 'rgba(255,255,255,0.4)',
    fontFamily:   fonts.ui,
    transition:   'all 0.15s',
  }),
  halfBadge: (isPitching) => ({
    padding:      '6px 18px',
    borderRadius: radius.pill,
    fontSize:     fontSize.sm,
    fontWeight:   900,
    letterSpacing:'0.12em',
    fontFamily:   fonts.ui,
    border:       `1.5px solid ${isPitching ? 'rgba(251,191,36,0.6)' : 'rgba(96,165,250,0.6)'}`,
    background:   isPitching ? 'rgba(251,191,36,0.12)' : 'rgba(96,165,250,0.12)',
    color:        isPitching ? '#fbbf24' : '#60a5fa',
    boxShadow:    isPitching ? '0 0 18px rgba(251,191,36,0.18)' : '0 0 18px rgba(96,165,250,0.15)',
    textShadow:   isPitching ? '0 0 12px rgba(251,191,36,0.6)' : '0 0 12px rgba(96,165,250,0.5)',
  }),
  typeBtn: (selected, color) => ({
    padding:      '8px 16px',
    borderRadius: radius.md,
    fontSize:     fontSize.xs,
    fontWeight:   700,
    cursor:       'pointer',
    border:       `1px solid ${selected ? color : 'rgba(255,255,255,0.15)'}`,
    background:   selected ? `${color}28` : 'rgba(255,255,255,0.05)',
    color:        selected ? color : 'rgba(255,255,255,0.65)',
    fontFamily:   fonts.ui,
    letterSpacing:'0.05em',
    transition:   'all 0.12s',
    boxShadow:    selected ? `0 0 12px ${color}44` : 'none',
  }),
  actionBtn: (active) => ({
    padding:      '14px 52px',
    borderRadius: radius.lg,
    fontSize:     fontSize.md,
    fontWeight:   900,
    cursor:       active ? 'pointer' : 'not-allowed',
    border:       `1.5px solid ${active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
    background:   active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
    color:        active ? '#fff' : 'rgba(255,255,255,0.25)',
    letterSpacing:'0.12em',
    fontFamily:   fonts.ui,
    transition:   'all 0.15s',
    boxShadow:    active ? '0 0 20px rgba(255,255,255,0.12)' : 'none',
  }),
  throwBtn: (active) => ({
    padding:      '16px 60px',
    borderRadius: radius.lg,
    fontSize:     fontSize.lg,
    fontWeight:   900,
    cursor:       active ? 'pointer' : 'not-allowed',
    border:       `2px solid ${active ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.1)'}`,
    background:   active ? 'rgba(251,191,36,0.16)' : 'rgba(255,255,255,0.04)',
    color:        active ? '#fbbf24' : 'rgba(255,255,255,0.25)',
    letterSpacing:'0.14em',
    fontFamily:   fonts.ui,
    transition:   'all 0.15s',
    boxShadow:    active ? '0 0 32px rgba(251,191,36,0.28), 0 4px 16px rgba(0,0,0,0.5)' : 'none',
    textShadow:   active ? '0 0 16px rgba(251,191,36,0.7)' : 'none',
  }),
  takeBtn: {
    padding:      '14px 36px',
    borderRadius: radius.lg,
    fontSize:     fontSize.md,
    fontWeight:   900,
    cursor:       'pointer',
    border:       '1.5px solid rgba(148,163,184,0.4)',
    background:   'rgba(148,163,184,0.07)',
    color:        'rgba(148,163,184,0.85)',
    letterSpacing:'0.12em',
    fontFamily:   fonts.ui,
    transition:   'all 0.15s',
  },
  resultBanner: (result) => ({
    padding:      '12px 32px',
    borderRadius: radius.lg,
    background:   resultBg(result),
    border:       `1.5px solid ${resultBorder(result)}`,
    textAlign:    'center',
    minWidth:     '220px',
    boxShadow:    `0 0 24px ${resultBorder(result)}66`,
  }),
}

// ─── Build initial game state ─────────────────────────────────────────────────
function buildGameState(firstBatter, aiPitcherCard, aiDefenseLineup, playerPitcherCard) {
  const aiPitchState     = buildPitchState(aiPitcherCard)
  const playerPitchState = playerPitcherCard ? buildPitchState(playerPitcherCard) : buildPitchState({ pitchRepertoire: ['FB'], tools: { arm: 60 } })
  const tokenState       = buildTokenState({ battingStart: 6, pitchingStart: 6 })

  return {
    inning:           1,
    half:             'top',
    score:            { home: 0, away: 0 },
    halfStartScore:   { home: 0, away: 0 },
    inningScores:     { away: [], home: [] },
    outs:             0,
    bases:            [null, null, null],
    aiPitchState,       // persistent — accumulates all top-half pitches across innings
    playerPitchState,   // persistent — accumulates all bottom-half pitches across innings
    tokenState,
    atBat: createAtBatState({
      batterCard: firstBatter, pitcherCard: aiPitcherCard, defenseLineup: aiDefenseLineup,
      pitchState: aiPitchState, tokenState,
      inning: 1, half: 'top', runnersOn: false,
    }),
    aiPitchLog:     [],    // all pitches thrown by AI pitcher (top halves)
    playerPitchLog: [],    // all pitches thrown by player pitcher (bottom halves)
    atBatResults:   [],
    batterStats:    {},    // player batting stats { [batterId]: { ab, h, hr, bb, k } }
    aiBatterStats:  {},    // AI batting stats
    playLog:        [],
    lastPitchType:  null,
    lastResult:     null,
    status:         'guessing',
  }
}

// ─── Batter stat helpers ──────────────────────────────────────────────────────
function recordBatterStat(batterStats, batterCard, result) {
  const id = batterCard?.id
  if (!id || !result) return batterStats
  const prev = batterStats[id] ?? { ab: 0, h: 0, hr: 0, bb: 0, k: 0 }
  const isHit  = [OUTCOME.SINGLE, OUTCOME.DOUBLE, OUTCOME.TRIPLE, OUTCOME.HOME_RUN].includes(result)
  const isWalk = result === OUTCOME.WALK
  const isK    = result === OUTCOME.STRIKEOUT
  const isHR   = result === OUTCOME.HOME_RUN
  return {
    ...batterStats,
    [id]: {
      ab: isWalk ? prev.ab : prev.ab + 1,
      h:  isHit  ? prev.h  + 1 : prev.h,
      hr: isHR   ? prev.hr + 1 : prev.hr,
      bb: isWalk ? prev.bb + 1 : prev.bb,
      k:  isK    ? prev.k  + 1 : prev.k,
    },
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AtBatScene({
  lineup = [], pitcherCard, defenseLineup = [],
  playerPitcherCard, aiLineup = [],
  onGameEnd,
}) {
  const safeLineup   = lineup.length   > 0 ? lineup   : [{}]
  const safeAILineup = aiLineup.length > 0 ? aiLineup : [{}]

  const [game, setGame]             = useState(() => buildGameState(safeLineup[0], pitcherCard, defenseLineup, playerPitcherCard))
  const [batterIdx, setBatterIdx]   = useState(0)
  const [aiBatterIdx, setAiBatterIdx] = useState(0)
  const [guessCoord, setGuessCoord] = useState(null)
  const [guessZone, setGuessZone]   = useState(null)
  const [guessType, setGuessType]   = useState(null)
  const [resultVisible, setResultVisible] = useState(false)
  const [activeTokenEffects, setActiveTokenEffects] = useState({})
  const [overlayMode, setOverlayMode] = useState('pitcher')
  const [showBatterUp, setShowBatterUp] = useState(true)

  // ── Derived ───────────────────────────────────────────────────────────────
  const isPitching       = game.half === 'bottom'
  const batterCard       = safeLineup[batterIdx % safeLineup.length]
  const aiBatterCard     = safeAILineup[aiBatterIdx % safeAILineup.length]
  const currentBatter    = isPitching ? aiBatterCard : batterCard
  const activePitcher    = isPitching ? playerPitcherCard : pitcherCard
  const activeDefense    = isPitching ? safeLineup : defenseLineup
  const activePitchState = isPitching ? game.playerPitchState : game.aiPitchState
  const activePitchLog   = isPitching ? game.playerPitchLog  : game.aiPitchLog
  const activeRepertoire = activePitcher?.pitchRepertoire ?? ['FB']
  const phase            = getInningPhase(game.inning)
  const nextBatterCard   = safeLineup[(batterIdx + 1) % safeLineup.length]
  const nextBatterStats  = game.batterStats?.[nextBatterCard?.id] ?? null

  // Derive team identities for HUD display (fixed: player=away, AI=home)
  const awayTeam = useMemo(() =>
    getTeamForEra(safeLineup[0]?.franchiseId, safeLineup[0]?.era) ?? null,
  [safeLineup])
  const homeTeam = useMemo(() =>
    getTeamForEra(pitcherCard?.franchiseId, pitcherCard?.era) ?? null,
  [pitcherCard])

  // ── Zone canvas click ─────────────────────────────────────────────────────
  function handleGuess(coord, zone) {
    if (resultVisible) return
    setGuessCoord(coord)
    setGuessZone(zone)
  }

  // ── Token spending (batting only) ─────────────────────────────────────────
  function handleSpendToken(effectId, cost) {
    if (isPitching) return
    const updated = { ...game }
    const { success } = spendTokens(updated.tokenState.batting, cost, effectId, {
      inning: game.inning, half: game.half,
    })
    if (!success) return
    setActiveTokenEffects(prev => ({ ...prev, [effectId]: true }))
    setGame(updated)
  }

  // ── Take pitch — batting mode only ────────────────────────────────────────
  function commitTake() {
    if (resultVisible || game.status !== 'guessing' || isPitching) return
    const nextAtBat  = stepAtBat(game.atBat, { take: true })
    const lastPitch  = nextAtBat.pitchLog[nextAtBat.pitchLog.length - 1]
    setGame(prev => ({
      ...prev,
      atBat:         nextAtBat,
      lastPitchType: lastPitch?.pitchType ?? null,
      lastResult:    nextAtBat.result,
      aiPitchLog:    [...prev.aiPitchLog, lastPitch],
      status:        nextAtBat.status === 'complete' ? 'result' : 'guessing',
    }))
    setResultVisible(true)
  }

  // ── Throw pitch — pitching mode ───────────────────────────────────────────
  function commitThrow() {
    if (!guessZone || !guessType || game.status !== 'guessing' || !isPitching) return

    const aiGuess   = selectAIBatterGuess(game.playerPitchState, game.atBat.count)
    const nextAtBat = stepAtBat(game.atBat, {
      batterZoneGuess: aiGuess.zone,
      batterTypeGuess: aiGuess.type,
      guessCoord: null,
      pitcherZone: guessZone,
      pitcherType: guessType,
      tokenEffects: {},
    })

    const lastPitch = nextAtBat.pitchLog[nextAtBat.pitchLog.length - 1]
    // Fix coord to match the player's actual target zone
    if (lastPitch && guessZone) lastPitch.coord = coordForZone(guessZone)

    if (nextAtBat.status === 'in_play') {
      setGame(prev => ({
        ...prev,
        atBat:          nextAtBat,
        lastPitchType:  lastPitch?.pitchType ?? null,
        lastResult:     null,
        playerPitchLog: [...prev.playerPitchLog, lastPitch],
        status:         'in_play',
      }))
      setGuessCoord(null)
      setGuessZone(null)
      setGuessType(null)
      return
    }

    setGame(prev => ({
      ...prev,
      atBat:          nextAtBat,
      lastPitchType:  lastPitch?.pitchType ?? null,
      lastResult:     nextAtBat.result,
      playerPitchLog: [...prev.playerPitchLog, lastPitch],
      status:         nextAtBat.status === 'complete' ? 'result' : 'guessing',
    }))
    setResultVisible(true)
    setGuessCoord(null)
    setGuessZone(null)
    setGuessType(null)
  }

  // ── Commit pitch guess — batting mode ─────────────────────────────────────
  const commitGuess = useCallback(() => {
    if (!guessZone || !guessType || game.status !== 'guessing' || isPitching) return

    const tokenEffects = {
      pullShift: activeTokenEffects.pull_shift  ?? false,
      oppoPush:  activeTokenEffects.oppo_push   ?? false,
      gapFinder: activeTokenEffects.gap_finder  ?? false,
      infieldIn: activeTokenEffects.infield_in  ?? false,
      extraDie:  activeTokenEffects.extra_die   ?? false,
    }

    const nextAtBat = stepAtBat(game.atBat, {
      batterZoneGuess: guessZone,
      batterTypeGuess: guessType,
      guessCoord,
      tokenEffects,
    })

    const lastPitch = nextAtBat.pitchLog[nextAtBat.pitchLog.length - 1]

    if (nextAtBat.status === 'in_play') {
      setGame(prev => ({
        ...prev,
        atBat:         nextAtBat,
        lastPitchType: lastPitch?.pitchType ?? null,
        lastResult:    null,
        aiPitchLog:    [...prev.aiPitchLog, lastPitch],
        status:        'in_play',
      }))
      setActiveTokenEffects({})
      setGuessCoord(null)
      setGuessZone(null)
      setGuessType(null)
      return
    }

    setGame(prev => ({
      ...prev,
      atBat:         nextAtBat,
      lastPitchType: lastPitch?.pitchType ?? null,
      lastResult:    nextAtBat.result,
      aiPitchLog:    [...prev.aiPitchLog, lastPitch],
      status:        nextAtBat.status === 'complete' ? 'result' : 'guessing',
    }))
    setResultVisible(true)
    setActiveTokenEffects({})
    setGuessCoord(null)
    setGuessZone(null)
    setGuessType(null)
  }, [guessZone, guessType, guessCoord, game, activeTokenEffects, isPitching])

  // ── In-play resolution — called by InPlayScene when player commits decisions ─
  function handleInPlayResolve(sendDecisions) {
    const completedAtBat = resumeAtBat(game.atBat, sendDecisions)
    const lastPitch      = completedAtBat.pitchLog[completedAtBat.pitchLog.length - 1]
    const patchLog = (log) => log.map((p, i) =>
      i === log.length - 1 ? { ...p, outcome: completedAtBat.result } : p
    )
    setGame(prev => ({
      ...prev,
      atBat:          completedAtBat,
      lastPitchType:  lastPitch?.pitchType ?? null,
      lastResult:     completedAtBat.result,
      aiPitchLog:     isPitching ? prev.aiPitchLog     : patchLog(prev.aiPitchLog),
      playerPitchLog: isPitching ? patchLog(prev.playerPitchLog) : prev.playerPitchLog,
      status: 'result',
    }))
    setResultVisible(true)
  }

  // ── Advance after result ──────────────────────────────────────────────────
  function advanceAfterResult() {
    setResultVisible(false)
    const result = game.lastResult
    if (!result) return   // mid-at-bat ball/strike — just unblock

    const halfState = { outs: game.outs, bases: game.bases, runs: 0 }
    const updated   = applyAtBatResult(halfState, game.atBat)

    let newOuts  = updated.outs
    let newBases = updated.bases
    let newScore = { ...game.score }

    if (updated.runs > 0) {
      if (game.half === 'top') newScore.away += updated.runs
      else                     newScore.home += updated.runs
    }

    // Record stats + play log — get last pitch from the completed at-bat's own log
    const lastPitch      = game.atBat.pitchLog[game.atBat.pitchLog.length - 1]
    const newBatterStats   = isPitching ? game.batterStats   : recordBatterStat(game.batterStats,   batterCard,   result)
    const newAiBatterStats = isPitching ? recordBatterStat(game.aiBatterStats, aiBatterCard, result) : game.aiBatterStats
    const newPlayLog = [...game.playLog, describePlay(currentBatter, result, lastPitch)].slice(-8)
    const newAtBatResults = [...game.atBatResults, result]

    // Next batter indices
    const nextPlayerIdx = isPitching ? batterIdx   : (batterIdx   + 1) % safeLineup.length
    const nextAIIdx     = isPitching ? (aiBatterIdx + 1) % safeAILineup.length : aiBatterIdx

    // ── 3 outs — flip half or advance inning ─────────────────────────────
    if (newOuts >= 3) {
      const newHalf   = game.half === 'top' ? 'bottom' : 'top'
      const newInning = game.half === 'bottom' ? game.inning + 1 : game.inning

      const runsThisHalf = game.half === 'top'
        ? newScore.away - game.halfStartScore.away
        : newScore.home - game.halfStartScore.home

      const newIS = {
        away: [...game.inningScores.away],
        home: [...game.inningScores.home],
      }
      if (game.half === 'top') newIS.away[game.inning - 1] = runsThisHalf
      else                     newIS.home[game.inning - 1] = runsThisHalf

      if (newInning > MAX_INNINGS) {
        setGame(prev => ({
          ...prev,
          score: newScore, inningScores: newIS,
          batterStats: newBatterStats, aiBatterStats: newAiBatterStats,
          status: 'game_over',
        }))
        return
      }

      // Baseball rule: if home team leads after top of 9th (or later), skip bottom half
      if (game.half === 'top' && game.inning >= MAX_INNINGS && newScore.home > newScore.away) {
        setGame(prev => ({
          ...prev,
          score: newScore, inningScores: newIS,
          batterStats: newBatterStats, aiBatterStats: newAiBatterStats,
          status: 'game_over',
        }))
        return
      }

      // Determine setup for new half — reuse existing (persistent) pitch states
      const newHalfPitcher    = newHalf === 'bottom' ? playerPitcherCard  : pitcherCard
      const newHalfDefense    = newHalf === 'bottom' ? safeLineup          : defenseLineup
      const newHalfPitchState = newHalf === 'bottom' ? game.playerPitchState : game.aiPitchState
      const newHalfBatter     = newHalf === 'bottom'
        ? safeAILineup[nextAIIdx % safeAILineup.length]
        : safeLineup[nextPlayerIdx % safeLineup.length]

      const newTokenState = buildTokenState({ battingStart: 6, pitchingStart: 6 })
      const newAtBat = createAtBatState({
        batterCard: newHalfBatter, pitcherCard: newHalfPitcher,
        defenseLineup: newHalfDefense,
        pitchState: newHalfPitchState, tokenState: newTokenState,
        inning: newInning, half: newHalf, runnersOn: false,
      })

      // Switch overlay to match new role, show batter-up reveal
      setOverlayMode(newHalf === 'bottom' ? 'batter' : 'pitcher')
      setShowBatterUp(true)
      setBatterIdx(nextPlayerIdx)
      setAiBatterIdx(nextAIIdx)
      setGame(prev => ({
        ...prev,
        inning: newInning, half: newHalf,
        score: newScore, halfStartScore: { ...newScore },
        inningScores: newIS,
        outs: 0, bases: [null, null, null],
        tokenState: newTokenState,
        atBat: newAtBat,
        atBatResults: newAtBatResults,
        batterStats: newBatterStats, aiBatterStats: newAiBatterStats,
        playLog: newPlayLog, lastResult: null, status: 'guessing',
      }))
      return
    }

    // ── Continue same half — next batter ──────────────────────────────────
    const runnersOn   = newBases.some(Boolean)
    const nextBatter  = isPitching
      ? safeAILineup[nextAIIdx % safeAILineup.length]
      : safeLineup[nextPlayerIdx % safeLineup.length]
    const newAtBat = createAtBatState({
      batterCard: nextBatter,
      pitcherCard:  activePitcher,
      defenseLineup: activeDefense,
      pitchState:   activePitchState,
      tokenState:   game.tokenState,
      inning: game.inning, half: game.half, runnersOn,
      bases: newBases,
    })

    setShowBatterUp(true)
    setBatterIdx(nextPlayerIdx)
    setAiBatterIdx(nextAIIdx)
    setGame(prev => ({
      ...prev,
      outs: newOuts, bases: newBases, score: newScore,
      atBat: newAtBat,
      atBatResults: newAtBatResults,
      batterStats: newBatterStats, aiBatterStats: newAiBatterStats,
      playLog: newPlayLog, lastResult: null, status: 'guessing',
    }))
  }

  // ── Game over ─────────────────────────────────────────────────────────────
  if (game.status === 'game_over') {
    return <GameOverScreen score={game.score} onDone={() => onGameEnd?.(game)} />
  }

  const canAction = !resultVisible && !!guessZone && !!guessType

  return (
    <div style={isPitching ? STYLES.screenPitching : STYLES.screen}>
      {/* ── Box score strip ─────────────────────────────────────────────────── */}
      <AtBatHUD
        count={game.atBat.count}
        outs={game.outs}
        inning={game.inning}
        half={game.half}
        score={game.score}
        bases={game.bases}
        lastPitchType={resultVisible ? game.lastPitchType : null}
        phase={phase}
        isPitching={isPitching}
        awayTeam={awayTeam}
        homeTeam={homeTeam}
        inningScores={game.inningScores}
      />

      {/* ── Three-column main area ───────────────────────────────────────────── */}
      <div style={STYLES.main}>

        {/* Left — AWAY (player's team) panel — fixed, never swaps */}
        <div style={{
          ...STYLES.sidePanel,
          borderRadius: '10px',
          background:   awayTeam?.primary ? `${awayTeam.primary}18` : 'transparent',
          border:       awayTeam?.primary ? `1px solid ${awayTeam.primary}35` : '1px solid transparent',
          overflow:     'hidden',
        }}>
          <RoleBanner
            isBatting={!isPitching}
            teamName={awayTeam?.name ?? 'AWAY'}
            teamColor={awayTeam?.secondary ?? '#fff'}
            teamBg={awayTeam?.primary ?? '#1a2040'}
          />
          {isPitching ? (
            <PitcherPanel
              card={playerPitcherCard}
              pitchState={game.playerPitchState}
              pitchLog={game.playerPitchLog}
            />
          ) : (
            <BatterPanel
              card={batterCard}
              tokenState={game.tokenState}
              atBatResults={game.atBatResults}
              pitchesSeen={game.aiPitchLog.length}
              onSpendToken={handleSpendToken}
              phase={phase}
              showTokens={!resultVisible}
            />
          )}
          {/* Up Next — only shown when player is batting */}
          {!isPitching && nextBatterCard && (
            <OnDeckBatter card={nextBatterCard} stats={nextBatterStats} />
          )}
        </div>

        {/* Center — zone + controls */}
        <div style={{
          ...STYLES.center,
          ...(isPitching ? {
            padding:      '16px',
            borderRadius: '12px',
            background:   'rgba(251,191,36,0.03)',
            border:       '1px solid rgba(251,191,36,0.12)',
          } : {}),
        }}>

          {/* Role badge + overlay toggle */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={STYLES.halfBadge(isPitching)}>
              {isPitching ? '⚡ YOU ARE PITCHING' : '🏏 YOU ARE BATTING'}
            </div>
          </div>

          <div style={STYLES.toggleRow}>
            <button style={STYLES.toggleBtn(overlayMode === 'pitcher')}
              onClick={() => setOverlayMode('pitcher')}>
              PITCHER ZONES
            </button>
            <button style={STYLES.toggleBtn(overlayMode === 'batter')}
              onClick={() => setOverlayMode('batter')}>
              BATTER ZONES
            </button>
          </div>

          {/* Pitch count badge */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '10px',
            background:   isPitching ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.05)',
            border:       `1px solid ${isPitching ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: radius.pill,
            padding:      '6px 22px',
          }}>
            <div style={{ fontSize: fontSize.xxs, color: colors.text.label, letterSpacing: '0.16em', fontFamily: fonts.ui }}>
              PITCHES
            </div>
            <div style={{ fontSize: fontSize.xl, fontWeight: 900, color: isPitching ? '#fbbf24' : '#fff', fontFamily: fonts.ui, lineHeight: 1 }}>
              {activePitchState.totalPitches}
            </div>
            <div style={{ fontSize: fontSize.xxs, color: colors.text.muted, fontFamily: fonts.ui }}>
              / {activePitchState.maxPitches}
            </div>
          </div>

          {/* Zone canvas — hidden during in-play */}
          {game.status !== 'in_play' && (
            <ZoneCanvas
              mode={resultVisible ? 'view' : 'guess'}
              selectedCoord={guessCoord}
              onGuess={handleGuess}
              pitchLog={activePitchLog}
              highlightLast={resultVisible && activePitchLog.length > 0}
              overlayMode={overlayMode}
              pitchState={activePitchState}
              pitcherCard={activePitcher}
              batterCard={currentBatter}
              disabled={resultVisible}
              blockDepletedZones={isPitching}
            />
          )}

          {/* In-play scene — replaces zone canvas */}
          {game.status === 'in_play' && game.atBat.inPlayData && (
            <InPlayScene
              inPlayData={game.atBat.inPlayData}
              currentBases={game.bases}
              onResolve={handleInPlayResolve}
            />
          )}

          {/* Instruction label */}
          {game.status !== 'in_play' && (
            <div style={{
              fontSize: fontSize.xs, color: colors.text.label, letterSpacing: '0.12em',
              fontFamily: fonts.ui,
            }}>
              {resultVisible
                ? 'PITCH LOCATION'
                : isPitching
                  ? 'SELECT TARGET ZONE · CHOOSE PITCH TYPE · THROW'
                  : 'CLICK ZONE · SELECT PITCH TYPE · SWING'}
            </div>
          )}

          {/* Result banner */}
          <AnimatePresence>
            {resultVisible && (() => {
              const lp      = game.atBat.pitchLog[game.atBat.pitchLog.length - 1]
              const wasTake = lp?.tookPitch === true
              const midAt   = !game.lastResult

              // Mid-at-bat take (BALL / CALLED STRIKE)
              if (wasTake && midAt) {
                const isBall  = !lp.isInZone
                const label   = isBall ? '⚪  BALL' : '⚡  CALLED STRIKE'
                const color   = isBall ? '#60a5fa' : '#f59e0b'
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.82, y: -10 }}
                    animate={{ opacity: 1, scale: 1,    y: 0   }}
                    exit={{   opacity: 0, scale: 0.9,   y: -6  }}
                    style={{ padding: '12px 32px', borderRadius: radius.lg, textAlign: 'center',
                             background: `${color}16`, border: `1.5px solid ${color}55`, minWidth: '220px',
                             boxShadow: `0 0 20px ${color}40` }}
                  >
                    <div style={{ fontSize: fontSize.xl, fontWeight: 900, letterSpacing: '0.06em',
                                  fontFamily: fonts.ui, color, textShadow: `0 0 14px ${color}80` }}>{label}</div>
                    <div style={{ fontSize: fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: '4px',
                                  fontFamily: fonts.ui }}>
                      {lp.pitchType} — COUNT {game.atBat.count.balls}-{game.atBat.count.strikes}
                    </div>
                  </motion.div>
                )
              }

              // Mid-at-bat throw (pitching mode — ball or called strike to AI)
              if (isPitching && midAt) {
                const isInZ   = lp?.isInZone ?? true
                const label   = isInZ ? '⚡  STRIKE' : '⚪  BALL'
                const color   = isInZ ? '#f59e0b' : '#60a5fa'
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.82, y: -10 }}
                    animate={{ opacity: 1, scale: 1,    y: 0   }}
                    exit={{   opacity: 0, scale: 0.9,   y: -6  }}
                    style={{ padding: '12px 32px', borderRadius: radius.lg, textAlign: 'center',
                             background: `${color}16`, border: `1.5px solid ${color}55`, minWidth: '220px',
                             boxShadow: `0 0 20px ${color}40` }}
                  >
                    <div style={{ fontSize: fontSize.xl, fontWeight: 900, letterSpacing: '0.06em',
                                  fontFamily: fonts.ui, color, textShadow: `0 0 14px ${color}80` }}>{label}</div>
                    <div style={{ fontSize: fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: '4px',
                                  fontFamily: fonts.ui }}>
                      {lp?.pitchType} — COUNT {game.atBat.count.balls}-{game.atBat.count.strikes}
                    </div>
                  </motion.div>
                )
              }

              if (!game.lastResult) return null

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.78, y: -12 }}
                  animate={{ opacity: 1, scale: 1,    y: 0   }}
                  exit={{   opacity: 0, scale: 0.88,  y: -8  }}
                  style={STYLES.resultBanner(game.lastResult)}
                >
                  <div style={{ fontSize: fontSize['2xl'], fontWeight: 900, letterSpacing: '0.06em',
                                fontFamily: fonts.ui, textShadow: `0 0 20px ${resultBorder(game.lastResult)}` }}>
                    {resultLabel(game.lastResult, lp)}
                  </div>
                  {lp && (
                    <div style={{ fontSize: fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontFamily: fonts.ui }}>
                      {lp.predictionResult?.replace(/_/g, ' ')}
                    </div>
                  )}
                </motion.div>
              )
            })()}
          </AnimatePresence>

          {/* Pitch / throw type selector */}
          {!resultVisible && game.status !== 'in_play' && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {activeRepertoire.map(typeId => {
                const typeData = pitchTypesData.find(p => p.id === typeId)
                const selected = guessType === typeId
                const color    = PITCH_COLORS[typeId] ?? '#fff'
                return (
                  <motion.button
                    key={typeId}
                    onClick={() => setGuessType(typeId)}
                    whileTap={{ scale: 0.94 }}
                    style={STYLES.typeBtn(selected, color)}
                  >
                    {typeId} · {typeData?.name ?? typeId}
                  </motion.button>
                )
              })}
            </div>
          )}

          {/* Active token effects (batting only) */}
          {!isPitching && game.status !== 'in_play' && Object.keys(activeTokenEffects).length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {Object.keys(activeTokenEffects).map(e => (
                <div key={e} style={{
                  fontSize: fontSize.xs, padding: '4px 10px',
                  background: 'rgba(100,200,100,0.15)',
                  border: '1px solid rgba(100,200,100,0.4)',
                  borderRadius: radius.pill, color: '#86efac',
                  fontWeight: 700, letterSpacing: '0.08em', fontFamily: fonts.ui,
                }}>
                  {e.replace(/_/g, ' ').toUpperCase()}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons — hidden during in-play (InPlayScene has its own Resolve button) */}
          {game.status !== 'in_play' && (
            resultVisible ? (
              <motion.button
                onClick={advanceAfterResult}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                style={STYLES.actionBtn(true)}
              >
                NEXT →
              </motion.button>
            ) : isPitching ? (
              <motion.button
                onClick={commitThrow}
                disabled={!canAction}
                whileHover={canAction ? { scale: 1.03 } : {}}
                whileTap={canAction ? { scale: 0.96 } : {}}
                style={STYLES.throwBtn(canAction)}
              >
                THROW
              </motion.button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <motion.button
                  onClick={commitTake}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                  style={STYLES.takeBtn}
                  title="Watch pitch without swinging"
                >
                  Take
                </motion.button>
                <motion.button
                  onClick={commitGuess}
                  disabled={!canAction}
                  whileHover={canAction ? { scale: 1.03 } : {}}
                  whileTap={canAction ? { scale: 0.96 } : {}}
                  style={STYLES.actionBtn(canAction)}
                >
                  Swing
                </motion.button>
              </div>
            )
          )}
        </div>

        {/* Right — HOME (AI's team) panel — fixed, never swaps */}
        <div style={{
          ...STYLES.sidePanel,
          borderRadius: '10px',
          background:   homeTeam?.primary ? `${homeTeam.primary}18` : 'transparent',
          border:       homeTeam?.primary ? `1px solid ${homeTeam.primary}35` : '1px solid transparent',
          overflow:     'hidden',
        }}>
          <RoleBanner
            isBatting={isPitching}
            teamName={homeTeam?.name ?? 'HOME'}
            teamColor={homeTeam?.secondary ?? '#fff'}
            teamBg={homeTeam?.primary ?? '#1a2040'}
          />
          {isPitching ? (
            <BatterPanel
              card={aiBatterCard}
              tokenState={game.tokenState}
              atBatResults={game.atBatResults}
              pitchesSeen={game.playerPitchLog.length}
              onSpendToken={() => {}}
              phase={phase}
              showTokens={false}
            />
          ) : (
            <PitcherPanel
              card={pitcherCard}
              pitchState={game.aiPitchState}
              pitchLog={game.aiPitchLog}
            />
          )}
        </div>
      </div>

      {/* ── Bottom panel: field (1/3) + stats (2/3) ─────────────────────────── */}
      <div style={{
        display:    'flex',
        height:     '340px',
        flexShrink: 0,
        borderTop:  '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.45)',
        overflow:   'hidden',
      }}>
        <div style={{ width: '33%', flexShrink: 0 }}>
          <FieldView
            bases={game.bases}
            defenseLineup={activeDefense}
            pitcherCard={activePitcher}
            playLog={game.playLog}
          />
        </div>
        <GameStatsPanel
          key={`${game.half}-stats`}
          lineup={isPitching ? safeAILineup : safeLineup}
          batterStats={isPitching ? game.aiBatterStats : game.batterStats}
          currentBatterIdx={isPitching ? aiBatterIdx % safeAILineup.length : batterIdx % safeLineup.length}
          pitcherCard={activePitcher}
          pitchState={activePitchState}
          half={game.half}
        />
      </div>

      {/* ── Batter-up VS overlay ──────────────────────────────────────────────── */}
      <BatterUpOverlay
        visible={showBatterUp}
        batterCard={currentBatter}
        pitcherCard={activePitcher}
        isPitching={isPitching}
        onDismiss={() => setShowBatterUp(false)}
      />
    </div>
  )
}

// ─── On-deck batter strip — card stack + name/stats ──────────────────────────
function OnDeckBatter({ card, stats }) {
  if (!card?.id) return null

  const ab  = stats?.ab ?? 0
  const h   = stats?.h  ?? 0
  const hr  = stats?.hr ?? 0
  const bb  = stats?.bb ?? 0
  const statLine = ab > 0
    ? `${h}-${ab}${hr > 0 ? `, ${hr} HR` : ''}${bb > 0 ? `, ${bb} BB` : ''}`
    : 'No AB yet'

  // Card sm = 150×210; slivers = 9px each
  const CW = 150, CH = 210, SLIVER = 9

  return (
    <div style={{
      marginTop:   '8px',
      padding:     '8px 12px',
      background:  'rgba(255,255,255,0.04)',
      borderTop:   '1px solid rgba(255,255,255,0.08)',
      borderRadius:'0 0 8px 8px',
    }}>
      <div style={{
        fontSize:      '0.58rem',
        fontWeight:    900,
        letterSpacing: '0.14em',
        color:         'rgba(255,255,255,0.35)',
        fontFamily:    'Arial Black, Arial, sans-serif',
        marginBottom:  '8px',
      }}>
        ON DECK
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Card stack — top card fully visible, 2 ghost backs peeking below */}
        <div style={{
          position:   'relative',
          width:       CW,
          height:      CH + SLIVER * 2,
          flexShrink:  0,
        }}>
          {/* Ghost card 3 (deepest) */}
          <div style={{
            position:     'absolute', top: SLIVER * 2, left: 3, zIndex: 1,
            width:         CW - 6, height: CH,
            borderRadius:  '7px',
            background:    'linear-gradient(160deg, #1a1a2e, #0d0d1a)',
            border:        '1px solid rgba(255,255,255,0.06)',
          }}/>
          {/* Ghost card 2 */}
          <div style={{
            position:     'absolute', top: SLIVER, left: 1, zIndex: 2,
            width:         CW - 2, height: CH,
            borderRadius:  '8px',
            background:    'linear-gradient(160deg, #1e1e36, #111124)',
            border:        '1px solid rgba(255,255,255,0.10)',
          }}/>
          {/* Top card — actual next batter */}
          <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 3 }}>
            <Card card={card} size="sm" />
          </div>
        </div>

        {/* Name + stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '4px', minWidth: 0 }}>
          <div style={{
            fontSize:      '0.72rem',
            fontWeight:    900,
            color:         '#fff',
            fontFamily:    'Arial Black, Arial, sans-serif',
            whiteSpace:    'nowrap',
            overflow:      'hidden',
            textOverflow:  'ellipsis',
          }}>
            {card.name}
          </div>
          <div style={{
            fontSize:      '0.62rem',
            color:         'rgba(255,255,255,0.45)',
            fontFamily:    'Arial, sans-serif',
            letterSpacing: '0.04em',
          }}>
            {card.position}
          </div>
          <div style={{
            fontSize:      '0.68rem',
            fontWeight:    700,
            color:         ab > 0 ? '#22c55e' : 'rgba(255,255,255,0.25)',
            fontFamily:    fonts.ui,
            marginTop:     '4px',
          }}>
            {statLine}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Role banner — shown above each side panel ────────────────────────────────
function RoleBanner({ isBatting, teamName, teamColor, teamBg }) {
  const color  = isBatting ? '#22c55e' : '#f59e0b'
  const label  = isBatting ? '● AT BAT' : '⚡ PITCHING'
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '6px 12px',
      background:     `${color}18`,
      borderBottom:   `2px solid ${color}55`,
    }}>
      <span style={{
        fontSize:      '0.65rem',
        fontWeight:    900,
        letterSpacing: '0.12em',
        color,
        fontFamily:    'Arial Black, Arial, sans-serif',
      }}>
        {label}
      </span>
      <span style={{
        fontSize:      '0.62rem',
        fontWeight:    700,
        letterSpacing: '0.08em',
        color:         'rgba(255,255,255,0.5)',
        fontFamily:    'Arial, sans-serif',
        textTransform: 'uppercase',
      }}>
        {teamName}
      </span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resultLabel(result, lastPitch) {
  const pf = lastPitch?.primaryFielder
  const fz = lastPitch?.fieldZone ?? ''
  const sfx = pf ? ` — ${pf}` : ''

  if (result === OUTCOME.STRIKEOUT) {
    return lastPitch?.tookPitch ? '✕ STRIKEOUT LOOKING' : '✕ STRIKEOUT SWINGING'
  }
  if (result === OUTCOME.OUT) {
    if (fz.includes('deep') || fz.includes('shallow')) return `✕ FLY OUT${sfx}`
    if (fz.includes('infield')) return `✕ GROUND OUT${sfx}`
    return `✕ OUT${sfx}`
  }
  if (result === OUTCOME.DOUBLE_PLAY) return `✕ DOUBLE PLAY${sfx}`

  const labels = {
    [OUTCOME.HOME_RUN]: '⚾ HOME RUN',
    [OUTCOME.TRIPLE]:   '⚾ TRIPLE',
    [OUTCOME.DOUBLE]:   '⚾ DOUBLE',
    [OUTCOME.SINGLE]:   '⚾ SINGLE',
    [OUTCOME.WALK]:     '⚾ WALK',
    [OUTCOME.ERROR]:    '⚠ ERROR',
  }
  return labels[result] ?? result?.toUpperCase() ?? '—'
}

function resultBg(result) {
  if ([OUTCOME.HOME_RUN, OUTCOME.TRIPLE, OUTCOME.DOUBLE, OUTCOME.SINGLE, OUTCOME.WALK].includes(result))
    return 'rgba(34,197,94,0.12)'
  if (result === OUTCOME.ERROR) return 'rgba(245,158,11,0.12)'
  return 'rgba(239,68,68,0.12)'
}

function resultBorder(result) {
  if ([OUTCOME.HOME_RUN, OUTCOME.TRIPLE, OUTCOME.DOUBLE, OUTCOME.SINGLE, OUTCOME.WALK].includes(result))
    return 'rgba(34,197,94,0.4)'
  if (result === OUTCOME.ERROR) return 'rgba(245,158,11,0.4)'
  return 'rgba(239,68,68,0.4)'
}

function GameOverScreen({ score, onDone }) {
  const winner = score.away > score.home ? 'AWAY' : score.home > score.away ? 'HOME' : 'TIE'
  return (
    <div style={{
      minHeight:  '100vh',
      display:    'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #080812 0%, #0c0e1e 100%)',
      color:      '#fff', gap: '16px', fontFamily: fonts.ui,
    }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.04em' }}>FINAL</div>
      <div style={{ fontSize: '2.8rem', fontWeight: 900 }}>{score.away} – {score.home}</div>
      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em' }}>
        {winner === 'TIE' ? 'TIE GAME' : `${winner} WINS`}
      </div>
      <motion.button
        onClick={onDone}
        whileHover={{ scale: 1.04 }}
        whileTap={{   scale: 0.96 }}
        style={{
          marginTop:    '12px', padding: '10px 32px',
          background:   'rgba(255,255,255,0.1)',
          border:       '1px solid rgba(255,255,255,0.3)',
          borderRadius: radius.md, color: '#fff',
          fontSize: '0.7rem', fontWeight: 900,
          cursor: 'pointer', letterSpacing: '0.1em', fontFamily: fonts.ui,
        }}
      >
        BACK TO SEASON
      </motion.button>
    </div>
  )
}
