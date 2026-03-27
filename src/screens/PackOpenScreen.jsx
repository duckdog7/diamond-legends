/**
 * PackOpenScreen.jsx
 * Animated pack opening — 5 face-down cards, click each to flip with rarity flash.
 *
 * Props:
 *   cards       Card[] — the drawn cards (from collectionStore.openPack)
 *   packLabel   string
 *   onDone      fn()
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from '../components/Card'
import { colors, fonts, fontSize, radius } from '../theme'

// ─── Design tokens ────────────────────────────────────────────────────────────
const STYLES = {
  screen: {
    bg:      'radial-gradient(ellipse at 50% 30%, #1a1040 0%, #080814 70%)',
    minH:    '100vh',
    font:    fonts.body,
    color:   colors.text.primary,
    padding: '32px 20px',
  },
  header: {
    titleSize:  '1.3rem',
    titleFont:  fonts.ui,
    subSize:    fontSize.xs,
    subColor:   colors.text.muted,
  },
  cardSlot: {
    gap:        '16px',
    // Face-down card
    facedown: {
      bg:      'linear-gradient(135deg, #1a1a3a 0%, #0e0e28 100%)',
      border:  '2px solid rgba(255,255,255,0.15)',
      radius:  '10px',
      cursor:  'pointer',
      hoverBorder: '2px solid rgba(255,255,255,0.4)',
    },
  },
  rarityFlash: {
    common:   'rgba(156,163,175,0.3)',
    uncommon: 'rgba(52,211,153,0.4)',
    rare:     'rgba(129,140,248,0.5)',
    legend:   'rgba(245,158,11,0.6)',
  },
  revealLabel: {
    fontSize: fontSize.xxs,
    color:    colors.text.muted,
    spacing:  '0.14em',
  },
  doneBtn: {
    padding: '10px 36px',
    radius:  radius.lg,
    bg:      'rgba(255,255,255,0.1)',
    border:  '1px solid rgba(255,255,255,0.3)',
    color:   colors.text.primary,
    fontSize:'0.72rem',
    font:    fonts.ui,
  },
}

const RARITY_GLOW = {
  common:   'none',
  uncommon: '0 0 30px rgba(52,211,153,0.5)',
  rare:     '0 0 40px rgba(129,140,248,0.6)',
  legend:   '0 0 60px rgba(245,158,11,0.8)',
}

export default function PackOpenScreen({ cards, packLabel, onDone }) {
  const [revealed, setRevealed] = useState(new Set())
  const [flashing, setFlashing] = useState(null)

  const allRevealed = revealed.size >= cards.length

  function revealCard(idx) {
    if (revealed.has(idx)) return
    const rarity = cards[idx]?.rarity ?? 'common'

    // Flash effect
    setFlashing(idx)
    setTimeout(() => setFlashing(null), 600)

    setRevealed(prev => new Set([...prev, idx]))
  }

  function revealAll() {
    setRevealed(new Set(cards.map((_, i) => i)))
  }

  return (
    <div style={{
      background: STYLES.screen.bg,
      minHeight:  STYLES.screen.minH,
      fontFamily: STYLES.screen.font,
      color:      STYLES.screen.color,
      display:    'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding:    STYLES.screen.padding,
      gap:        '28px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: STYLES.header.titleSize, fontWeight: 900, fontFamily: STYLES.header.titleFont, letterSpacing: '0.06em' }}>
          {packLabel.toUpperCase()}
        </div>
        <div style={{ fontSize: STYLES.header.subSize, color: STYLES.header.subColor, marginTop: '4px' }}>
          {allRevealed
            ? 'All cards revealed'
            : `${revealed.size} / ${cards.length} revealed — click to flip`
          }
        </div>
      </div>

      {/* Card slots */}
      <div style={{
        display:  'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap:      STYLES.cardSlot.gap,
      }}>
        {cards.map((card, idx) => {
          const isRevealed = revealed.has(idx)
          const isFlashing = flashing === idx
          const rarity     = card.rarity ?? 'common'

          return (
            <div key={idx} style={{ position: 'relative' }}>
              {/* Rarity flash overlay */}
              <AnimatePresence>
                {isFlashing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      position:     'absolute',
                      inset:        '-12px',
                      borderRadius: '14px',
                      background:   STYLES.rarityFlash[rarity],
                      boxShadow:    RARITY_GLOW[rarity],
                      zIndex:       10,
                      pointerEvents:'none',
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Card flip */}
              <motion.div
                onClick={() => !isRevealed && revealCard(idx)}
                style={{
                  width:    '200px',
                  height:   '280px',
                  cursor:   isRevealed ? 'default' : 'pointer',
                  perspective: '800px',
                }}
              >
                <motion.div
                  animate={{ rotateY: isRevealed ? 0 : 180 }}
                  initial={{ rotateY: 180 }}
                  transition={{ duration: 0.5, type: 'spring', stiffness: 80 }}
                  style={{
                    width: '100%', height: '100%',
                    transformStyle: 'preserve-3d',
                    position: 'relative',
                  }}
                >
                  {/* Front — card */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}>
                    <Card card={card} size="md" />
                  </div>

                  {/* Back — face-down */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background:   STYLES.cardSlot.facedown.bg,
                    border:       STYLES.cardSlot.facedown.border,
                    borderRadius: STYLES.cardSlot.facedown.radius,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      fontSize: '2rem', opacity: 0.3,
                      fontFamily: fonts.ui,
                      color: '#fff',
                    }}>◇</div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Rarity label under revealed card */}
              {isRevealed && (
                <div style={{
                  textAlign: 'center', marginTop: '6px',
                  fontSize:  STYLES.revealLabel.fontSize,
                  color:     colors.rarity[rarity] ?? colors.text.muted,
                  fontWeight: 900, fontFamily: fonts.ui,
                  letterSpacing: STYLES.revealLabel.spacing,
                }}>
                  {rarity.toUpperCase()}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        {!allRevealed && (
          <motion.button
            onClick={revealAll}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding:      STYLES.doneBtn.padding,
              borderRadius: STYLES.doneBtn.radius,
              background:   'rgba(255,255,255,0.05)',
              border:       '1px solid rgba(255,255,255,0.15)',
              color:        colors.text.secondary,
              fontSize:     STYLES.doneBtn.fontSize,
              fontFamily:   STYLES.doneBtn.font,
              fontWeight:   900,
              cursor:       'pointer',
              letterSpacing:'0.1em',
            }}
          >
            REVEAL ALL
          </motion.button>
        )}
        {allRevealed && (
          <motion.button
            onClick={onDone}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding:      STYLES.doneBtn.padding,
              borderRadius: STYLES.doneBtn.radius,
              background:   STYLES.doneBtn.bg,
              border:       STYLES.doneBtn.border,
              color:        STYLES.doneBtn.color,
              fontSize:     STYLES.doneBtn.fontSize,
              fontFamily:   STYLES.doneBtn.font,
              fontWeight:   900,
              cursor:       'pointer',
              letterSpacing:'0.1em',
            }}
          >
            ADD TO COLLECTION →
          </motion.button>
        )}
      </div>
    </div>
  )
}
