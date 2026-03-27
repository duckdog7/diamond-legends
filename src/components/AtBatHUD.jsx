/**
 * AtBatHUD.jsx
 * Centered box-score strip — team logo + name + score | game info | score + name + logo
 */

import TeamLogo from './TeamLogo'
import { colors, fonts, fontSize, radius } from '../theme'

const PITCH_COLORS = {
  FB: '#ef4444', CB: '#3b82f6', CH: '#22c55e',
  SL: '#f59e0b', SK: '#8b5cf6', CF: '#ec4899', KN: '#94a3b8',
}
const PITCH_LABELS = {
  FB: 'Fastball', CB: 'Curveball', CH: 'Changeup',
  SL: 'Slider',   SK: 'Sinker',   CF: 'Cut FB',   KN: 'Knuckle',
}
const PHASE_COLORS = {
  early: 'rgba(100,150,255,0.85)',
  mid:   'rgba(255,180,60,0.85)',
  late:  'rgba(255,80,80,0.85)',
}
const PHASE_LABELS = { early: 'EARLY', mid: 'MID', late: 'LATE' }

export default function AtBatHUD({
  count         = { balls: 0, strikes: 0 },
  outs          = 0,
  inning        = 1,
  half          = 'top',
  score         = { home: 0, away: 0 },
  bases         = [false, false, false],
  lastPitchType = null,
  phase         = 'early',
  isPitching    = false,
  awayTeam      = null,
  homeTeam      = null,
}) {
  const accentColor  = isPitching ? 'rgba(251,191,36,0.18)' : 'rgba(96,165,250,0.14)'
  const accentBorder = isPitching ? 'rgba(251,191,36,0.3)'  : 'rgba(96,165,250,0.25)'

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            '0',
      padding:        '8px 24px',
      background:     `linear-gradient(90deg, rgba(4,4,14,0.98) 0%, ${accentColor} 50%, rgba(4,4,14,0.98) 100%)`,
      borderBottom:   `1px solid ${accentBorder}`,
      fontFamily:     fonts.ui,
      position:       'sticky',
      top:            0,
      zIndex:         20,
      minHeight:      '64px',
    }}>

      {/* ── Left: Away team ─────────────────────────────────────── */}
      <TeamScoreBlock
        team={awayTeam}
        score={score.away}
        label="AWAY"
        side="left"
        isPitching={isPitching}
      />

      {/* ── Center: Game status ─────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '14px',
        padding:        '0 28px',
        borderLeft:     '1px solid rgba(255,255,255,0.08)',
        borderRight:    '1px solid rgba(255,255,255,0.08)',
        flexShrink:     0,
      }}>

        {/* Inning + phase */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <div style={{
            fontSize: fontSize.lg, color: colors.text.primary,
            fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1,
          }}>
            {half === 'top' ? '▲' : '▼'} {inning}
          </div>
          <div style={{
            fontSize: fontSize.xxs, fontWeight: 900,
            color: PHASE_COLORS[phase],
            background: `${PHASE_COLORS[phase].replace('0.85','0.12')}`,
            borderRadius: radius.pill, padding: '2px 8px',
            letterSpacing: '0.12em',
          }}>
            {PHASE_LABELS[phase]}
          </div>
        </div>

        <div style={{ width:'1px', height:'32px', background:'rgba(255,255,255,0.08)' }}/>

        {/* Count */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: fontSize.xxs, color: colors.text.label, letterSpacing: '0.12em' }}>COUNT</div>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {[0,1,2,3].map(i => <Dot key={`b${i}`} filled={i < count.balls}  color="#22c55e" />)}
            <div style={{ width:'6px' }}/>
            {[0,1,2].map(i =>   <Dot key={`s${i}`} filled={i < count.strikes} color="#ef4444" />)}
          </div>
        </div>

        {/* Outs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: fontSize.xxs, color: colors.text.label, letterSpacing: '0.12em' }}>OUTS</div>
          <div style={{ display: 'flex', gap: '5px' }}>
            {[0,1,2].map(i => <Dot key={i} filled={i < outs} color="#f59e0b" />)}
          </div>
        </div>

        {/* Bases */}
        <BaseDiamond bases={bases} />

        {/* Last pitch badge */}
        {lastPitchType && (
          <>
            <div style={{ width:'1px', height:'32px', background:'rgba(255,255,255,0.08)' }}/>
            <div style={{
              padding: '4px 12px',
              background: `${PITCH_COLORS[lastPitchType] ?? '#fff'}1a`,
              border: `1px solid ${PITCH_COLORS[lastPitchType] ?? '#fff'}50`,
              borderRadius: radius.md,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: fontSize.xxs, color: colors.text.label, letterSpacing: '0.1em' }}>PITCH</div>
              <div style={{ fontSize: fontSize.sm, color: PITCH_COLORS[lastPitchType] ?? '#fff', fontWeight: 900 }}>
                {PITCH_LABELS[lastPitchType] ?? lastPitchType}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Right: Home team ────────────────────────────────────── */}
      <TeamScoreBlock
        team={homeTeam}
        score={score.home}
        label="HOME"
        side="right"
        isPitching={isPitching}
      />
    </div>
  )
}

// ─── Team score block ─────────────────────────────────────────────────────────
function TeamScoreBlock({ team, score, label, side, isPitching }) {
  const isLeft   = side === 'left'
  const name     = team?.name ?? label
  const fid      = team?.franchiseId ?? ''
  const primary  = team?.primary  ?? '#1a2040'
  const secondary = team?.secondary ?? '#ffffff'
  const highlighted = (side === 'left' && !isPitching) || (side === 'right' && isPitching)

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            '12px',
      flexDirection:  isLeft ? 'row' : 'row-reverse',
      padding:        isLeft ? '0 24px 0 0' : '0 0 0 24px',
      minWidth:       '200px',
      justifyContent: isLeft ? 'flex-end' : 'flex-start',
    }}>
      {/* Logo */}
      <div style={{
        borderRadius: '50%',
        background:   `${primary}44`,
        border:       `2px solid ${highlighted ? secondary : 'rgba(255,255,255,0.1)'}`,
        padding:      '3px',
        boxShadow:    highlighted ? `0 0 14px ${secondary}55` : 'none',
        flexShrink:   0,
        transition:   'all 0.3s',
      }}>
        <TeamLogo franchiseId={fid} size={36} />
      </div>

      {/* Name + score */}
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    isLeft ? 'flex-end' : 'flex-start',
        gap:           '1px',
      }}>
        <div style={{
          fontSize:      fontSize.xs,
          color:         highlighted ? '#fff' : colors.text.secondary,
          fontWeight:    900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          transition:    'color 0.3s',
        }}>
          {name}
        </div>
        <div style={{
          fontSize:      '2.6rem',
          fontWeight:    900,
          color:         '#fff',
          lineHeight:    1,
          letterSpacing: '-0.02em',
          textShadow:    highlighted ? `0 0 20px ${secondary}60` : 'none',
          transition:    'text-shadow 0.3s',
        }}>
          {score}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Dot({ filled, color }) {
  return (
    <div style={{
      width: '13px', height: '13px', borderRadius: '50%',
      background: filled ? color : 'rgba(255,255,255,0.08)',
      border: `1.5px solid ${filled ? color : 'rgba(255,255,255,0.18)'}`,
      boxShadow: filled ? `0 0 6px ${color}70` : 'none',
      transition: 'all 0.15s',
    }} />
  )
}

function BaseDiamond({ bases }) {
  const sz = 52, cx = 26, cy = 26, r = 15
  const pts = { '1B': [cx+r, cy], '2B': [cx, cy-r], '3B': [cx-r, cy] }
  return (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
      <polygon
        points={`${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}`}
        fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"
      />
      <circle cx={cx} cy={cy+r} r={3} fill="rgba(255,255,255,0.3)" />
      {Object.entries(pts).map(([base, [bx, by]]) => {
        const occupied = base === '1B' ? bases[0] : base === '2B' ? bases[1] : bases[2]
        return (
          <rect key={base}
            x={bx-5.5} y={by-5.5} width={11} height={11} rx={1.5}
            transform={`rotate(45,${bx},${by})`}
            fill={occupied ? '#f59e0b' : 'rgba(255,255,255,0.08)'}
            stroke={occupied ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
            strokeWidth="1"
          />
        )
      })}
    </svg>
  )
}
