/**
 * BatterPanel.jsx
 * Right panel in at-bat screen — batter card + game stats + powerups.
 * Shows: card, at-bat history, pitches seen, conditioning, 5 tools, available powerups.
 */

import Card from './Card'
import TokenMenu from './TokenMenu'
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

const OUTCOME_LABELS = {
  home_run:    '⚾ HR',
  triple:      '⚾ 3B',
  double:      '⚾ 2B',
  single:      '⚾ 1B',
  walk:        '⚾ BB',
  out:         '✕ OUT',
  strikeout:   'K',
  double_play: '✕ DP',
  error:       '⚠ E',
}

const OUTCOME_COLORS = {
  home_run: '#22c55e', triple: '#22c55e', double: '#22c55e',
  single: '#22c55e',   walk: '#60a5fa',
  out: 'rgba(255,255,255,0.35)', strikeout: '#ef4444', double_play: '#ef4444',
  error: '#f59e0b',
}

const TOOL_ORDER  = ['average', 'power', 'speed']
const TOOL_LABELS = { average: 'AVG', power: 'PWR', speed: 'SPD', fielding: 'FLD', arm: 'ARM' }
const TOOL_COLORS = {
  average: '#60a5fa', power: '#fbbf24', speed: '#a78bfa',
  fielding: '#34d399', arm: '#f87171',
}

function AtBatHistory({ atBatResults }) {
  if (!atBatResults || atBatResults.length === 0) return (
    <div>
      <div style={{ ...STYLES.label, marginBottom: '4px' }}>THIS GAME</div>
      <div style={{ fontSize: fontSize.xxs, color: colors.text.muted, fontFamily: fonts.ui }}>—</div>
    </div>
  )
  return (
    <div>
      <div style={{ ...STYLES.label, marginBottom: '5px' }}>THIS GAME</div>
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {atBatResults.map((r, i) => {
          const label = OUTCOME_LABELS[r] ?? r
          const color = OUTCOME_COLORS[r] ?? 'rgba(255,255,255,0.4)'
          return (
            <div key={i} style={{
              fontSize: fontSize.xxs, fontWeight: 900, fontFamily: fonts.ui,
              color,
              padding: '2px 5px',
              background: `${color}18`,
              border: `1px solid ${color}44`,
              borderRadius: '3px',
            }}>
              {label}
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
        const val   = tools[tool] ?? 50
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

export default function BatterPanel({
  card,
  tokenState,
  atBatResults = [],
  pitchesSeen  = 0,
  onSpendToken,
  phase        = 'early',
  showTokens   = true,
}) {
  if (!card) return null

  return (
    <div style={STYLES.panel}>
      <Card card={card} size="md" />

      <div style={STYLES.statBox}>
        <AtBatHistory atBatResults={atBatResults} />
        <ToolBars tools={card.tools} />
      </div>

      {showTokens && tokenState && onSpendToken && (
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: radius.md,
          padding: '10px 12px',
        }}>
          <div style={{ ...STYLES.label, marginBottom: '6px' }}>POWER-UPS</div>
          <TokenMenu
            side="batting"
            pool={tokenState.batting}
            onSpend={onSpendToken}
            phase={phase}
          />
        </div>
      )}
    </div>
  )
}
