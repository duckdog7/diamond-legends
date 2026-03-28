/**
 * InPlayScene.jsx
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │  Field SVG — ball arc animates to zone       │
 *   │  Active fielder glows; runners shown on base │
 *   ├─────────────────────────────────────────────┤
 *   │  LOWER THIRD (broadcaster strip)            │
 *   │  [Fielder]  [Zone · BallType]  [Difficulty] │
 *   │  Runner decision rows (horizontal, compact)  │
 *   └─────────────────────────────────────────────┘
 *   [ RESOLVE PLAY → ]
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fonts, fontSize, radius } from '../theme'
import { BALL_TYPE } from '../engine/baserunningResolver'

// ─── Field coordinate system (mirrors FieldView.jsx) ─────────────────────────
const HOME    = [110, 148]
const FIRST   = [155, 105]
const SECOND  = [110,  62]
const THIRD   = [ 65, 105]
const PITCHER = [110, 105]

const LF_CORNER = [ 18,  68]
const CF_APEX   = [110,  16]
const RF_CORNER = [202,  68]

const FIELDER_XY = {
  C:    [110, 163],
  P:    [110, 100],
  '1B': [165,  97],
  '2B': [143,  73],
  SS:   [ 78,  73],
  '3B': [ 55,  97],
  LF:   [ 42,  52],
  CF:   [110,  32],
  RF:   [178,  52],
}

const BASE_XY = {
  1: FIRST,
  2: SECOND,
  3: THIRD,
  0: HOME,   // home plate
}

// Field zone → SVG landing coordinates
const ZONE_XY = {
  infield_left:        [ 67,  90],
  infield_middle:      [108,  82],
  infield_right:       [150,  90],
  infield_left_line:   [ 28,  85],
  infield_hard_ground: [100,  92],
  shallow_lf:          [ 48,  62],
  shallow_cf:          [110,  46],
  shallow_rf:          [172,  62],
  shallow_cf_rf:       [145,  50],
  deep_lf_lcf:         [ 32,  28],
  deep_cf_rcf:         [110,  18],
  deep_rf:             [188,  28],
}

// ─── Bezier arc helpers ───────────────────────────────────────────────────────

function bezierPt(t, p0, cp, p2) {
  const mt = 1 - t
  return [
    mt * mt * p0[0] + 2 * mt * t * cp[0] + t * t * p2[0],
    mt * mt * p0[1] + 2 * mt * t * cp[1] + t * t * p2[1],
  ]
}

/** Compute control point for ball arc — lifted above the midpoint. */
function arcControl(from, to) {
  const mx = (from[0] + to[0]) / 2
  const my = (from[1] + to[1]) / 2
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1])
  const lift = Math.min(50, Math.max(20, dist * 0.45))
  return [mx, my - lift]
}

/** Build N keyframe points along a quadratic bezier for Framer Motion. */
function bezierKeyframes(from, to, n = 12) {
  const cp = arcControl(from, to)
  const pts = []
  for (let i = 0; i <= n; i++) {
    pts.push(bezierPt(i / n, from, cp, to))
  }
  return {
    cx: pts.map(p => p[0]),
    cy: pts.map(p => p[1]),
  }
}

// ─── SVG path string for the arc trail ───────────────────────────────────────
function arcPathD(from, to) {
  const cp = arcControl(from, to)
  return `M ${from[0]} ${from[1]} Q ${cp[0]} ${cp[1]} ${to[0]} ${to[1]}`
}

// ─── Display helpers ──────────────────────────────────────────────────────────
const ZONE_LABELS = {
  infield_left:        'Infield Left',
  infield_middle:      'Infield Middle',
  infield_right:       'Infield Right',
  infield_left_line:   'Down the 3B Line',
  infield_hard_ground: 'Hard Grounder',
  shallow_lf:          'Shallow LF',
  shallow_cf:          'Shallow CF',
  shallow_rf:          'Shallow RF',
  shallow_cf_rf:       'Shallow CF/RF',
  deep_lf_lcf:         'Deep LF Gap',
  deep_cf_rcf:         'Deep CF',
  deep_rf:             'Deep RF',
}

const BALL_TYPE_LABELS = {
  [BALL_TYPE.GROUND]: 'Ground Ball',
  [BALL_TYPE.FLY]:    'Fly Ball',
  [BALL_TYPE.LINER]:  'Line Drive',
}

const DIFFICULTY_COLORS = {
  routine:     '#22c55e',
  moderate:    '#f59e0b',
  difficult:   '#f97316',
  exceptional: '#ef4444',
}

// ─── Field SVG with ball animation ───────────────────────────────────────────
function InPlayField({ fieldZone, primaryFielder, fieldingSuccess, ballType, scenarios, bases, defenseLineup, pitcherCard }) {
  const destXY  = ZONE_XY[fieldZone] ?? [110, 80]
  const kf      = bezierKeyframes(HOME, destXY)
  const pathD   = arcPathD(HOME, destXY)
  const fielderPos = primaryFielder

  // Build fielder map for glow
  const fielderMap = {}
  if (pitcherCard) fielderMap['P'] = pitcherCard
  ;(defenseLineup ?? []).forEach(c => {
    const p = c.position ?? c.slot
    if (p) fielderMap[p] = c
  })

  // Runner positions for base indicators
  const [r1, r2, r3] = bases ?? [null, null, null]

  // Scenario arrows: from-base → to-base per runner
  const arrows = scenarios
    .filter(s => !s.isDefiniteOut && s.toBase !== null && s.fromBase !== null)
    .map(s => ({
      id:       s.id,
      from:     BASE_XY[s.fromBase] ?? HOME,
      to:       BASE_XY[s.toBase]   ?? HOME,
      decided:  s.requiresDecision ? null : s.autoDecision,
    }))

  // Trail path length estimate for dasharray
  const trailLen = 300

  return (
    <svg
      viewBox="0 0 220 170"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {/* ── Grass background ── */}
      <rect x="0" y="0" width="220" height="170" fill="rgba(10,30,10,0.97)" />

      {/* ── Outfield grass wedge ── */}
      <path
        d={`M ${HOME[0]},${HOME[1]}
            L ${LF_CORNER[0]},${LF_CORNER[1]}
            Q ${CF_APEX[0]},${CF_APEX[1]} ${RF_CORNER[0]},${RF_CORNER[1]}
            Z`}
        fill="rgba(22,58,22,0.95)"
      />

      {/* ── Infield dirt ── */}
      <polygon
        points={`${HOME[0]},${HOME[1]} ${FIRST[0]},${FIRST[1]} ${SECOND[0]},${SECOND[1]} ${THIRD[0]},${THIRD[1]}`}
        fill="rgba(130,82,38,0.42)"
      />

      {/* ── Outfield fence ── */}
      <path
        d={`M ${LF_CORNER[0]},${LF_CORNER[1]} Q ${CF_APEX[0]},${CF_APEX[1]} ${RF_CORNER[0]},${RF_CORNER[1]}`}
        fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1.5"
      />

      {/* ── Foul lines ── */}
      <line x1={HOME[0]} y1={HOME[1]} x2={LF_CORNER[0] - 4} y2={LF_CORNER[1] - 10}
        stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      <line x1={HOME[0]} y1={HOME[1]} x2={RF_CORNER[0] + 4} y2={RF_CORNER[1] - 10}
        stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />

      {/* ── Base paths ── */}
      <polygon
        points={`${HOME[0]},${HOME[1]} ${FIRST[0]},${FIRST[1]} ${SECOND[0]},${SECOND[1]} ${THIRD[0]},${THIRD[1]}`}
        fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.9"
      />

      {/* ── Pitcher mound ── */}
      <circle cx={PITCHER[0]} cy={PITCHER[1]} r={7} fill="rgba(150,92,42,0.5)" />
      <circle cx={PITCHER[0]} cy={PITCHER[1]} r={2} fill="rgba(255,255,255,0.22)" />

      {/* ── Landing zone glow ── */}
      <motion.circle
        cx={destXY[0]} cy={destXY[1]} r={10}
        fill="rgba(251,191,36,0.18)"
        stroke="rgba(251,191,36,0.5)"
        strokeWidth="1"
        initial={{ opacity: 0, r: 6 }}
        animate={{ opacity: [0, 0.9, 0.6], r: [6, 14, 10] }}
        transition={{ delay: 0.75, duration: 0.4 }}
      />

      {/* ── Ball arc trail ── */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1.2"
        strokeDasharray={trailLen}
        initial={{ strokeDashoffset: trailLen }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* ── Ball ── */}
      <motion.circle
        r={4}
        fill="#ffffff"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.8"
        filter="url(#ballGlow)"
        initial={{ cx: HOME[0], cy: HOME[1], opacity: 0 }}
        animate={{ cx: kf.cx, cy: kf.cy, opacity: [0, 1, 1, 1] }}
        transition={{ duration: 0.82, ease: 'easeOut' }}
      />

      {/* ── Fielder dots ── */}
      {Object.entries(FIELDER_XY).map(([pos, [fx, fy]]) => {
        const isActive = pos === fielderPos
        return (
          <g key={pos}>
            {isActive && (
              <motion.circle
                cx={fx} cy={fy} r={14}
                fill="none"
                stroke={fieldingSuccess ? 'rgba(34,197,94,0.6)' : 'rgba(245,158,11,0.6)'}
                strokeWidth="1.5"
                initial={{ opacity: 0, r: 8 }}
                animate={{ opacity: [0, 0.9, 0.5], r: [8, 16, 14] }}
                transition={{ delay: 0.9, duration: 0.4 }}
              />
            )}
            <circle
              cx={fx} cy={fy} r={isActive ? 9 : 6}
              fill={isActive
                ? (fieldingSuccess ? 'rgba(34,197,94,0.85)' : 'rgba(245,158,11,0.85)')
                : (fielderMap[pos] ? 'rgba(60,100,220,0.75)' : 'rgba(60,60,60,0.5)')
              }
              stroke={isActive
                ? (fieldingSuccess ? 'rgba(134,239,172,0.9)' : 'rgba(252,211,77,0.9)')
                : 'rgba(255,255,255,0.2)'
              }
              strokeWidth={isActive ? 1.5 : 0.8}
            />
            <text x={fx} y={fy + 3} textAnchor="middle"
              fontSize={isActive ? '5.5' : '4.5'} fontWeight="900" fill="white"
              style={{ fontFamily: 'Arial Black, Arial, sans-serif', pointerEvents: 'none' }}
            >
              {pos}
            </text>
          </g>
        )
      })}

      {/* ── Bases ── */}
      <InPlayBase cx={FIRST[0]}  cy={FIRST[1]}  occupied={!!r1} runner={r1?.card} />
      <InPlayBase cx={SECOND[0]} cy={SECOND[1]} occupied={!!r2} runner={r2?.card} />
      <InPlayBase cx={THIRD[0]}  cy={THIRD[1]}  occupied={!!r3} runner={r3?.card} />
      <HomePlate  cx={HOME[0]}   cy={HOME[1]} />

      {/* ── Runner advance arrows ── */}
      {arrows.map(a => (
        <RunnerArrow key={a.id} from={a.from} to={a.to} decided={a.decided} />
      ))}

      {/* ── SVG filter defs ── */}
      <defs>
        <filter id="ballGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
    </svg>
  )
}

function HomePlate({ cx, cy }) {
  return (
    <polygon
      points={`${cx},${cy-5} ${cx+4},${cy-2} ${cx+4},${cy+3} ${cx-4},${cy+3} ${cx-4},${cy-2}`}
      fill="rgba(255,255,255,0.6)"
    />
  )
}

function InPlayBase({ cx, cy, occupied, runner }) {
  return (
    <g>
      <rect
        x={cx - 5} y={cy - 5} width={10} height={10} rx={1}
        transform={`rotate(45,${cx},${cy})`}
        fill={occupied ? '#f59e0b' : 'rgba(255,255,255,0.40)'}
        stroke={occupied ? '#fbbf24' : 'rgba(255,255,255,0.50)'}
        strokeWidth="0.9"
      />
      {occupied && runner && (
        <text x={cx} y={cy - 9} textAnchor="middle"
          fontSize="4" fill="rgba(255,255,255,0.7)"
          style={{ fontFamily: 'Arial, sans-serif', pointerEvents: 'none' }}
        >
          {runner.name?.split(' ').pop() ?? ''}
        </text>
      )}
    </g>
  )
}

function RunnerArrow({ from, to, decided }) {
  if (!from || !to || (from[0] === to[0] && from[1] === to[1])) return null
  const color = decided === 'send' ? 'rgba(34,197,94,0.7)'
              : decided === 'hold' ? 'rgba(148,163,184,0.4)'
              : 'rgba(251,191,36,0.5)'
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy)
  const nx = dx / len
  const ny = dy / len
  const arrowX = to[0] - nx * 8
  const arrowY = to[1] - ny * 8
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={arrowX} y2={arrowY}
        stroke={color} strokeWidth="1.2" strokeDasharray="3 2" />
      <polygon
        points={`
          ${to[0]},${to[1]}
          ${arrowX - ny * 2.5},${arrowY + nx * 2.5}
          ${arrowX + ny * 2.5},${arrowY - nx * 2.5}
        `}
        fill={color}
      />
    </g>
  )
}

// ─── Probability bar ───────────────────────────────────────────────────────────
function ProbBar({ outProb }) {
  const color = outProb >= 65 ? '#ef4444'
              : outProb >= 50 ? '#f97316'
              : outProb >= 35 ? '#f59e0b'
              : '#22c55e'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: '90px' }}>
      <div style={{ flex: 1, height: '4px', borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${outProb}%`, background: `linear-gradient(90deg, #22c55e, ${color})`, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: '0.62rem', fontWeight: 900, color, fontFamily: fonts.ui, minWidth: '28px' }}>
        {outProb}%
      </div>
    </div>
  )
}

// ─── Compact horizontal runner decision row (lower-third style) ───────────────
function RunnerDecisionRow({ scenario, decision, onDecide }) {
  const { id, runnerCard, fromBase, toBase, baseLabel, projection, isTagUp,
          fielderPos, fielderArm, runnerSpeed, requiresDecision, autoDecision, autoSafe } = scenario

  const fromLabel   = fromBase === null ? 'Batter' : fromBase === 0 ? 'Home' : `${fromBase}B`
  const toDisplay   = toBase === 0 ? 'Home' : baseLabel
  const decidedSend = decision === 'send'
  const decidedHold = decision === 'hold'
  const isAuto      = !requiresDecision

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            '10px',
      padding:        '8px 12px',
      borderRadius:   radius.md,
      background:     isAuto ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
      border:         `1px solid ${isAuto ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.15)'}`,
      flexWrap:       'wrap',
    }}>
      {/* Runner name + route */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: '110px', flex: '0 0 auto' }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: 900, color: '#fff', fontFamily: fonts.ui,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
          {runnerCard?.name ?? 'Runner'}
        </div>
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontFamily: fonts.ui }}>
          {fromLabel} → {toDisplay}{isTagUp ? ' (tag)' : ''}
          {isAuto && <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: '4px' }}>AUTO</span>}
        </div>
      </div>

      {/* Speed vs Arm */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '0 0 auto' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontFamily: fonts.ui }}>SPD</div>
          <div style={{ fontSize: fontSize.sm, fontWeight: 900, color: '#a78bfa', fontFamily: fonts.ui, lineHeight: 1 }}>{runnerSpeed}</div>
        </div>
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontFamily: fonts.ui }}>vs</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontFamily: fonts.ui }}>{fielderPos} ARM</div>
          <div style={{ fontSize: fontSize.sm, fontWeight: 900, color: '#f87171', fontFamily: fonts.ui, lineHeight: 1 }}>{fielderArm}</div>
        </div>
      </div>

      {/* Prob bar */}
      {!autoSafe && projection?.throwData && (
        <div style={{ flex: 1, minWidth: '90px' }}>
          <ProbBar outProb={projection.outProb} />
          <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontFamily: fonts.ui, marginTop: '2px' }}>
            {projection.throwData.feet} ft · {projection.label}
          </div>
        </div>
      )}

      {autoSafe && (
        <div style={{ fontSize: '0.62rem', color: '#22c55e', fontFamily: fonts.ui, flex: 1 }}>
          ✓ No throw
        </div>
      )}

      {/* Buttons or auto status */}
      {requiresDecision ? (
        <div style={{ display: 'flex', gap: '5px', flex: '0 0 auto' }}>
          <motion.button
            onClick={() => onDecide(id, 'send')}
            whileTap={{ scale: 0.94 }}
            style={{
              padding:    '6px 14px',
              borderRadius: radius.md,
              fontFamily: fonts.ui, fontSize: '0.68rem', fontWeight: 900,
              letterSpacing: '0.08em', cursor: 'pointer',
              border:     `1.5px solid ${decidedSend ? 'rgba(34,197,94,0.9)' : 'rgba(34,197,94,0.3)'}`,
              background: decidedSend ? 'rgba(34,197,94,0.22)' : 'rgba(34,197,94,0.06)',
              color:      decidedSend ? '#22c55e' : 'rgba(255,255,255,0.45)',
              boxShadow:  decidedSend ? '0 0 12px rgba(34,197,94,0.35)' : 'none',
              transition: 'all 0.1s',
            }}
          >SEND</motion.button>
          <motion.button
            onClick={() => onDecide(id, 'hold')}
            whileTap={{ scale: 0.94 }}
            style={{
              padding:    '6px 14px',
              borderRadius: radius.md,
              fontFamily: fonts.ui, fontSize: '0.68rem', fontWeight: 900,
              letterSpacing: '0.08em', cursor: 'pointer',
              border:     `1.5px solid ${decidedHold ? 'rgba(148,163,184,0.8)' : 'rgba(148,163,184,0.2)'}`,
              background: decidedHold ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.04)',
              color:      decidedHold ? '#94a3b8' : 'rgba(255,255,255,0.35)',
              transition: 'all 0.1s',
            }}
          >HOLD</motion.button>
        </div>
      ) : (
        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)', fontFamily: fonts.ui, flex: '0 0 auto', letterSpacing: '0.06em' }}>
          {autoDecision === 'hold' ? '✋ Holding' : autoSafe ? '▶ Advancing' : '▶ Forced'}
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function InPlayScene({ inPlayData, onResolve }) {
  const { flightResult, fielderCard, fieldingSuccess, ballType, scenarios } = inPlayData

  const decisionScenarios = scenarios.filter(s => s.requiresDecision)
  const autoScenarios     = scenarios.filter(s => !s.requiresDecision && s.autoDecision !== 'out')

  const [decisions, setDecisions] = useState({})
  const allDecided = decisionScenarios.every(s => decisions[s.id])
  const canResolve = allDecided

  function handleDecide(id, val) {
    setDecisions(prev => ({ ...prev, [id]: val }))
  }

  const diffColor    = DIFFICULTY_COLORS[flightResult.baseDifficulty] ?? '#fff'
  const zoneLabel    = ZONE_LABELS[flightResult.fieldZone] ?? flightResult.fieldZone
  const ballLabel    = BALL_TYPE_LABELS[ballType] ?? ballType
  const fielderName  = fielderCard?.name ?? flightResult.primaryFielder
  const fielderArm   = fielderCard?.tools?.arm ?? '?'
  const fielderGlove = fielderCard?.tools?.fielding ?? '?'

  const fieldingLabel = fieldingSuccess
    ? (ballType === BALL_TYPE.GROUND ? 'FIELDED' : 'CAUGHT')
    : (ballType === BALL_TYPE.GROUND ? 'THROUGH' : 'DROPS IT')
  const fieldingColor = fieldingSuccess ? '#22c55e' : '#f59e0b'

  // Runner base state for field display — pull from scenarios
  const bases = inPlayData.bases ?? [null, null, null]

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      width:         '100%',
      gap:           '0px',
      borderRadius:  radius.lg,
      overflow:      'hidden',
      border:        '1px solid rgba(255,255,255,0.1)',
    }}>

      {/* ── Field ─────────────────────────────────────────────────────────── */}
      <div style={{ width: '100%', aspectRatio: '220 / 170', background: 'rgba(10,28,10,0.98)', position: 'relative' }}>
        <InPlayField
          fieldZone={flightResult.fieldZone}
          primaryFielder={flightResult.primaryFielder}
          fieldingSuccess={fieldingSuccess}
          ballType={ballType}
          scenarios={scenarios}
          bases={bases}
          defenseLineup={inPlayData.defenseLineup ?? []}
          pitcherCard={inPlayData.pitcherCard}
        />
      </div>

      {/* ── Lower third ───────────────────────────────────────────────────── */}
      <div style={{
        background:    'linear-gradient(180deg, rgba(6,10,20,0.97) 0%, rgba(4,7,15,0.99) 100%)',
        borderTop:     '1px solid rgba(255,255,255,0.1)',
        padding:       '10px 14px',
        display:       'flex',
        flexDirection: 'column',
        gap:           '8px',
      }}>

        {/* Info strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Fielder */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: '0 0 auto' }}>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', fontFamily: fonts.ui }}>FIELDER</div>
            <div style={{ fontSize: fontSize.xs, fontWeight: 900, color: '#fff', fontFamily: fonts.ui }}>{fielderName}</div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.6rem', color: '#34d399', fontFamily: fonts.ui, fontWeight: 700 }}>GLV {fielderGlove}</span>
              <span style={{ fontSize: '0.6rem', color: '#f87171', fontFamily: fonts.ui, fontWeight: 700 }}>ARM {fielderArm}</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          {/* Zone + ball type */}
          <div style={{ flex: 1, minWidth: '80px' }}>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', fontFamily: fonts.ui }}>{ballLabel.toUpperCase()}</div>
            <div style={{ fontSize: fontSize.xs, fontWeight: 700, color: '#fff', fontFamily: fonts.ui }}>{zoneLabel}</div>
          </div>

          {/* Difficulty */}
          <div style={{
            padding:      '3px 10px',
            borderRadius: radius.pill,
            background:   `${diffColor}18`,
            border:       `1px solid ${diffColor}55`,
            color:        diffColor,
            fontSize:     '0.62rem',
            fontWeight:   900,
            fontFamily:   fonts.ui,
            letterSpacing:'0.1em',
            flexShrink:   0,
          }}>
            {flightResult.baseDifficulty.toUpperCase()}
          </div>

          {/* Fielding result */}
          <div style={{
            padding:      '3px 12px',
            borderRadius: radius.pill,
            background:   `${fieldingColor}18`,
            border:       `1.5px solid ${fieldingColor}66`,
            color:        fieldingColor,
            fontSize:     '0.72rem',
            fontWeight:   900,
            fontFamily:   fonts.ui,
            letterSpacing:'0.1em',
            flexShrink:   0,
            textShadow:   `0 0 10px ${fieldingColor}77`,
          }}>
            {fieldingLabel}
          </div>
        </div>

        {/* Runner rows */}
        {(decisionScenarios.length > 0 || autoScenarios.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {decisionScenarios.map(s => (
              <RunnerDecisionRow
                key={s.id}
                scenario={s}
                decision={decisions[s.id] ?? null}
                onDecide={handleDecide}
              />
            ))}
            {autoScenarios.map(s => (
              <RunnerDecisionRow
                key={s.id}
                scenario={s}
                decision={s.autoDecision}
                onDecide={() => {}}
              />
            ))}
          </div>
        )}

        {/* Resolve button */}
        <motion.button
          onClick={() => canResolve && onResolve(decisions)}
          disabled={!canResolve}
          whileHover={canResolve ? { scale: 1.015 } : {}}
          whileTap={canResolve ? { scale: 0.975 } : {}}
          style={{
            padding:      '11px',
            borderRadius: radius.md,
            fontFamily:   fonts.ui,
            fontSize:     fontSize.sm,
            fontWeight:   900,
            letterSpacing:'0.14em',
            cursor:       canResolve ? 'pointer' : 'not-allowed',
            border:       `1.5px solid ${canResolve ? 'rgba(251,191,36,0.65)' : 'rgba(255,255,255,0.08)'}`,
            background:   canResolve ? 'rgba(251,191,36,0.14)' : 'rgba(255,255,255,0.03)',
            color:        canResolve ? '#fbbf24' : 'rgba(255,255,255,0.2)',
            boxShadow:    canResolve ? '0 0 20px rgba(251,191,36,0.2)' : 'none',
            textShadow:   canResolve ? '0 0 10px rgba(251,191,36,0.55)' : 'none',
            transition:   'all 0.12s',
            width:        '100%',
            marginTop:    '2px',
          }}
        >
          {decisionScenarios.length === 0
            ? 'RESOLVE PLAY →'
            : allDecided
              ? 'RESOLVE PLAY →'
              : `DECIDE ALL RUNNERS (${Object.keys(decisions).length} / ${decisionScenarios.length})`
          }
        </motion.button>
      </div>
    </div>
  )
}
