/**
 * ZoneGrid.jsx
 * 3×3 interactive pitch zone grid.
 * Modes: 'pitch' (pitcher selects zone) | 'guess' (batter predicts zone) | 'view' (read-only)
 *
 * Props:
 *   mode            'pitch' | 'guess' | 'view'
 *   selectedZone    string | null  — currently selected zone
 *   onSelect        fn(zone)       — called on confirm
 *   tendencies      { [zone]: number }  — 0–1 percentage overlays (pitcher view)
 *   fatiguedZones   string[]       — zones that are depleted (shown dimmed)
 *   pitchHistory    [{ zone, pitchType }]  — last 3 pitches for trail
 *   revealedZone    string | null  — pitcher's actual zone (shown after pitch)
 *   disabled        boolean
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, fonts, fontSize, zoneGrid as zg } from '../theme'

// ─── Design tokens — edit here for visual changes ────────────────────────────
const STYLES = {
  cell: {
    size:        zg.cellSize,
    gap:         zg.gap,
    radius:      zg.cellRadius,
    bg:          zg.bg,
    border:      zg.border,
    fatigue:     zg.fatigue,
  },
  tendency: {
    fill:        zg.tendency.fillColor,
    line:        zg.tendency.lineColor,
    labelColor:  zg.tendency.labelColor,
    labelSize:   zg.tendency.labelSize,
    labelFont:   fonts.mono,
  },
  trail: {
    dotSize:     zg.trail.dotSize,
    opacities:   zg.trail.opacities,
    spacing:     zg.trail.spacing,
    colors:      colors.pitch,
  },
  confirm: {
    ringSize:    28,
    ringColor:   'rgba(255,255,200,0.9)',
    dotSize:     8,
  },
  hint: {
    fontSize:    fontSize.xxs,
    color:       colors.text.muted,
  },
  pitchColors: colors.pitch,
}

const ZONES = [
  ['TL', 'TC', 'TR'],
  ['ML', 'MC', 'MR'],
  ['BL', 'BC', 'BR'],
]

const ZONE_LABELS = {
  TL: 'High\nIn',  TC: 'High\nMid', TR: 'High\nAway',
  ML: 'Mid\nIn',   MC: 'Mid\nMid',  MR: 'Mid\nAway',
  BL: 'Low\nIn',   BC: 'Low\nMid',  BR: 'Low\nAway',
}

const PITCH_COLORS = {
  FB: '#ef4444', CB: '#3b82f6', CH: '#22c55e',
  SL: '#f59e0b', SK: '#8b5cf6', CF: '#ec4899', KN: '#ffffff',
}

const TRAIL_OPACITY = [0.85, 0.5, 0.25]  // most recent first

export default function ZoneGrid({
  mode = 'view',
  selectedZone = null,
  onSelect,
  tendencies = {},
  fatiguedZones = [],
  pitchHistory = [],
  revealedZone = null,
  disabled = false,
}) {
  const [pending, setPending] = useState(null)   // zone awaiting confirm

  const recentPitches = pitchHistory.slice(-3).reverse()

  function handleZoneClick(zone) {
    if (disabled || mode === 'view') return
    if (pending === zone) {
      // Confirm
      onSelect?.(zone)
      setPending(null)
    } else {
      setPending(zone)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      userSelect: 'none',
    }}>
      {ZONES.map((row, rowIdx) => (
        <div key={rowIdx} style={{ display: 'flex', gap: '3px' }}>
          {row.map(zone => {
            const isFatigued  = fatiguedZones.includes(zone)
            const isPending   = pending === zone
            const isSelected  = selectedZone === zone
            const isRevealed  = revealedZone === zone
            const tendency    = tendencies[zone]
            const trailEntries = recentPitches
              .map((p, i) => p.zone === zone ? { pitchType: p.pitchType, age: i } : null)
              .filter(Boolean)

            return (
              <ZoneCell
                key={zone}
                zone={zone}
                mode={mode}
                isFatigued={isFatigued}
                isPending={isPending}
                isSelected={isSelected}
                isRevealed={isRevealed}
                tendency={tendency}
                trailEntries={trailEntries}
                disabled={disabled}
                onClick={() => handleZoneClick(zone)}
              />
            )
          })}
        </div>
      ))}
      {/* Confirm hint */}
      {pending && (
        <div style={{ textAlign: 'center', fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
          Click again to confirm · {ZONE_LABELS[pending]?.replace('\n', ' ')}
        </div>
      )}
    </div>
  )
}

function ZoneCell({
  zone, mode, isFatigued, isPending, isSelected, isRevealed,
  tendency, trailEntries, disabled, onClick,
}) {
  const isInteractive = mode !== 'view' && !disabled

  // Background color
  let bg = 'rgba(255,255,255,0.06)'
  if (isFatigued)  bg = 'rgba(255,255,255,0.02)'
  if (isPending)   bg = 'rgba(255,255,200,0.15)'
  if (isSelected)  bg = 'rgba(100,180,255,0.2)'
  if (isRevealed)  bg = 'rgba(255,80,80,0.25)'

  // Border
  let border = '1px solid rgba(255,255,255,0.12)'
  if (isPending)  border = '1px solid rgba(255,255,200,0.6)'
  if (isSelected) border = '1px solid rgba(100,180,255,0.7)'
  if (isRevealed) border = '1px solid rgba(255,80,80,0.8)'

  return (
    <motion.div
      onClick={onClick}
      whileHover={isInteractive ? { scale: 1.04, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
      whileTap={isInteractive ? { scale: 0.96 } : {}}
      style={{
        width: '72px',
        height: '72px',
        background: bg,
        border,
        borderRadius: '4px',
        position: 'relative',
        cursor: isInteractive ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: isFatigued ? 0.45 : 1,
        transition: 'background 0.15s, border 0.15s',
      }}
    >
      {/* Tendency overlay */}
      {tendency != null && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: `${tendency * 100}%`,
          background: 'rgba(255,200,80,0.12)',
          borderBottom: tendency > 0.05 ? '1px solid rgba(255,200,80,0.3)' : 'none',
          pointerEvents: 'none',
        }} />
      )}

      {/* Tendency percentage label */}
      {tendency != null && (
        <div style={{
          position: 'absolute',
          top: '3px', right: '4px',
          fontSize: '0.48rem',
          color: 'rgba(255,200,80,0.7)',
          fontFamily: 'monospace',
          fontWeight: 700,
        }}>
          {Math.round(tendency * 100)}%
        </div>
      )}

      {/* Fatigue marker */}
      {isFatigued && (
        <div style={{
          position: 'absolute',
          top: '2px', left: '4px',
          fontSize: '0.44rem',
          color: 'rgba(255,100,100,0.7)',
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}>
          SPENT
        </div>
      )}

      {/* Pitch history trail dots */}
      {trailEntries.map(({ pitchType, age }) => (
        <div
          key={age}
          style={{
            position: 'absolute',
            bottom: `${4 + age * 10}px`,
            left: '4px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: PITCH_COLORS[pitchType] ?? '#fff',
            opacity: TRAIL_OPACITY[age] ?? 0.2,
            boxShadow: `0 0 4px ${PITCH_COLORS[pitchType] ?? '#fff'}`,
          }}
        />
      ))}

      {/* Confirm indicator */}
      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            style={{
              width: '28px', height: '28px',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,200,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,200,0.9)' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected checkmark */}
      {isSelected && !isPending && (
        <div style={{ fontSize: '1.1rem', color: 'rgba(100,180,255,0.9)' }}>✓</div>
      )}

      {/* Revealed X */}
      {isRevealed && (
        <div style={{ fontSize: '0.9rem', color: 'rgba(255,80,80,0.9)', fontWeight: 900 }}>⚾</div>
      )}
    </motion.div>
  )
}
