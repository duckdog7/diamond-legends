/**
 * RosterScreen.jsx
 * 15-man roster management: lineup order, bench swaps, pitcher selection.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRosterStore } from '../stores/rosterStore'
import { colors, fonts, fontSize, radius, spacing } from '../theme'

// ─── Design tokens ────────────────────────────────────────────────────────────
const STYLES = {
  screen: {
    bg:      'linear-gradient(160deg, #0a0a18 0%, #0e1020 100%)',
    minH:    'calc(100vh - 48px)',
    padding: '24px 20px',
    font:    fonts.body,
    color:   colors.text.primary,
  },
  section: {
    titleSize:    fontSize.xs,
    titleColor:   colors.text.muted,
    titleSpacing: '0.14em',
    divider:      '1px solid rgba(255,255,255,0.07)',
    mb:           '28px',
  },
  row: {
    height:    '54px',
    radius:    radius.md,
    bg:        'rgba(255,255,255,0.04)',
    bgHover:   'rgba(255,255,255,0.07)',
    bgSelected:'rgba(100,180,255,0.1)',
    border:    '1px solid rgba(255,255,255,0.07)',
    borderSelected: '1px solid rgba(100,180,255,0.4)',
    padding:   '0 12px',
    gap:       '10px',
  },
  slotNum: {
    size:    '30px',
    fontSize:fontSize.md,
    color:   colors.text.muted,
    font:    fonts.mono,
  },
  posBadge: {
    size:    '28px',
    radius:  radius.sm,
    fontSize:fontSize.xxs,
    font:    fonts.ui,
  },
  playerName: {
    fontSize: '0.65rem',
    font:     fonts.ui,
  },
  ovr: {
    fontSize: fontSize.md,
    font:     fonts.mono,
  },
  tools: {
    barW:    36,
    barH:    3,
    gap:     '2px',
    labelSz: '0.38rem',
  },
  benchLabel: {
    bg:      'rgba(255,255,255,0.05)',
    border:  '1px solid rgba(255,255,255,0.1)',
    radius:  radius.md,
    padding: '8px 12px',
  },
  pitcherPanel: {
    bg:      'rgba(255,255,255,0.04)',
    border:  '1px solid rgba(255,255,255,0.08)',
    radius:  radius.lg,
    padding: '14px',
  },
  swapPanel: {
    bg:      'rgba(8,8,22,0.98)',
    border:  '1px solid rgba(100,180,255,0.3)',
    radius:  radius.lg,
    padding: '14px',
    zIndex:  40,
  },
  playBtn: {
    padding: '11px 36px',
    radius:  radius.lg,
    bg:      'rgba(240,168,48,0.15)',
    border:  '1px solid rgba(240,168,48,0.4)',
    color:   colors.amber,
    fontSize:'0.72rem',
    font:    fonts.ui,
  },
}

const RARITY_COLORS = {
  common:   colors.rarity.common,
  uncommon: colors.rarity.uncommon,
  rare:     colors.rarity.rare,
  legend:   colors.rarity.legend,
}

const TOOL_DEFS = [
  { key: 'average',  label: 'AVG', color: '#60a5fa' },
  { key: 'power',    label: 'PWR', color: '#f87171' },
  { key: 'speed',    label: 'SPD', color: '#34d399' },
  { key: 'fielding', label: 'FLD', color: '#a78bfa' },
  { key: 'arm',      label: 'ARM', color: '#fbbf24' },
]

function overallRating(tools) {
  const w = { average: 0.25, power: 0.25, speed: 0.15, fielding: 0.2, arm: 0.15 }
  return Math.round(Object.entries(tools).reduce((s, [k, v]) => s + v * (w[k] ?? 0.2), 0))
}

function stripNickname(name = '') {
  return name.replace(/"[^"]*"/g, '').replace(/  +/g, ' ').trim()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RosterScreen({ onPlayGame }) {
  const store       = useRosterStore()
  const lineup      = store.getLineup()
  const bench       = store.getBench()
  const pitcher     = store.getPitcher()
  const allPitchers = store.getRoster().filter(c => c.position === 'SP' || c.position === 'RP')

  const [swappingIdx, setSwappingIdx]     = useState(null)   // lineup index being swapped
  const [swappingPitcher, setSwappingPitcher] = useState(false)

  function handleSwap(benchCard) {
    if (swappingIdx !== null) {
      store.swapLineupSpot(swappingIdx, benchCard.id)
      setSwappingIdx(null)
    }
  }

  function handlePitcherSwap(card) {
    store.setPitcher(card.id)
    setSwappingPitcher(false)
  }

  return (
    <div style={{
      background: STYLES.screen.bg,
      minHeight:  STYLES.screen.minH,
      padding:    STYLES.screen.padding,
      fontFamily: STYLES.screen.font,
      color:      STYLES.screen.color,
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: fonts.ui, letterSpacing: '0.04em' }}>MY ROSTER</div>
            <div style={{ fontSize: fontSize.xs, color: colors.text.muted, marginTop: '2px' }}>
              {lineup.length}/9 lineup · {bench.length} bench
            </div>
          </div>
          <motion.button
            onClick={onPlayGame}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding:      STYLES.playBtn.padding,
              borderRadius: STYLES.playBtn.radius,
              background:   STYLES.playBtn.bg,
              border:       STYLES.playBtn.border,
              color:        STYLES.playBtn.color,
              fontSize:     STYLES.playBtn.fontSize,
              fontFamily:   STYLES.playBtn.font,
              fontWeight:   900,
              cursor:       'pointer',
              letterSpacing:'0.1em',
            }}
          >
            ▶ PLAY GAME
          </motion.button>
        </div>

        {/* Pitcher */}
        <SectionHeader label="STARTING PITCHER" />
        <div style={{
          ...STYLES.pitcherPanel,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          {pitcher
            ? <PlayerRow card={pitcher} showPitchRep onClick={() => setSwappingPitcher(true)} />
            : <div style={{ color: colors.text.muted, fontSize: fontSize.xs }}>No pitcher set</div>
          }
          <button
            onClick={() => setSwappingPitcher(true)}
            style={{
              fontSize: fontSize.xxs, padding: '4px 10px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: radius.md, color: colors.text.secondary,
              cursor: 'pointer', letterSpacing: '0.1em', fontWeight: 700,
            }}
          >
            SWAP
          </button>
        </div>

        {/* Pitcher swap panel */}
        <AnimatePresence>
          {swappingPitcher && (
            <SwapPanel
              title="SELECT PITCHER"
              candidates={allPitchers}
              currentId={pitcher?.id}
              onSelect={handlePitcherSwap}
              onClose={() => setSwappingPitcher(false)}
            />
          )}
        </AnimatePresence>

        {/* Batting lineup */}
        <SectionHeader label="BATTING ORDER" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
          {Array.from({ length: 9 }).map((_, idx) => {
            const card     = lineup[idx]
            const selected = swappingIdx === idx
            return (
              <motion.div
                key={idx}
                onClick={() => setSwappingIdx(selected ? null : idx)}
                whileHover={{ x: 2 }}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  height:       STYLES.row.height,
                  borderRadius: STYLES.row.radius,
                  background:   selected ? STYLES.row.bgSelected : STYLES.row.bg,
                  border:       selected ? STYLES.row.borderSelected : STYLES.row.border,
                  padding:      STYLES.row.padding,
                  gap:          STYLES.row.gap,
                  cursor:       'pointer',
                  transition:   'all 0.12s',
                }}
              >
                {/* Batting order number */}
                <div style={{
                  width: STYLES.slotNum.size, textAlign: 'center',
                  fontSize: STYLES.slotNum.fontSize,
                  color: selected ? '#60a5fa' : STYLES.slotNum.color,
                  fontFamily: STYLES.slotNum.font,
                  fontWeight: 900,
                }}>
                  {idx + 1}
                </div>

                {card
                  ? <PlayerRow card={card} />
                  : <div style={{ color: colors.text.muted, fontSize: fontSize.xs, flex: 1 }}>— Empty slot —</div>
                }

                <div style={{ fontSize: fontSize.xxs, color: selected ? '#60a5fa' : colors.text.muted, marginLeft: 'auto' }}>
                  {selected ? 'Select from bench ↓' : 'SWAP'}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Swap panel (inline, slides in below active slot) */}
        <AnimatePresence>
          {swappingIdx !== null && (
            <SwapPanel
              title={`SELECT FOR SLOT ${swappingIdx + 1}`}
              candidates={bench}
              currentId={lineup[swappingIdx]?.id}
              onSelect={handleSwap}
              onClose={() => setSwappingIdx(null)}
            />
          )}
        </AnimatePresence>

        {/* Bench */}
        <SectionHeader label={`BENCH (${bench.length})`} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {bench.length === 0 && (
            <div style={{ color: colors.text.muted, fontSize: fontSize.xs, padding: '8px 0' }}>Bench is empty</div>
          )}
          {bench.map(card => (
            <div key={card.id} style={{
              display: 'flex', alignItems: 'center',
              height: STYLES.row.height,
              borderRadius: STYLES.row.radius,
              background: STYLES.row.bg,
              border: STYLES.row.border,
              padding: STYLES.row.padding,
              gap: STYLES.row.gap,
              opacity: 0.7,
            }}>
              <div style={{ width: STYLES.slotNum.size }} />
              <PlayerRow card={card} />
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }) {
  return (
    <div style={{
      fontSize:      STYLES.section.titleSize,
      color:         STYLES.section.titleColor,
      letterSpacing: STYLES.section.titleSpacing,
      fontWeight:    900,
      fontFamily:    fonts.ui,
      borderBottom:  STYLES.section.divider,
      paddingBottom: '6px',
      marginBottom:  '10px',
    }}>
      {label}
    </div>
  )
}

function PlayerRow({ card, showPitchRep = false, onClick }) {
  const ovr = overallRating(card.tools)
  const rarityColor = RARITY_COLORS[card.rarity] ?? RARITY_COLORS.common

  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Position badge */}
      <div style={{
        width: STYLES.posBadge.size, height: STYLES.posBadge.size,
        borderRadius: STYLES.posBadge.radius,
        background: `${rarityColor}22`,
        border: `1px solid ${rarityColor}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: STYLES.posBadge.fontSize,
        fontFamily: STYLES.posBadge.font,
        fontWeight: 900, color: rarityColor,
        flexShrink: 0,
      }}>
        {card.position}
      </div>

      {/* Name + era */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:   STYLES.playerName.fontSize,
          fontFamily: STYLES.playerName.font,
          fontWeight: 900,
          color:      colors.text.primary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {stripNickname(card.name)}
        </div>
        <div style={{ fontSize: fontSize.xxs, color: colors.text.muted, marginTop: '1px' }}>
          {card.era === 'deadball' ? 'Deadball' : 'Modern'} · {card.franchiseId}
          {showPitchRep && card.pitchRepertoire && (
            <span style={{ marginLeft: '6px', color: colors.text.secondary }}>
              {card.pitchRepertoire.join(' · ')}
            </span>
          )}
        </div>
      </div>

      {/* Tool bars */}
      <div style={{ display: 'flex', gap: STYLES.tools.gap, alignItems: 'flex-end' }}>
        {TOOL_DEFS.map(({ key, label, color }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div style={{
              width: STYLES.tools.barW + 'px',
              height: Math.round((card.tools[key] / 100) * 24) + 'px',
              minHeight: '2px',
              background: color,
              opacity: 0.7,
              borderRadius: '1px',
            }} />
            <div style={{ fontSize: STYLES.tools.labelSz, color: colors.text.muted, fontFamily: fonts.mono }}>{label}</div>
          </div>
        ))}
      </div>

      {/* OVR */}
      <div style={{
        fontSize:   STYLES.ovr.fontSize,
        fontFamily: STYLES.ovr.font,
        fontWeight: 900,
        color:      rarityColor,
        minWidth:   '28px',
        textAlign:  'right',
      }}>
        {ovr}
      </div>
    </div>
  )
}

function SwapPanel({ title, candidates, currentId, onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{
        ...STYLES.swapPanel,
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: fontSize.xxs, color: '#60a5fa', letterSpacing: '0.12em', fontWeight: 900, fontFamily: fonts.ui }}>
          {title}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: colors.text.muted,
            cursor: 'pointer', fontSize: fontSize.md, lineHeight: 1,
          }}
        >×</button>
      </div>

      {candidates.length === 0 && (
        <div style={{ color: colors.text.muted, fontSize: fontSize.xs, padding: '6px 0' }}>No eligible players</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {candidates.map(card => (
          <motion.div
            key={card.id}
            onClick={() => onSelect(card)}
            whileHover={{ x: 3 }}
            style={{
              display: 'flex', alignItems: 'center',
              height: STYLES.row.height,
              borderRadius: STYLES.row.radius,
              background: card.id === currentId ? STYLES.row.bgSelected : STYLES.row.bg,
              border: card.id === currentId ? STYLES.row.borderSelected : STYLES.row.border,
              padding: STYLES.row.padding,
              gap: STYLES.row.gap,
              cursor: 'pointer',
            }}
          >
            <div style={{ width: STYLES.slotNum.size }} />
            <PlayerRow card={card} />
            {card.id === currentId && (
              <div style={{ fontSize: fontSize.xxs, color: '#60a5fa', letterSpacing: '0.1em' }}>CURRENT</div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
