/**
 * InPlayScene.jsx
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │  Field SVG + HTML overlays                   │
 *   │  · Fielder stat chip near active fielder     │
 *   │  · Runner name/SPD chips at occupied bases   │
 *   │  · "CAUGHT!" / "FIELDED" result badge        │
 *   ├─────────────────────────────────────────────┤
 *   │  Slim context bar (ball type · zone · diff)  │
 *   │  Runner decision rows (SEND / HOLD)          │
 *   │  [ RESOLVE PLAY → ]                          │
 *   └─────────────────────────────────────────────┘
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { fonts, fontSize, radius } from '../theme'
import { BALL_TYPE } from '../engine/baserunningResolver'

// ─── Field coordinate system ──────────────────────────────────────────────────
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
  0: HOME,
  1: FIRST,
  2: SECOND,
  3: THIRD,
}

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

// ─── Bezier helpers ───────────────────────────────────────────────────────────
function bezierPt(t, p0, cp, p2) {
  const mt = 1 - t
  return [
    mt * mt * p0[0] + 2 * mt * t * cp[0] + t * t * p2[0],
    mt * mt * p0[1] + 2 * mt * t * cp[1] + t * t * p2[1],
  ]
}

function arcControl(from, to) {
  const mx   = (from[0] + to[0]) / 2
  const my   = (from[1] + to[1]) / 2
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1])
  const lift = Math.min(50, Math.max(20, dist * 0.45))
  return [mx, my - lift]
}

function bezierKeyframes(from, to, n = 12) {
  const cp  = arcControl(from, to)
  const pts = []
  for (let i = 0; i <= n; i++) pts.push(bezierPt(i / n, from, cp, to))
  return { cx: pts.map(p => p[0]), cy: pts.map(p => p[1]) }
}

function arcPathD(from, to) {
  const cp = arcControl(from, to)
  return `M ${from[0]} ${from[1]} Q ${cp[0]} ${cp[1]} ${to[0]} ${to[1]}`
}

// ─── SVG coord → CSS percent (for HTML overlay positioning) ──────────────────
const svgPct = (x, y) => ({
  left: `${(x / 220 * 100).toFixed(1)}%`,
  top:  `${(y / 170 * 100).toFixed(1)}%`,
})

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
  [BALL_TYPE.GROUND]: 'Grounder',
  [BALL_TYPE.FLY]:    'Fly Ball',
  [BALL_TYPE.LINER]:  'Line Drive',
}

const DIFFICULTY_COLORS = {
  routine:     '#22c55e',
  moderate:    '#f59e0b',
  difficult:   '#f97316',
  exceptional: '#ef4444',
}

// ─── Field SVG (field markings, fielder dots, ball arc, base squares, arrows) ─
function FieldSVG({ fieldZone, primaryFielder, fieldingSuccess, scenarios, bases }) {
  const destXY  = ZONE_XY[fieldZone] ?? [110, 80]
  const kf      = bezierKeyframes(HOME, destXY)
  const pathD   = arcPathD(HOME, destXY)
  const trailLen = 300

  const [r1, r2, r3] = bases ?? [null, null, null]

  const arrows = scenarios
    .filter(s => !s.isDefiniteOut && s.toBase !== null && s.fromBase !== null)
    .map(s => ({
      id:   s.id,
      from: BASE_XY[s.fromBase] ?? HOME,
      to:   BASE_XY[s.toBase]   ?? HOME,
    }))

  return (
    <svg viewBox="0 0 220 170" style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* Grass */}
      <rect x="0" y="0" width="220" height="170" fill="rgba(10,30,10,0.97)" />
      <path
        d={`M ${HOME[0]},${HOME[1]} L ${LF_CORNER[0]},${LF_CORNER[1]} Q ${CF_APEX[0]},${CF_APEX[1]} ${RF_CORNER[0]},${RF_CORNER[1]} Z`}
        fill="rgba(22,58,22,0.95)"
      />
      {/* Infield dirt */}
      <polygon
        points={`${HOME[0]},${HOME[1]} ${FIRST[0]},${FIRST[1]} ${SECOND[0]},${SECOND[1]} ${THIRD[0]},${THIRD[1]}`}
        fill="rgba(130,82,38,0.42)"
      />
      {/* Fence */}
      <path
        d={`M ${LF_CORNER[0]},${LF_CORNER[1]} Q ${CF_APEX[0]},${CF_APEX[1]} ${RF_CORNER[0]},${RF_CORNER[1]}`}
        fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1.5"
      />
      {/* Foul lines */}
      <line x1={HOME[0]} y1={HOME[1]} x2={LF_CORNER[0]-4} y2={LF_CORNER[1]-10} stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      <line x1={HOME[0]} y1={HOME[1]} x2={RF_CORNER[0]+4} y2={RF_CORNER[1]-10} stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      {/* Base paths */}
      <polygon
        points={`${HOME[0]},${HOME[1]} ${FIRST[0]},${FIRST[1]} ${SECOND[0]},${SECOND[1]} ${THIRD[0]},${THIRD[1]}`}
        fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.9"
      />
      {/* Pitcher mound */}
      <circle cx={PITCHER[0]} cy={PITCHER[1]} r={7} fill="rgba(150,92,42,0.5)" />
      <circle cx={PITCHER[0]} cy={PITCHER[1]} r={2} fill="rgba(255,255,255,0.22)" />

      {/* Landing zone glow */}
      <motion.circle cx={destXY[0]} cy={destXY[1]} r={10}
        fill="rgba(251,191,36,0.18)" stroke="rgba(251,191,36,0.5)" strokeWidth="1"
        initial={{ opacity: 0, r: 6 }}
        animate={{ opacity: [0, 0.9, 0.6], r: [6, 14, 10] }}
        transition={{ delay: 0.75, duration: 0.4 }}
      />

      {/* Ball trail */}
      <motion.path d={pathD} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2"
        strokeDasharray={trailLen}
        initial={{ strokeDashoffset: trailLen }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Ball */}
      <motion.circle r={4} fill="#ffffff" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8"
        filter="url(#ballGlow)"
        initial={{ cx: HOME[0], cy: HOME[1], opacity: 0 }}
        animate={{ cx: kf.cx, cy: kf.cy, opacity: [0, 1, 1, 1] }}
        transition={{ duration: 0.82, ease: 'easeOut' }}
      />

      {/* Fielder dots */}
      {Object.entries(FIELDER_XY).map(([pos, [fx, fy]]) => {
        const isActive = pos === primaryFielder
        return (
          <g key={pos}>
            {isActive && (
              <>
                <motion.circle cx={fx} cy={fy} r={20} fill="none"
                  stroke={fieldingSuccess ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}
                  strokeWidth="1"
                  initial={{ opacity: 0, r: 12 }}
                  animate={{ opacity: [0, 0.9, 0], r: [12, 24, 24] }}
                  transition={{ delay: 0.85, duration: 0.65 }}
                />
                <motion.circle cx={fx} cy={fy} r={14} fill="none"
                  stroke={fieldingSuccess ? 'rgba(34,197,94,0.7)' : 'rgba(245,158,11,0.7)'}
                  strokeWidth="1.8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.55] }}
                  transition={{ delay: 0.88, duration: 0.45 }}
                />
              </>
            )}
            <circle cx={fx} cy={fy} r={isActive ? 9 : 5}
              fill={isActive
                ? (fieldingSuccess ? 'rgba(34,197,94,0.92)' : 'rgba(245,158,11,0.92)')
                : 'rgba(60,100,200,0.65)'}
              stroke={isActive
                ? (fieldingSuccess ? 'rgba(134,239,172,1)' : 'rgba(252,211,77,1)')
                : 'rgba(255,255,255,0.18)'}
              strokeWidth={isActive ? 1.5 : 0.7}
            />
            <text x={fx} y={fy + 3} textAnchor="middle"
              fontSize={isActive ? '5.5' : '4'} fontWeight="900" fill="white"
              style={{ fontFamily: 'Arial Black, Arial, sans-serif', pointerEvents: 'none' }}
            >{pos}</text>
          </g>
        )
      })}

      {/* Base squares */}
      <BaseSquare cx={FIRST[0]}  cy={FIRST[1]}  occupied={!!r1} />
      <BaseSquare cx={SECOND[0]} cy={SECOND[1]} occupied={!!r2} />
      <BaseSquare cx={THIRD[0]}  cy={THIRD[1]}  occupied={!!r3} />
      {/* Home plate */}
      <polygon
        points={`${HOME[0]},${HOME[1]-5} ${HOME[0]+4},${HOME[1]-2} ${HOME[0]+4},${HOME[1]+3} ${HOME[0]-4},${HOME[1]+3} ${HOME[0]-4},${HOME[1]-2}`}
        fill="rgba(255,255,255,0.6)"
      />

      {/* Runner advance arrows */}
      {arrows.map(a => {
        const dx = a.to[0] - a.from[0], dy = a.to[1] - a.from[1]
        const len = Math.hypot(dx, dy)
        if (len < 1) return null
        const nx = dx / len, ny = dy / len
        const ax = a.to[0] - nx * 9, ay = a.to[1] - ny * 9
        return (
          <g key={a.id}>
            <line x1={a.from[0]} y1={a.from[1]} x2={ax} y2={ay}
              stroke="rgba(251,191,36,0.5)" strokeWidth="1.2" strokeDasharray="3 2" />
            <polygon
              points={`${a.to[0]},${a.to[1]} ${ax - ny * 2.5},${ay + nx * 2.5} ${ax + ny * 2.5},${ay - nx * 2.5}`}
              fill="rgba(251,191,36,0.5)"
            />
          </g>
        )
      })}

      <defs>
        <filter id="ballGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
    </svg>
  )
}

function BaseSquare({ cx, cy, occupied }) {
  return (
    <rect
      x={cx - 6} y={cy - 6} width={12} height={12} rx={1}
      transform={`rotate(45,${cx},${cy})`}
      fill={occupied ? 'rgba(251,191,36,0.75)' : 'rgba(255,255,255,0.35)'}
      stroke={occupied ? '#fbbf24' : 'rgba(255,255,255,0.45)'}
      strokeWidth="1"
    />
  )
}

// ─── Fielder stat chip (HTML overlay positioned over SVG) ─────────────────────
function FielderStatChip({ fielderCard, fielderPos, fieldingSuccess, ballType }) {
  const [fx, fy]    = FIELDER_XY[fielderPos] ?? [110, 85]
  const isLeft      = fx < 95
  const isRight     = fx > 125
  const borderColor = fieldingSuccess ? '#22c55e' : '#f59e0b'
  const arm         = fielderCard?.tools?.arm      ?? '?'
  const glove       = fielderCard?.tools?.fielding ?? '?'
  const lastName    = (fielderCard?.name ?? fielderPos).split(' ').pop()

  return (
    <motion.div
      style={{
        position:      'absolute',
        ...svgPct(fx, fy),
        transform:     isLeft  ? 'translate(14px, calc(-100% - 10px))'
                     : isRight ? 'translate(calc(-100% - 14px), calc(-100% - 10px))'
                     :           'translate(-50%, calc(-100% - 10px))',
        background:    'rgba(3,5,14,0.95)',
        border:        `1.5px solid ${borderColor}70`,
        borderRadius:  '7px',
        padding:       '5px 9px',
        pointerEvents: 'none',
        zIndex:        12,
        boxShadow:     `0 0 16px ${borderColor}35, 0 2px 8px rgba(0,0,0,0.6)`,
        minWidth:      '74px',
        backdropFilter:'blur(3px)',
      }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.2 }}
    >
      <div style={{ fontSize: '0.55rem', color: borderColor, fontFamily: fonts.ui, fontWeight: 900, letterSpacing: '0.12em', marginBottom: '1px' }}>
        {fielderPos}
      </div>
      <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#fff', fontFamily: fonts.ui, whiteSpace: 'nowrap', lineHeight: 1.1 }}>
        {lastName}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
        <span style={{ fontSize: '0.58rem', color: '#34d399', fontFamily: fonts.ui, fontWeight: 700 }}>GLV {glove}</span>
        <span style={{ fontSize: '0.58rem', color: '#f87171', fontFamily: fonts.ui, fontWeight: 700 }}>ARM {arm}</span>
      </div>
    </motion.div>
  )
}

// ─── Result badge (large animated overlay centered on field) ──────────────────
function ResultBadge({ fieldingSuccess, ballType }) {
  const isFly   = ballType !== BALL_TYPE.GROUND
  const label   = fieldingSuccess
    ? (isFly ? 'CAUGHT!' : 'FIELDED')
    : (isFly ? 'DROPS IT!' : 'THROUGH!')
  const color   = fieldingSuccess ? '#22c55e' : '#f59e0b'

  return (
    <motion.div
      style={{
        position:      'absolute',
        left:          '50%',
        top:           '42%',
        transform:     'translate(-50%, -50%)',
        fontSize:      '1.45rem',
        fontWeight:    900,
        color,
        fontFamily:    fonts.ui,
        letterSpacing: '0.1em',
        textShadow:    `0 0 20px ${color}, 0 0 40px ${color}66`,
        pointerEvents: 'none',
        zIndex:        20,
        whiteSpace:    'nowrap',
      }}
      initial={{ opacity: 0, scale: 0.45 }}
      animate={{ opacity: [0, 1, 1, 0.9], scale: [0.45, 1.2, 1.0, 1.0] }}
      transition={{ delay: 0.88, duration: 0.5, times: [0, 0.25, 0.55, 1] }}
    >
      {label}
    </motion.div>
  )
}

// ─── Runner chip at base (HTML overlay showing name + SPD) ────────────────────
function RunnerChip({ runnerCard, baseIdx, runnerSpeed, isBatter }) {
  const svgXY     = BASE_XY[baseIdx ?? 0] ?? HOME
  const lastName  = (runnerCard?.name ?? 'Runner').split(' ').pop()
  const spd       = runnerSpeed ?? runnerCard?.tools?.speed ?? '?'

  // Anchor: 1B → right of base; 3B → left; 2B & HOME → above
  const transform = baseIdx === 1 ? 'translate(12px, -50%)'
                  : baseIdx === 3 ? 'translate(calc(-100% - 12px), -50%)'
                  :                 'translate(-50%, calc(-100% - 14px))'

  return (
    <motion.div
      style={{
        position:      'absolute',
        ...svgPct(svgXY[0], svgXY[1]),
        transform,
        background:    'rgba(3,5,14,0.95)',
        border:        isBatter
          ? '1px solid rgba(96,165,250,0.55)'
          : '1.5px solid rgba(251,191,36,0.6)',
        borderRadius:  '5px',
        padding:       '4px 8px',
        pointerEvents: 'none',
        zIndex:        11,
        boxShadow:     '0 2px 8px rgba(0,0,0,0.55)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.08 }}
    >
      <div style={{
        fontSize:   '0.72rem',
        fontWeight: 900,
        color:      isBatter ? '#93c5fd' : '#fbbf24',
        fontFamily: fonts.ui,
        whiteSpace: 'nowrap',
        lineHeight: 1.1,
      }}>
        {lastName}
      </div>
      <div style={{ fontSize: '0.55rem', color: '#a78bfa', fontFamily: fonts.ui, fontWeight: 700, marginTop: '2px' }}>
        SPD {spd}
      </div>
    </motion.div>
  )
}

// ─── Probability bar ──────────────────────────────────────────────────────────
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

// ─── Runner decision row ──────────────────────────────────────────────────────
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
      display:      'flex',
      alignItems:   'center',
      gap:          '10px',
      padding:      '8px 12px',
      borderRadius: radius.md,
      background:   isAuto ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
      border:       `1px solid ${isAuto ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.15)'}`,
      flexWrap:     'wrap',
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

      {/* Prob bar + distance */}
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
              padding:      '6px 14px',
              borderRadius: radius.md,
              fontFamily:   fonts.ui, fontSize: '0.68rem', fontWeight: 900,
              letterSpacing:'0.08em', cursor: 'pointer',
              border:       `1.5px solid ${decidedSend ? 'rgba(34,197,94,0.9)' : 'rgba(34,197,94,0.3)'}`,
              background:   decidedSend ? 'rgba(34,197,94,0.22)' : 'rgba(34,197,94,0.06)',
              color:        decidedSend ? '#22c55e' : 'rgba(255,255,255,0.45)',
              boxShadow:    decidedSend ? '0 0 12px rgba(34,197,94,0.35)' : 'none',
              transition:   'all 0.1s',
            }}
          >SEND</motion.button>
          <motion.button
            onClick={() => onDecide(id, 'hold')}
            whileTap={{ scale: 0.94 }}
            style={{
              padding:      '6px 14px',
              borderRadius: radius.md,
              fontFamily:   fonts.ui, fontSize: '0.68rem', fontWeight: 900,
              letterSpacing:'0.08em', cursor: 'pointer',
              border:       `1.5px solid ${decidedHold ? 'rgba(148,163,184,0.8)' : 'rgba(148,163,184,0.2)'}`,
              background:   decidedHold ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.04)',
              color:        decidedHold ? '#94a3b8' : 'rgba(255,255,255,0.35)',
              transition:   'all 0.1s',
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
  const bases = inPlayData.bases ?? [null, null, null]

  const decisionScenarios = scenarios.filter(s => s.requiresDecision)
  const autoScenarios     = scenarios.filter(s => !s.requiresDecision && s.autoDecision !== 'out')

  const [decisions, setDecisions] = useState({})
  const allDecided = decisionScenarios.every(s => decisions[s.id])

  function handleDecide(id, val) {
    setDecisions(prev => ({ ...prev, [id]: val }))
  }

  const diffColor  = DIFFICULTY_COLORS[flightResult.baseDifficulty] ?? '#fff'
  const zoneLabel  = ZONE_LABELS[flightResult.fieldZone] ?? flightResult.fieldZone
  const ballLabel  = BALL_TYPE_LABELS[ballType] ?? ballType
  const fielderPos = flightResult.primaryFielder

  const fieldingLabel = fieldingSuccess
    ? (ballType === BALL_TYPE.GROUND ? 'FIELDED' : 'CAUGHT')
    : (ballType === BALL_TYPE.GROUND ? 'THROUGH' : 'DROPPED')
  const fieldingColor = fieldingSuccess ? '#22c55e' : '#f59e0b'

  // Build runner chips from scenarios — all active (non-definite-out) runners
  const runnerChips = scenarios
    .filter(s => !s.isDefiniteOut)
    .map(s => ({
      id:          s.id,
      runnerCard:  s.runnerCard,
      baseIdx:     s.fromBase ?? 0,
      runnerSpeed: s.runnerSpeed,
      isBatter:    s.isBatterRunner,
    }))

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      width:         '100%',
      borderRadius:  radius.lg,
      overflow:      'hidden',
      border:        '1px solid rgba(255,255,255,0.1)',
    }}>

      {/* ── Field + overlays ─────────────────────────────────────────────── */}
      <div style={{
        width:        '100%',
        aspectRatio:  '220 / 170',
        background:   'rgba(10,28,10,0.98)',
        position:     'relative',
        overflow:     'hidden',
      }}>
        {/* SVG field */}
        <FieldSVG
          fieldZone={flightResult.fieldZone}
          primaryFielder={fielderPos}
          fieldingSuccess={fieldingSuccess}
          scenarios={scenarios}
          bases={bases}
        />

        {/* Fielder stat chip */}
        <FielderStatChip
          fielderCard={fielderCard}
          fielderPos={fielderPos}
          fieldingSuccess={fieldingSuccess}
          ballType={ballType}
        />

        {/* Runner chips at bases */}
        {runnerChips.map(r => (
          <RunnerChip
            key={r.id}
            runnerCard={r.runnerCard}
            baseIdx={r.baseIdx}
            runnerSpeed={r.runnerSpeed}
            isBatter={r.isBatter}
          />
        ))}

        {/* Big result badge */}
        <ResultBadge fieldingSuccess={fieldingSuccess} ballType={ballType} />
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

        {/* Slim context bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', fontFamily: fonts.ui }}>
            {ballLabel} · {zoneLabel}
          </span>
          <div style={{
            padding:      '2px 8px',
            borderRadius: radius.pill,
            background:   `${diffColor}15`,
            border:       `1px solid ${diffColor}50`,
            color:        diffColor,
            fontSize:     '0.58rem',
            fontWeight:   900,
            fontFamily:   fonts.ui,
            letterSpacing:'0.1em',
          }}>
            {flightResult.baseDifficulty.toUpperCase()}
          </div>
          <div style={{
            padding:      '2px 10px',
            borderRadius: radius.pill,
            background:   `${fieldingColor}15`,
            border:       `1.5px solid ${fieldingColor}60`,
            color:        fieldingColor,
            fontSize:     '0.65rem',
            fontWeight:   900,
            fontFamily:   fonts.ui,
            letterSpacing:'0.08em',
            textShadow:   `0 0 8px ${fieldingColor}66`,
          }}>
            {fieldingLabel}
          </div>
        </div>

        {/* Runner decision rows */}
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
          onClick={() => allDecided && onResolve(decisions)}
          disabled={!allDecided}
          whileHover={allDecided ? { scale: 1.015 } : {}}
          whileTap={allDecided ? { scale: 0.975 } : {}}
          style={{
            padding:      '11px',
            borderRadius: radius.md,
            fontFamily:   fonts.ui,
            fontSize:     fontSize.sm,
            fontWeight:   900,
            letterSpacing:'0.14em',
            cursor:       allDecided ? 'pointer' : 'not-allowed',
            border:       `1.5px solid ${allDecided ? 'rgba(251,191,36,0.65)' : 'rgba(255,255,255,0.08)'}`,
            background:   allDecided ? 'rgba(251,191,36,0.14)' : 'rgba(255,255,255,0.03)',
            color:        allDecided ? '#fbbf24' : 'rgba(255,255,255,0.2)',
            boxShadow:    allDecided ? '0 0 20px rgba(251,191,36,0.2)' : 'none',
            textShadow:   allDecided ? '0 0 10px rgba(251,191,36,0.55)' : 'none',
            transition:   'all 0.12s',
            width:        '100%',
            marginTop:    '2px',
          }}
        >
          {decisionScenarios.length === 0 || allDecided
            ? 'RESOLVE PLAY →'
            : `DECIDE ALL RUNNERS (${Object.keys(decisions).length} / ${decisionScenarios.length})`
          }
        </motion.button>
      </div>
    </div>
  )
}
