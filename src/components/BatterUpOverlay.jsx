/**
 * BatterUpOverlay.jsx
 * Full-screen VS matchup reveal — MLB The Show inspired.
 *
 * Key features:
 *  - Diagonal split composition with team-colored panels
 *  - Actual Card component as the hero of each panel
 *  - Color brightening so dark fictional team colors still pop
 *  - Baseball field SVG background for depth
 *  - Animated VS badge between the panels
 *  - Name format: "F. LastName '25"
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from './Card'
import { getTeamForEra } from '../engine/teamUtils'
import { fonts } from '../theme'

const AUTO_DISMISS_MS = 2800
const DIAGONAL_PX     = 56   // how wide the diagonal seam is

const ERA_YEAR = { deadball: "'08", golden: "'55", hardball: "'82", modern: "'25" }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortName(name = '') {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0][0]}. ${parts[parts.length - 1]}`
}

function displayName(card) {
  return `${shortName(card?.name ?? '')} ${ERA_YEAR[card?.era] ?? ''}`
}

function hexToRgb(hex = '#111') {
  const h = hex.replace('#','').padEnd(6,'0')
  return [
    parseInt(h.slice(0,2),16),
    parseInt(h.slice(2,4),16),
    parseInt(h.slice(4,6),16),
  ]
}

// Blend hex colour toward white by `t` (0–1). Makes dark team colors pop.
function brighten(hex, t = 0.45) {
  const [r,g,b] = hexToRgb(hex)
  const br = Math.round(r + (255-r)*t)
  const bg = Math.round(g + (255-g)*t)
  const bb = Math.round(b + (255-b)*t)
  return `rgb(${br},${bg},${bb})`
}

// Returns `r,g,b` string for rgba() use
function rgb(hex) { return hexToRgb(hex).join(',') }

function overallRating(tools = {}) {
  const vals = Object.values(tools)
  if (!vals.length) return 70
  return Math.round(vals.reduce((a,b) => a+b, 0) / vals.length)
}

// ─── Baseball field SVG background ────────────────────────────────────────────
function FieldBackground() {
  return (
    <svg
      viewBox="0 0 900 500"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.22 }}
    >
      {/* Sky → grass gradient */}
      <defs>
        <radialGradient id="fieldGrad" cx="50%" cy="85%" r="70%">
          <stop offset="0%"   stopColor="#1a5c1a"/>
          <stop offset="60%"  stopColor="#0d3a0d"/>
          <stop offset="100%" stopColor="#050d05"/>
        </radialGradient>
        <radialGradient id="dirtGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#6b4423"/>
          <stop offset="100%" stopColor="#3d2410"/>
        </radialGradient>
      </defs>

      {/* Outfield */}
      <ellipse cx="450" cy="480" rx="440" ry="340" fill="url(#fieldGrad)"/>

      {/* Infield dirt circle */}
      <ellipse cx="450" cy="340" rx="155" ry="155" fill="url(#dirtGrad)" opacity="0.7"/>

      {/* Foul lines */}
      <line x1="450" y1="340" x2="0"   y2="30"  stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      <line x1="450" y1="340" x2="900" y2="30"  stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>

      {/* Diamond */}
      <polygon
        points="450,200 560,320 450,440 340,320"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="2"
      />

      {/* Bases */}
      {[[450,200],[560,320],[450,440],[340,320]].map(([x,y],i) => (
        <rect key={i}
          x={x-6} y={y-6} width={12} height={12}
          fill={i===0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.55)'}
          transform={`rotate(45,${x},${y})`}
        />
      ))}

      {/* Pitcher's mound */}
      <ellipse cx="450" cy="332" rx="14" ry="14" fill="rgba(180,130,80,0.6)"/>

      {/* Outfield arc */}
      <path
        d="M 80 440 A 400 320 0 0 1 820 440"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
        strokeDasharray="6 6"
      />
    </svg>
  )
}

// ─── Player panel ──────────────────────────────────────────────────────────────
function PlayerPanel({ card, side, label, delay = 0 }) {
  if (!card?.id) return <div style={{ flex: 1 }} />

  const isLeft    = side === 'left'
  const team      = getTeamForEra(card.franchiseId, card.era)
  const primary   = team?.primary   ?? '#1a2040'
  const secondary = team?.secondary ?? '#ffffff'
  const abbr      = team?.abbreviation ?? '??'
  const bright    = brighten(primary, 0.5)    // lightened primary for gradient top
  const vivid     = brighten(primary, 0.35)   // medium for glow
  const overall   = overallRating(card.tools)
  const name      = displayName(card)

  // Diagonal clip: left panel angled on right edge, right panel on left edge
  const clipPath  = isLeft
    ? `polygon(0 0, 100% 0, calc(100% - ${DIAGONAL_PX}px) 100%, 0 100%)`
    : `polygon(${DIAGONAL_PX}px 0, 100% 0, 100% 100%, 0 100%)`

  return (
    <motion.div
      initial={{ x: isLeft ? -200 : 200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{    x: isLeft ? -120 : 120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30, delay }}
      style={{
        position:   'absolute',
        top: 0, bottom: 0,
        ...(isLeft ? { left: 0, width: '53%' } : { right: 0, width: '53%' }),
        clipPath,
        background: isLeft
          ? `linear-gradient(125deg, ${bright} 0%, ${primary} 45%, rgba(0,0,0,0.75) 100%)`
          : `linear-gradient(235deg, ${bright} 0%, ${primary} 45%, rgba(0,0,0,0.75) 100%)`,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     isLeft ? 'flex-start' : 'flex-end',
        padding:        isLeft
          ? `28px 70px 20px 36px`
          : `28px 36px 20px 70px`,
        overflow:       'visible',
      }}
    >
      {/* Radial colour glow from top */}
      <div style={{
        position:    'absolute',
        top:         '-30%',
        [isLeft ? 'left' : 'right']: '-10%',
        width:       '70%',
        height:      '70%',
        borderRadius:'50%',
        background:  `radial-gradient(circle, rgba(${rgb(secondary)},0.28) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}/>

      {/* Giant team letter watermark */}
      <div style={{
        position:    'absolute',
        [isLeft ? 'right' : 'left']: '-10px',
        top:         '50%',
        transform:   'translateY(-52%)',
        fontSize:    '18rem',
        fontWeight:  900,
        fontFamily:  fonts.ui,
        color:       `rgba(${rgb(secondary)},0.07)`,
        lineHeight:  1,
        userSelect:  'none',
        pointerEvents: 'none',
        letterSpacing: '-0.06em',
      }}>
        {abbr[0]}
      </div>

      {/* Role label */}
      <div style={{
        fontSize:      '0.65rem',
        fontWeight:    900,
        letterSpacing: '0.22em',
        color:         `rgba(${rgb(secondary)},0.75)`,
        fontFamily:    fonts.ui,
        marginBottom:  '6px',
      }}>
        {label}
      </div>

      {/* Overall + name row */}
      <div style={{
        display:    'flex',
        alignItems: 'baseline',
        gap:        '10px',
        flexDirection: isLeft ? 'row' : 'row-reverse',
        marginBottom: '14px',
      }}>
        {/* Overall badge */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ delay: delay + 0.18, type: 'spring', stiffness: 350, damping: 18 }}
          style={{
            fontSize:      '4rem',
            fontWeight:    900,
            fontFamily:    fonts.ui,
            color:         '#fff',
            lineHeight:    1,
            textShadow:    `0 0 30px rgba(${rgb(secondary)},0.7), 0 4px 16px rgba(0,0,0,0.6)`,
            letterSpacing: '-0.03em',
          }}
        >
          {overall}
        </motion.div>

        {/* Name + team */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isLeft ? 'flex-start' : 'flex-end' }}>
          <div style={{
            fontSize:      '1.1rem',
            fontWeight:    900,
            fontFamily:    fonts.ui,
            color:         '#fff',
            textShadow:    '0 2px 10px rgba(0,0,0,0.8)',
            letterSpacing: '-0.01em',
            lineHeight:    1.1,
            maxWidth:      '170px',
            textAlign:     isLeft ? 'left' : 'right',
          }}>
            {name}
          </div>
          {/* Position + team abbr badges */}
          <div style={{
            display:       'flex',
            gap:           '5px',
            marginTop:     '5px',
            flexDirection: isLeft ? 'row' : 'row-reverse',
          }}>
            <div style={{
              background:    secondary,
              color:         primary,
              fontFamily:    fonts.ui,
              fontWeight:    900,
              fontSize:      '0.65rem',
              padding:       '2px 8px',
              borderRadius:  '3px',
              letterSpacing: '0.1em',
            }}>
              {card.position}
            </div>
            <div style={{
              fontSize:      '0.65rem',
              color:         `rgba(255,255,255,0.7)`,
              fontFamily:    fonts.ui,
              letterSpacing: '0.1em',
              fontWeight:    700,
              background:    'rgba(0,0,0,0.3)',
              padding:       '2px 8px',
              borderRadius:  '3px',
            }}>
              {abbr}
            </div>
          </div>
        </div>
      </div>

      {/* Card hero — vertically centered, slides inward from panel edge */}
      <motion.div
        initial={{ x: isLeft ? 100 : -100, y: -175, rotate: isLeft ? -3 : 3, opacity: 0 }}
        animate={{ x: 0,                   y: -175, rotate: isLeft ? -3 : 3, opacity: 1 }}
        transition={{ delay: delay + 0.08, type: 'spring', stiffness: 260, damping: 26 }}
        style={{
          position: 'absolute',
          top:      '50%',
          [isLeft ? 'right' : 'left']: '-80px',
          filter:   `drop-shadow(0 12px 40px rgba(0,0,0,0.8)) drop-shadow(0 0 28px rgba(${rgb(secondary)},0.45))`,
          zIndex:   3,
        }}
      >
        <Card card={card} size="lg" />
      </motion.div>
    </motion.div>
  )
}

// ─── VS badge ─────────────────────────────────────────────────────────────────
function VsBadge() {
  return (
    <motion.div
      initial={{ scale: 0.2, opacity: 0, rotate: -20 }}
      animate={{ scale: 1,   opacity: 1, rotate: 0   }}
      exit={{    scale: 0.4, opacity: 0               }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 380, damping: 20 }}
      style={{
        position:  'absolute',
        left:      '50%',
        top:       '50%',
        transform: 'translate(-50%, -50%)',
        zIndex:    10,
        display:   'flex',
        alignItems:'center',
        justifyContent: 'center',
        width:     '96px',
        height:    '96px',
      }}
    >
      {/* Outer diamond ring */}
      <div style={{
        position:     'absolute',
        inset:        0,
        border:       '2px solid rgba(255,255,255,0.5)',
        transform:    'rotate(45deg)',
        borderRadius: '6px',
        boxShadow:    '0 0 32px rgba(255,255,255,0.25), inset 0 0 20px rgba(255,255,255,0.06)',
      }}/>
      {/* Background fill */}
      <div style={{
        position:     'absolute',
        inset:        '4px',
        background:   'rgba(8,8,18,0.92)',
        transform:    'rotate(45deg)',
        borderRadius: '4px',
      }}/>
      {/* VS text */}
      <div style={{
        fontSize:      '2rem',
        fontWeight:    900,
        fontFamily:    fonts.ui,
        color:         '#ffffff',
        textShadow:    '0 0 24px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.6)',
        letterSpacing: '-0.04em',
        zIndex:        1,
        lineHeight:    1,
      }}>
        VS
      </div>
    </motion.div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function BatterUpOverlay({ visible, batterCard, pitcherCard, isPitching, onDismiss }) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [visible, onDismiss])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onDismiss}
          style={{
            position:   'fixed',
            inset:      0,
            zIndex:     100,
            display:    'flex',
            flexDirection: 'column',
            cursor:     'pointer',
            userSelect: 'none',
          }}
        >
          {/* Top bar */}
          <div style={{
            background:      'rgba(4,4,12,0.97)',
            borderBottom:    '1px solid rgba(255,255,255,0.12)',
            padding:         '10px 32px',
            display:         'flex',
            justifyContent:  'center',
            alignItems:      'center',
            gap:             '16px',
            zIndex:          5,
            flexShrink:      0,
          }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.35))' }}/>
            <div style={{
              fontSize:      '0.72rem',
              fontWeight:    900,
              letterSpacing: '0.26em',
              color:         'rgba(255,255,255,0.7)',
              fontFamily:    fonts.ui,
              whiteSpace:    'nowrap',
            }}>
              {isPitching ? 'AI BATTER UP' : 'NOW BATTING'}
            </div>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg,rgba(255,255,255,0.35),transparent)' }}/>
          </div>

          {/* Main area */}
          <div style={{
            flex:       1,
            position:   'relative',
            background: 'radial-gradient(ellipse 110% 90% at 50% 100%, #091809 0%, #050d10 50%, #02020c 100%)',
            overflow:   'hidden',
            clipPath:   'inset(0)',
          }}>
            {/* Field background */}
            <FieldBackground />

            {/* Dark vignette over field so panels stand out */}
            <div style={{
              position:   'absolute',
              inset:      0,
              background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 100%)',
              pointerEvents: 'none',
              zIndex:     1,
            }}/>

            {/* Player panels */}
            <PlayerPanel card={batterCard} side="left"  label="AT BAT"   delay={0} />
            <PlayerPanel card={pitcherCard} side="right" label="PITCHING" delay={0.04} />

            {/* VS badge in center */}
            <VsBadge />
          </div>

          {/* Bottom bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            style={{
              background:    'rgba(4,4,12,0.97)',
              borderTop:     '1px solid rgba(255,255,255,0.08)',
              padding:       '8px',
              textAlign:     'center',
              fontSize:      '0.65rem',
              letterSpacing: '0.20em',
              color:         'rgba(255,255,255,0.28)',
              fontFamily:    fonts.ui,
              fontWeight:    700,
              flexShrink:    0,
            }}
          >
            TAP TO CONTINUE
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
