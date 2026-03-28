/**
 * AtBatHUD.jsx
 * Two-row sticky header:
 *   Row 1: [logo] team  score · score  team [logo]  ║  inning-by-inning box score
 *   Row 2: COUNT dots  OUTS dots  ▲ inning/phase    ║  base diamond  (last pitch)
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
  inningScores  = { away: [], home: [] },
}) {
  const accentColor  = isPitching ? 'rgba(251,191,36,0.10)' : 'rgba(96,165,250,0.07)'
  const accentBorder = isPitching ? 'rgba(251,191,36,0.22)'  : 'rgba(96,165,250,0.16)'

  return (
    <div style={{
      background:   `linear-gradient(90deg, rgba(4,4,14,0.98) 0%, ${accentColor} 50%, rgba(4,4,14,0.98) 100%)`,
      borderBottom: `1px solid ${accentBorder}`,
      fontFamily:   fonts.ui,
      position:     'sticky',
      top:          0,
      zIndex:       20,
    }}>

      {/* ── Row 1: Score center-left | Divider | Box score center-right ──── */}
      <div style={{
        display:         'flex',
        alignItems:      'stretch',
        justifyContent:  'center',
        borderBottom:    '1px solid rgba(255,255,255,0.06)',
        minHeight:       '58px',
      }}>

        {/* Scores */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'flex-end',
          gap:            '10px',
          padding:        '8px 20px',
          flex:           '0 0 auto',
        }}>
          <TeamScoreBlock team={awayTeam} score={score.away} side="left"  isPitching={isPitching} half={half} />
          <div style={{
            fontSize:      fontSize.xs,
            fontWeight:    900,
            color:         'rgba(255,255,255,0.22)',
            letterSpacing: '0.06em',
            padding:       '0 6px',
          }}>
            VS
          </div>
          <TeamScoreBlock team={homeTeam} score={score.home} side="right" isPitching={isPitching} half={half} />
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Line score */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'flex-start',
          padding:        '0 20px',
          overflowX:      'auto',
          flex:           '0 0 auto',
        }}>
          <LineScoreInline
            inningScores={inningScores}
            currentInning={inning}
            half={half}
            awayName={awayTeam?.abbreviation ?? awayTeam?.name ?? 'AWAY'}
            homeName={homeTeam?.abbreviation ?? homeTeam?.name ?? 'HOME'}
          />
        </div>
      </div>

      {/* ── Row 2: Count / Outs / Inning / Bases — all centered ──────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '7px 20px',
        gap:            '20px',
        minHeight:      '44px',
      }}>

        {/* Count */}
        <LabeledDots label="COUNT">
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {[0,1,2,3].map(i => <Dot key={`b${i}`} filled={i < count.balls}   color="#22c55e" />)}
            <div style={{ width: '5px' }} />
            {[0,1,2].map(i =>   <Dot key={`s${i}`} filled={i < count.strikes} color="#ef4444" />)}
          </div>
        </LabeledDots>

        <Sep />

        {/* Outs */}
        <LabeledDots label="OUTS">
          <div style={{ display: 'flex', gap: '5px' }}>
            {[0,1,2].map(i => <Dot key={i} filled={i < outs} color="#f59e0b" />)}
          </div>
        </LabeledDots>

        <Sep />

        {/* Inning + phase */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div style={{
            fontSize:      fontSize.sm,
            color:         colors.text.primary,
            fontWeight:    900,
            lineHeight:    1,
            letterSpacing: '0.04em',
          }}>
            {half === 'top' ? '▲' : '▼'} {inning}
          </div>
          <div style={{
            fontSize:      fontSize.xxs,
            fontWeight:    900,
            color:         PHASE_COLORS[phase],
            background:    PHASE_COLORS[phase].replace('0.85', '0.12'),
            borderRadius:  radius.pill,
            padding:       '1px 7px',
            letterSpacing: '0.12em',
          }}>
            {PHASE_LABELS[phase]}
          </div>
        </div>

        <Sep />

        {/* Bases */}
        <BaseDiamond bases={bases} />

        {/* Last pitch badge */}
        {lastPitchType && (
          <>
            <Sep />
            <div style={{
              padding:      '3px 10px',
              background:   `${PITCH_COLORS[lastPitchType] ?? '#fff'}1a`,
              border:       `1px solid ${PITCH_COLORS[lastPitchType] ?? '#fff'}50`,
              borderRadius: radius.md,
              textAlign:    'center',
            }}>
              <div style={{ fontSize: fontSize.xxs, color: colors.text.label, letterSpacing: '0.1em' }}>PITCH</div>
              <div style={{ fontSize: fontSize.sm, color: PITCH_COLORS[lastPitchType] ?? '#fff', fontWeight: 900 }}>
                {PITCH_LABELS[lastPitchType] ?? lastPitchType}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Team score block (logo + name + score) ───────────────────────────────────
function TeamScoreBlock({ team, score, side, isPitching, half }) {
  const isLeft      = side === 'left'
  const name        = team?.name ?? (isLeft ? 'AWAY' : 'HOME')
  const fid         = team?.franchiseId ?? ''
  const primary     = team?.primary  ?? '#1a2040'
  const secondary   = team?.secondary ?? '#ffffff'
  const highlighted = (side === 'left' && !isPitching) || (side === 'right' && isPitching)

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            '10px',
      flexDirection:  isLeft ? 'row' : 'row-reverse',
    }}>
      {/* Logo */}
      <div style={{
        borderRadius: '50%',
        background:   `${primary}44`,
        border:       `2px solid ${highlighted ? secondary : 'rgba(255,255,255,0.1)'}`,
        padding:      '2px',
        boxShadow:    highlighted ? `0 0 12px ${secondary}50` : 'none',
        flexShrink:   0,
        transition:   'all 0.3s',
      }}>
        <TeamLogo franchiseId={fid} size={32} />
      </div>

      {/* Name + score */}
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    isLeft ? 'flex-end' : 'flex-start',
        gap:           '0px',
      }}>
        <div style={{
          fontSize:      fontSize.xxs,
          color:         highlighted ? '#fff' : colors.text.secondary,
          fontWeight:    900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight:    1.1,
          transition:    'color 0.3s',
        }}>
          {name}
        </div>
        <div style={{
          fontSize:      '2.2rem',
          fontWeight:    900,
          color:         '#fff',
          lineHeight:    1,
          letterSpacing: '-0.02em',
          textShadow:    highlighted ? `0 0 18px ${secondary}55` : 'none',
          transition:    'text-shadow 0.3s',
        }}>
          {score}
        </div>
      </div>
    </div>
  )
}

// ─── Inline line score ────────────────────────────────────────────────────────
function LineScoreInline({ inningScores, currentInning, half, awayName, homeName, maxInnings = 9 }) {
  const innings  = Array.from({ length: maxInnings }, (_, i) => i + 1)
  const awayTotal = inningScores.away.reduce((a, b) => a + (b ?? 0), 0)
  const homeTotal = inningScores.home.reduce((a, b) => a + (b ?? 0), 0)

  const cellStyle = {
    fontSize:   '0.72rem',
    textAlign:  'center',
    width:      '28px',
    height:     '18px',
    padding:    '1px 2px',
    borderLeft: '1px solid rgba(255,255,255,0.05)',
    fontFamily: fonts.ui,
  }
  const labelStyle = {
    fontSize:      '0.68rem',
    paddingRight:  '12px',
    fontFamily:    fonts.ui,
    whiteSpace:    'nowrap',
    letterSpacing: '0.08em',
    width:         '52px',
  }
  const totalStyle = {
    fontSize:   '0.82rem',
    fontWeight: 900,
    textAlign:  'center',
    padding:    '1px 10px',
    borderLeft: '2px solid rgba(255,255,255,0.12)',
    fontFamily: fonts.ui,
    color:      '#fff',
  }

  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {/* Header row */}
        <tr>
          <td style={{ ...labelStyle, color: 'transparent' }}>—</td>
          {innings.map(n => (
            <td key={n} style={{
              ...cellStyle,
              color:      n === currentInning ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)',
              fontWeight: n === currentInning ? 700 : 400,
            }}>
              {n}
            </td>
          ))}
          <td style={{ ...totalStyle, color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.68rem' }}>R</td>
        </tr>

        {/* Away row */}
        <ScoreRow
          label={awayName}
          scores={inningScores.away}
          total={awayTotal}
          innings={innings}
          currentInning={currentInning}
          isActive={half === 'top'}
          labelStyle={labelStyle}
          cellStyle={cellStyle}
          totalStyle={totalStyle}
        />

        {/* Home row */}
        <ScoreRow
          label={homeName}
          scores={inningScores.home}
          total={homeTotal}
          innings={innings}
          currentInning={currentInning}
          isActive={half === 'bottom'}
          labelStyle={labelStyle}
          cellStyle={cellStyle}
          totalStyle={totalStyle}
        />
      </tbody>
    </table>
  )
}

function ScoreRow({ label, scores, total, innings, currentInning, isActive, labelStyle, cellStyle, totalStyle }) {
  return (
    <tr>
      <td style={{
        ...labelStyle,
        color:      isActive ? '#fff' : 'rgba(255,255,255,0.4)',
        fontWeight: isActive ? 900 : 400,
      }}>
        {isActive ? '▶ ' : ''}{label}
      </td>
      {innings.map((n, i) => {
        const val    = scores[i]
        const isCur  = n === currentInning && isActive
        return (
          <td key={n} style={{
            ...cellStyle,
            background: isCur ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: val != null
              ? (val > 0 ? '#22c55e' : 'rgba(255,255,255,0.5)')
              : 'rgba(255,255,255,0.12)',
            fontWeight: val > 0 ? 700 : 400,
          }}>
            {val != null ? val : '·'}
          </td>
        )
      })}
      <td style={totalStyle}>{total}</td>
    </tr>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function LabeledDots({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ fontSize: fontSize.xxs, color: colors.text.label, letterSpacing: '0.12em' }}>{label}</div>
      {children}
    </div>
  )
}

function Dot({ filled, color }) {
  return (
    <div style={{
      width:      '12px',
      height:     '12px',
      borderRadius: '50%',
      background: filled ? color : 'rgba(255,255,255,0.08)',
      border:     `1.5px solid ${filled ? color : 'rgba(255,255,255,0.18)'}`,
      boxShadow:  filled ? `0 0 5px ${color}70` : 'none',
      transition: 'all 0.15s',
    }} />
  )
}

function Sep() {
  return <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
}

function BaseDiamond({ bases }) {
  const sz = 48, cx = 24, cy = 24, r = 14
  const pts = { '1B': [cx+r, cy], '2B': [cx, cy-r], '3B': [cx-r, cy] }
  return (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
      <polygon
        points={`${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}`}
        fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"
      />
      <circle cx={cx} cy={cy+r} r={2.5} fill="rgba(255,255,255,0.3)" />
      {Object.entries(pts).map(([base, [bx, by]]) => {
        const occupied = base === '1B' ? bases[0] : base === '2B' ? bases[1] : bases[2]
        return (
          <rect key={base}
            x={bx-5} y={by-5} width={10} height={10} rx={1.5}
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
