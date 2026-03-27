/**
 * PitcherPanel.jsx
 * Left panel in at-bat screen — pitcher card + game stats.
 * Shows: card, pitch count, last 10 pitches mini trail, 5 tool bars, conditioning.
 */

import Card from './Card'
import { PITCH_COLORS } from './ZoneCanvas'
import { colors, fonts, fontSize, radius } from '../theme'

const STYLES = {
  panel: {
    display:        'flex',
    flexDirection:  'column',
    gap:            '10px',
    alignItems:     'center',
  },
  statBox: {
    width:          '100%',
    background:     'rgba(255,255,255,0.04)',
    border:         '1px solid rgba(255,255,255,0.08)',
    borderRadius:   radius.md,
    padding:        '10px 12px',
    display:        'flex',
    flexDirection:  'column',
    gap:            '8px',
  },
  label: {
    fontSize:       fontSize.xxs,
    color:          colors.text.label,
    letterSpacing:  '0.12em',
    fontFamily:     fonts.ui,
  },
  value: {
    fontSize:       fontSize.sm,
    color:          colors.text.primary,
    fontWeight:     900,
    fontFamily:     fonts.ui,
  },
  toolBar: {
    height: '4px',
    borderRadius: radius.pill,
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  toolFill: {
    height: '100%',
    borderRadius: radius.pill,
    transition: 'width 0.3s ease',
  },
}

const PITCH_LABELS = {
  FB: 'FB', CB: 'CB', CH: 'CH', SL: 'SL', SK: 'SK', CF: 'CF', KN: 'KN',
}

const TOOL_ORDER = ['arm', 'average', 'fielding', 'power', 'speed']
const TOOL_LABELS = { arm: 'ARM', average: 'AVG', fielding: 'FLD', power: 'PWR', speed: 'SPD' }
const TOOL_COLORS = {
  arm:      '#f87171',
  average:  '#60a5fa',
  fielding: '#34d399',
  power:    '#fbbf24',
  speed:    '#a78bfa',
}

function ConditioningBar({ pitchState }) {
  const pitches    = pitchState?.totalPitches ?? 0
  const maxPitches = pitchState?.maxPitches   ?? 100
  // Linear decline from 100% at 0 pitches → 0% at max pitches
  const condition  = Math.max(0, 1 - pitches / maxPitches)
  const color = condition > 0.6 ? '#34d399' : condition > 0.35 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={STYLES.label}>CONDITION</div>
        <div style={{ fontSize: fontSize.xxs, color, fontWeight: 900, fontFamily: fonts.ui }}>
          {Math.round(condition * 100)}%
        </div>
      </div>
      <div style={STYLES.toolBar}>
        <div style={{ ...STYLES.toolFill, width: `${condition * 100}%`, background: color }} />
      </div>
    </div>
  )
}

function MiniPitchTrail({ pitchLog }) {
  // Last 10 pitches as colored dots
  const last10 = pitchLog.filter(p => p.pitchType).slice(-10)
  return (
    <div>
      <div style={{ ...STYLES.label, marginBottom: '5px' }}>LAST {last10.length} PITCHES</div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {last10.length === 0 && (
          <div style={{ fontSize: fontSize.xxs, color: colors.text.muted, fontFamily: fonts.ui }}>
            —
          </div>
        )}
        {last10.map((p, i) => {
          const color = PITCH_COLORS[p.pitchType] ?? '#fff'
          const wasHit = p.outcome && !['strikeout', 'out', 'double_play'].includes(p.outcome)
          return (
            <div key={i} style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: `${color}22`,
              border: `1.5px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: fontSize.xxs, fontWeight: 900, color,
              fontFamily: fonts.ui,
              position: 'relative',
            }}>
              {PITCH_LABELS[p.pitchType] ?? p.pitchType}
              {wasHit && (
                <div style={{
                  position: 'absolute', top: -3, right: -3,
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: '#fbbf24',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ToolBars({ tools }) {
  if (!tools) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ ...STYLES.label, marginBottom: '2px' }}>TOOLS</div>
      {TOOL_ORDER.map(tool => {
        const val = tools[tool] ?? 50
        const color = TOOL_COLORS[tool]
        return (
          <div key={tool}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ fontSize: fontSize.xxs, color: colors.text.muted, fontFamily: fonts.ui }}>
                {TOOL_LABELS[tool]}
              </div>
              <div style={{ fontSize: fontSize.xxs, color, fontWeight: 900, fontFamily: fonts.ui }}>
                {val}
              </div>
            </div>
            <div style={STYLES.toolBar}>
              <div style={{ ...STYLES.toolFill, width: `${val}%`, background: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PitcherPanel({ card, pitchState, pitchLog = [] }) {
  if (!card) return null
  const pitchCount = pitchState?.totalPitches ?? 0

  return (
    <div style={STYLES.panel}>
      <Card card={card} size="md" />

      <div style={STYLES.statBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={STYLES.label}>PITCHES</div>
          <div style={STYLES.value}>{pitchCount}</div>
        </div>
        <ConditioningBar pitchState={pitchState} />
        <MiniPitchTrail pitchLog={pitchLog} />
        <ToolBars tools={card.tools} />
      </div>
    </div>
  )
}
