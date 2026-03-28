/**
 * FieldView.jsx
 * Left-third of the bottom panel.
 * Displays a top-down SVG baseball field with:
 *   - Outfield grass + arc fence
 *   - Infield diamond
 *   - Pitcher mound, home plate, base paths
 *   - Fielder position dots (labeled by position)
 *   - Base runner indicators (amber glow when occupied)
 *   - Play-by-play log (last 5 events)
 */

import { fonts } from '../theme'

// ─── Field coordinate system (SVG 220×170) ───────────────────────────────────
const HOME    = [110, 148]
const FIRST   = [155, 105]
const SECOND  = [110,  62]
const THIRD   = [ 65, 105]
const PITCHER = [110, 105]

// Outfield fence arc control points
const LF_CORNER  = [ 18,  68]
const CF_APEX    = [110,  16]
const RF_CORNER  = [202,  68]

// Per-position SVG coordinates (9 fielders)
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

// ─── Field SVG ────────────────────────────────────────────────────────────────
function FieldSVG({ bases, defenseLineup, pitcherCard }) {
  // Build position → card map
  const fielderMap = {}
  if (pitcherCard) fielderMap['P'] = pitcherCard
  ;(defenseLineup ?? []).forEach(card => {
    const pos = card.position ?? card.slot
    if (pos && FIELDER_XY[pos]) fielderMap[pos] = card
  })

  const [b1, b2, b3] = bases ?? [false, false, false]

  const basePts = `${HOME[0]},${HOME[1]} ${FIRST[0]},${FIRST[1]} ${SECOND[0]},${SECOND[1]} ${THIRD[0]},${THIRD[1]}`

  return (
    <svg viewBox="0 0 220 170" style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* ── Grass background ── */}
      <rect x="0" y="0" width="220" height="170" fill="rgba(14,36,14,0.95)" />

      {/* ── Outfield grass wedge (inside foul lines + fence) ── */}
      <path
        d={`M ${HOME[0]},${HOME[1]}
            L ${LF_CORNER[0]},${LF_CORNER[1]}
            Q ${CF_APEX[0]},${CF_APEX[1]} ${RF_CORNER[0]},${RF_CORNER[1]}
            Z`}
        fill="rgba(28,68,28,0.9)"
      />

      {/* ── Infield dirt ── */}
      <polygon points={basePts} fill="rgba(145,92,46,0.40)" />

      {/* ── Outfield fence arc ── */}
      <path
        d={`M ${LF_CORNER[0]},${LF_CORNER[1]} Q ${CF_APEX[0]},${CF_APEX[1]} ${RF_CORNER[0]},${RF_CORNER[1]}`}
        fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"
      />

      {/* ── Foul lines ── */}
      <line x1={HOME[0]} y1={HOME[1]} x2={LF_CORNER[0] - 4} y2={LF_CORNER[1] - 10}
        stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
      <line x1={HOME[0]} y1={HOME[1]} x2={RF_CORNER[0] + 4} y2={RF_CORNER[1] - 10}
        stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />

      {/* ── Base path lines ── */}
      <polygon points={basePts} fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="0.9" />

      {/* ── Pitcher mound ── */}
      <circle cx={PITCHER[0]} cy={PITCHER[1]} r={7} fill="rgba(160,100,50,0.55)" />
      <circle cx={PITCHER[0]} cy={PITCHER[1]} r={2} fill="rgba(255,255,255,0.25)" />

      {/* ── Bases ── */}
      <HomePlate cx={HOME[0]} cy={HOME[1]} />
      <Base cx={FIRST[0]}  cy={FIRST[1]}  occupied={b1} runnerOffset={[8, -10]} />
      <Base cx={SECOND[0]} cy={SECOND[1]} occupied={b2} runnerOffset={[8, -10]} />
      <Base cx={THIRD[0]}  cy={THIRD[1]}  occupied={b3} runnerOffset={[-8, -10]} />

      {/* ── Fielders ── */}
      {Object.entries(FIELDER_XY).map(([pos, [fx, fy]]) => (
        <FielderDot key={pos} pos={pos} x={fx} y={fy} present={!!fielderMap[pos]} />
      ))}
    </svg>
  )
}

function HomePlate({ cx, cy }) {
  return (
    <polygon
      points={`${cx},${cy-5} ${cx+4},${cy-2} ${cx+4},${cy+3} ${cx-4},${cy+3} ${cx-4},${cy-2}`}
      fill="rgba(255,255,255,0.65)"
    />
  )
}

function Base({ cx, cy, occupied, runnerOffset }) {
  const [rx, ry] = runnerOffset
  return (
    <g>
      {occupied && (
        <circle cx={cx + rx} cy={cy + ry} r={5}
          fill="#f59e0b" stroke="#fbbf24" strokeWidth="1" opacity="0.95" />
      )}
      <rect
        x={cx - 5} y={cy - 5} width={10} height={10} rx={1}
        transform={`rotate(45,${cx},${cy})`}
        fill={occupied ? '#f59e0b' : 'rgba(255,255,255,0.45)'}
        stroke={occupied ? '#fbbf24' : 'rgba(255,255,255,0.55)'}
        strokeWidth="0.9"
      />
    </g>
  )
}

function FielderDot({ pos, x, y, present }) {
  return (
    <g>
      <circle cx={x} cy={y} r={8}
        fill={present ? 'rgba(80,120,255,0.8)' : 'rgba(80,80,80,0.5)'}
        stroke={present ? 'rgba(140,180,255,0.7)' : 'rgba(120,120,120,0.4)'}
        strokeWidth="0.8"
      />
      <text x={x} y={y + 3} textAnchor="middle"
        fontSize="5.5" fontWeight="900" fill="white"
        style={{ fontFamily: 'Arial Black, Arial, sans-serif', pointerEvents: 'none' }}
      >
        {pos}
      </text>
    </g>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function FieldView({ bases, defenseLineup, pitcherCard }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100%',
      padding:       '10px 12px',
      borderRight:   '1px solid rgba(255,255,255,0.07)',
      boxSizing:     'border-box',
    }}>
      <div style={{
        fontSize:      '0.65rem',
        color:         'rgba(255,255,255,0.3)',
        letterSpacing: '0.12em',
        fontFamily:    fonts.ui,
        marginBottom:  '4px',
      }}>
        FIELD
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <FieldSVG bases={bases} defenseLineup={defenseLineup} pitcherCard={pitcherCard} />
      </div>
    </div>
  )
}
