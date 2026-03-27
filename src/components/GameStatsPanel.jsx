/**
 * GameStatsPanel.jsx
 * Right two-thirds of the bottom panel — tabbed stats view.
 *
 * BATTING tab  (default, always shows the batting team):
 *   Full lineup with AB, H, HR, BB, K, AVG per batter.
 * PITCHING tab:
 *   Pitcher game line: pitch count, condition, type breakdown, remaining budget.
 */

import { useState } from 'react'
import { fonts } from '../theme'
import { PITCH_COLORS } from './ZoneCanvas'

const PITCH_NAMES = {
  FB: 'Fastball', CB: 'Curveball', CH: 'Changeup',
  SL: 'Slider',   SK: 'Sinker',   CF: 'Cut FB',   KN: 'Knuckleball',
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:      '4px 14px',
      borderRadius: '4px 4px 0 0',
      fontSize:     '0.72rem',
      fontWeight:   900,
      letterSpacing:'0.1em',
      cursor:       'pointer',
      border:       `1px solid ${active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
      borderBottom: active ? '1px solid rgba(0,0,0,0)' : '1px solid rgba(255,255,255,0.08)',
      background:   active ? 'rgba(255,255,255,0.08)' : 'transparent',
      color:        active ? '#fff' : 'rgba(255,255,255,0.4)',
      fontFamily:   fonts.ui,
      transition:   'all 0.12s',
    }}>
      {children}
    </button>
  )
}

// ─── Batting stats table ──────────────────────────────────────────────────────
function BattingTable({ lineup, batterStats, currentBatterIdx }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <Th width="20px">#</Th>
          <Th align="left" width="88px">PLAYER</Th>
          <Th width="26px">POS</Th>
          <Th width="28px">AB</Th>
          <Th width="28px">H</Th>
          <Th width="28px">HR</Th>
          <Th width="28px">BB</Th>
          <Th width="28px">K</Th>
          <Th width="38px">AVG</Th>
        </tr>
      </thead>
      <tbody>
        {lineup.map((card, i) => {
          const stats     = batterStats[card?.id] ?? { ab: 0, h: 0, hr: 0, bb: 0, k: 0 }
          const hasBatted = stats.ab > 0 || stats.bb > 0
          const isCurrent = i === currentBatterIdx
          const avg       = stats.ab > 0
            ? (stats.h / stats.ab).toFixed(3).replace(/^0\./, '.')
            : hasBatted ? '.000' : '—'

          return (
            <tr key={card?.id ?? i} style={{
              background:   isCurrent ? 'rgba(255,255,255,0.06)' : 'transparent',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <Td color="rgba(255,255,255,0.35)" bold={isCurrent}>
                {isCurrent ? '▶' : i + 1}
              </Td>
              <Td align="left" bold={isCurrent}
                color={isCurrent ? '#fff' : hasBatted ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.38)'}>
                {card?.name ?? `Batter ${i + 1}`}
              </Td>
              <Td color="rgba(255,255,255,0.32)">{card?.position ?? '—'}</Td>
              <Td>{hasBatted ? stats.ab : '—'}</Td>
              <Td color={stats.h  > 0 ? '#22c55e' : undefined}>{hasBatted ? stats.h  : '—'}</Td>
              <Td color={stats.hr > 0 ? '#f59e0b' : undefined}>{hasBatted ? stats.hr : '—'}</Td>
              <Td color={stats.bb > 0 ? '#60a5fa' : undefined}>{hasBatted ? stats.bb : '—'}</Td>
              <Td color={stats.k  > 0 ? '#ef4444' : undefined}>{hasBatted ? stats.k  : '—'}</Td>
              <Td color={stats.ab > 0 ? '#fff' : 'rgba(255,255,255,0.22)'} bold={stats.ab > 0}>
                {avg}
              </Td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ─── Pitching stats ───────────────────────────────────────────────────────────
function PitchingTable({ pitcherCard, pitchState }) {
  const pitches    = pitchState?.totalPitches  ?? 0
  const maxPitches = pitchState?.maxPitches    ?? 100
  const remaining  = maxPitches - pitches
  const pctUsed    = pitches / maxPitches
  const condPct    = Math.round((1 - Math.min(1, Math.max(0, (pctUsed - 0.70) / 0.30))) * 100)
  const condColor  = condPct > 60 ? '#34d399' : condPct > 35 ? '#f59e0b' : '#ef4444'
  const typeBudget = pitchState?.typeBudget ?? {}
  const thrownTypes = Object.entries(typeBudget).filter(([, n]) => n > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Pitcher game line */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <Th align="left" width="90px">PITCHER</Th>
            <Th width="32px">PC</Th>
            <Th width="40px">MAX</Th>
            <Th width="40px">LEFT</Th>
            <Th width="44px">COND</Th>
            {thrownTypes.map(([t]) => <Th key={t} width="30px" color={PITCH_COLORS[t]}>{t}</Th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td align="left" bold color="rgba(255,255,255,0.85)">{pitcherCard?.name ?? 'Pitcher'}</Td>
            <Td bold>{pitches}</Td>
            <Td color="rgba(255,255,255,0.45)">{maxPitches}</Td>
            <Td color={remaining > 20 ? '#34d399' : remaining > 10 ? '#f59e0b' : '#ef4444'} bold>
              {remaining}
            </Td>
            <Td bold color={condColor}>{condPct}%</Td>
            {thrownTypes.map(([t, n]) => (
              <Td key={t} color={PITCH_COLORS[t] ?? '#fff'}>{n}</Td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Zone budget remaining */}
      {pitchState?.remainingBudget && (
        <div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em',
                        fontFamily: fonts.ui, marginBottom: '6px' }}>
            ZONE BUDGET REMAINING
          </div>
          <ZoneBudgetGrid pitchState={pitchState} />
        </div>
      )}

      {/* Pitch type legend */}
      {thrownTypes.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {thrownTypes.map(([t, n]) => {
            const pct = pitches > 0 ? Math.round((n / pitches) * 100) : 0
            return (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%',
                              background: PITCH_COLORS[t] ?? '#fff' }} />
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontFamily: fonts.ui }}>
                  {PITCH_NAMES[t] ?? t} — {n} ({pct}%)
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Zone budget mini-grid (3×3) ──────────────────────────────────────────────
const ZONE_LAYOUT = [
  ['TL','TC','TR'],
  ['ML','MC','MR'],
  ['BL','BC','BR'],
]

function ZoneBudgetGrid({ pitchState }) {
  const rb       = pitchState.remainingBudget
  const ib       = pitchState.initialBudget
  const total    = Object.values(rb).reduce((a, b) => a + b, 0) || 1

  return (
    <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3, 46px)', gap: '2px' }}>
      {ZONE_LAYOUT.flat().map(zone => {
        const rem  = rb[zone] ?? 0
        const init = ib[zone] ?? 1
        const pct  = rem / total
        const depl = 1 - rem / Math.max(init, 1)
        const color = depl > 0.75 ? '#ef4444' : depl > 0.40 ? '#f59e0b' : '#22c55e'
        return (
          <div key={zone} style={{
            display:    'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height:     '34px',
            background: `${color}18`,
            border:     `1px solid ${color}44`,
            borderRadius: '3px',
          }}>
            <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontFamily: fonts.ui }}>
              {zone}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 900, color, fontFamily: fonts.ui }}>
              {rem}
            </div>
            <div style={{ fontSize: '0.60rem', color: 'rgba(255,255,255,0.3)', fontFamily: fonts.ui }}>
              {Math.round(pct * 100)}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Shared table cells ───────────────────────────────────────────────────────
function Th({ children, align = 'center', width, color }) {
  return (
    <th style={{
      fontSize:     '0.65rem',
      color:        color ?? 'rgba(255,255,255,0.35)',
      letterSpacing:'0.08em',
      fontFamily:   fonts.ui,
      fontWeight:   700,
      textAlign:    align,
      padding:      '2px 3px',
      width,
      whiteSpace:   'nowrap',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      {children}
    </th>
  )
}

function Td({ children, align = 'center', color, bold }) {
  return (
    <td style={{
      fontSize:     '0.72rem',
      color:        color ?? 'rgba(255,255,255,0.6)',
      fontWeight:   bold ? 900 : 400,
      fontFamily:   fonts.ui,
      textAlign:    align,
      padding:      '3px 3px',
      whiteSpace:   'nowrap',
      overflow:     align === 'left' ? 'hidden' : undefined,
      textOverflow: align === 'left' ? 'ellipsis' : undefined,
      maxWidth:     align === 'left' ? '90px' : undefined,
    }}>
      {children}
    </td>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function GameStatsPanel({ lineup, batterStats, currentBatterIdx, pitcherCard, pitchState, half = 'top' }) {
  const [tab, setTab] = useState('batting')  // always defaults to batting team

  const battingLabel  = half === 'top'    ? 'BATTING — AWAY'    : 'BATTING — HOME'
  const pitchingLabel = half === 'top'    ? 'PITCHING — HOME'   : 'PITCHING — AWAY'

  return (
    <div style={{
      flex:    1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{
        display:    'flex',
        gap:        '2px',
        padding:    '6px 16px 0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <TabBtn active={tab === 'batting'}  onClick={() => setTab('batting')}>
          {battingLabel}
        </TabBtn>
        <TabBtn active={tab === 'pitching'} onClick={() => setTab('pitching')}>
          {pitchingLabel}
        </TabBtn>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {tab === 'batting' && (
          <BattingTable
            lineup={lineup}
            batterStats={batterStats}
            currentBatterIdx={currentBatterIdx}
          />
        )}
        {tab === 'pitching' && (
          <PitchingTable
            pitcherCard={pitcherCard}
            pitchState={pitchState}
          />
        )}
      </div>
    </div>
  )
}
