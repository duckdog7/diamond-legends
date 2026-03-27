/**
 * TokenMenu.jsx
 * Token spending menu — 4-tier selection with cost/balance display.
 * Separate views for batting effects and pitching effects.
 *
 * Props:
 *   side          'batting' | 'pitching'
 *   pool          TokenPool object { available, total, ... }
 *   onSpend       fn(effectId, cost)
 *   disabled      boolean
 *   phase         'early' | 'mid' | 'late'
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BATTING_EFFECTS, PITCHING_EFFECTS } from '../engine/tokens'
import { colors, fonts, fontSize, tokenMenu as tm, radius } from '../theme'

// ─── Design tokens — edit here for visual changes ────────────────────────────
const STYLES = {
  trigger: {
    bg:          colors.bg.panel,
    radius:      radius.md,
    padding:     '6px 12px',
    gap:         '8px',
    font:        fonts.body,
    // Token bubble
    bubble: {
      size:      28,
      radius:    '50%',
      bgOpacity: '22',
      borderWidth: 2,
      fontSize:  '0.75rem',
    },
    label: {
      size:  fontSize.xs,
      color: colors.text.secondary,
    },
    subLabel: {
      size:  '0.5rem',
      color: colors.text.muted,
    },
  },
  panel: {
    bg:       tm.panelBg,
    border:   tm.panelBorder,
    radius:   tm.panelRadius,
    padding:  '8px',
    gap:      '4px',
    zIndex:   50,
    headerSize: fontSize.xxs,
    headerColor: colors.text.muted,
  },
  row: {
    radius:      tm.rowRadius,
    padding:     '6px 8px',
    gap:         '8px',
    disabledOp: 0.3,
    hoverBg:    'rgba(255,255,255,0.03)',
    // Cost badge
    badge: {
      height:   tm.costBadgeH,
      minWidth: tm.costBadgeW,
      radius:   radius.sm,
      fontSize: '0.58rem',
    },
    // Labels
    nameSize:   '0.6rem',
    descSize:   '0.48rem',
    descColor:  'rgba(255,255,255,0.45)',
    tierSize:   '0.38rem',
  },
  tiers:   colors.tier,
  confirm: {
    fontSize: '0.5rem',
  },
}

const TIER_COLORS = {
  1:  '#94a3b8',   // Spark — gray-blue
  3:  '#34d399',   // Boost — green
  6:  '#818cf8',   // Surge — purple
  10: '#f59e0b',   // Blitz — gold
}

const TIER_NAMES = { 1: 'SPARK', 3: 'BOOST', 6: 'SURGE', 10: 'BLITZ' }

export default function TokenMenu({
  side = 'batting',
  pool = { available: 0, total: 0 },
  onSpend,
  disabled = false,
  phase = 'early',
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(null)

  const effects = side === 'batting' ? BATTING_EFFECTS : PITCHING_EFFECTS
  const color   = side === 'batting' ? '#60a5fa' : '#f87171'
  const label   = side === 'batting' ? 'Batting Tokens' : 'Pitching Tokens'

  function handleEffectClick(effectId, cost) {
    if (pool.available < cost || disabled) return
    if (confirming === effectId) {
      onSpend?.(effectId, cost)
      setConfirming(null)
      setExpanded(false)
    } else {
      setConfirming(effectId)
    }
  }

  return (
    <div style={{ position: 'relative', fontFamily: 'Arial, sans-serif' }}>
      {/* Token pool button */}
      <motion.button
        onClick={() => { setExpanded(e => !e); setConfirming(null) }}
        disabled={disabled}
        whileHover={!disabled ? { scale: 1.02 } : {}}
        whileTap={!disabled ? { scale: 0.97 } : {}}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(8,8,18,0.92)',
          border: `1px solid ${expanded ? color : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '6px', padding: '6px 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          color: '#fff',
          transition: 'border-color 0.15s',
        }}
      >
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: `${color}22`, border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 900, color,
        }}>
          {pool.available}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>{label.toUpperCase()}</div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>
            {pool.available} / {pool.total} available
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>
          {expanded ? '▲' : '▼'}
        </div>
      </motion.button>

      {/* Effects panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: 'rgba(8,8,22,0.97)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '8px',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: '240px',
            }}
          >
            <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: '4px' }}>
              CHOOSE AN EFFECT
            </div>
            {Object.entries(effects).map(([effectId, effect]) => {
              const canAfford = pool.available >= effect.cost
              const isConfirming = confirming === effectId
              const tierColor = TIER_COLORS[effect.cost] ?? '#fff'

              return (
                <motion.button
                  key={effectId}
                  onClick={() => handleEffectClick(effectId, effect.cost)}
                  disabled={!canAfford}
                  whileHover={canAfford ? { x: 2 } : {}}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: isConfirming ? `${tierColor}18` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isConfirming ? tierColor : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '5px',
                    padding: '6px 8px',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    opacity: canAfford ? 1 : 0.3,
                    textAlign: 'left',
                    color: '#fff',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                >
                  {/* Cost badge */}
                  <div style={{
                    minWidth: '28px', height: '20px',
                    background: `${tierColor}22`,
                    border: `1px solid ${tierColor}66`,
                    borderRadius: '3px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                  }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 900, color: tierColor, lineHeight: 1 }}>
                      {effect.cost}T
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff' }}>{effect.label}</span>
                      {TIER_NAMES[effect.cost] && (
                        <span style={{ fontSize: '0.38rem', color: tierColor, letterSpacing: '0.1em' }}>
                          {TIER_NAMES[effect.cost]}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.3 }}>
                      {effect.description}
                    </div>
                  </div>
                  {isConfirming && (
                    <div style={{ fontSize: '0.5rem', color: tierColor, fontWeight: 900, whiteSpace: 'nowrap' }}>
                      CONFIRM?
                    </div>
                  )}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
