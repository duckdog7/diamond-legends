/**
 * Nav.jsx
 * Top navigation bar for screen routing.
 *
 * Props:
 *   screen      string — current screen id
 *   onNav       fn(screenId)
 *   standings   { w, l } — shown in nav
 *   coins       number
 */

import { colors, fonts, fontSize, radius } from '../theme'

// ─── Design tokens ────────────────────────────────────────────────────────────
const STYLES = {
  bar: {
    bg:           'rgba(6,6,16,0.97)',
    border:       '1px solid rgba(255,255,255,0.08)',
    height:       '48px',
    padding:      '0 20px',
    font:         fonts.ui,
  },
  logo: {
    fontSize:     '0.9rem',
    color:        colors.amber,
    letterSpacing:'0.08em',
  },
  tab: {
    fontSize:     fontSize.xs,
    letterSpacing:'0.1em',
    padding:      '4px 12px',
    radius:       radius.md,
    active: {
      color:  '#fff',
      bg:     'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.2)',
    },
    idle: {
      color:  'rgba(255,255,255,0.45)',
      bg:     'transparent',
      border: '1px solid transparent',
    },
  },
  record: {
    fontSize: fontSize.xs,
    wColor:   colors.success,
    lColor:   colors.danger,
    sepColor: 'rgba(255,255,255,0.2)',
  },
  coins: {
    fontSize:   fontSize.xs,
    color:      colors.amber,
    iconColor:  colors.gold,
  },
}

const TABS = [
  { id: 'collection', label: 'COLLECTION' },
  { id: 'roster',     label: 'ROSTER'     },
  { id: 'season',     label: 'SEASON'     },
]

export default function Nav({ screen, onNav, standings = { w: 0, l: 0 }, coins = 0 }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      height: STYLES.bar.height,
      background: STYLES.bar.bg,
      borderBottom: STYLES.bar.border,
      display: 'flex', alignItems: 'center',
      padding: STYLES.bar.padding,
      gap: '8px',
      fontFamily: STYLES.bar.font,
    }}>
      {/* Logo */}
      <div style={{
        fontSize:     STYLES.logo.fontSize,
        color:        STYLES.logo.color,
        letterSpacing:STYLES.logo.letterSpacing,
        fontWeight:   900,
        marginRight:  '16px',
        whiteSpace:   'nowrap',
      }}>
        ◇ DL
      </div>

      {/* Tabs */}
      {TABS.map(tab => {
        const active = screen === tab.id
        const s = active ? STYLES.tab.active : STYLES.tab.idle
        return (
          <button
            key={tab.id}
            onClick={() => onNav(tab.id)}
            style={{
              fontSize:      STYLES.tab.fontSize,
              letterSpacing: STYLES.tab.letterSpacing,
              padding:       STYLES.tab.padding,
              borderRadius:  STYLES.tab.radius,
              color:         s.color,
              background:    s.bg,
              border:        s.border,
              cursor:        'pointer',
              fontWeight:    900,
              transition:    'all 0.12s',
            }}
          >
            {tab.label}
          </button>
        )
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Record */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        fontSize: STYLES.record.fontSize,
      }}>
        <span style={{ color: STYLES.record.wColor, fontWeight: 900 }}>{standings.w}W</span>
        <span style={{ color: STYLES.record.sepColor }}>·</span>
        <span style={{ color: STYLES.record.lColor, fontWeight: 900 }}>{standings.l}L</span>
      </div>

      {/* Coins */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        fontSize: STYLES.coins.fontSize,
        color: STYLES.coins.color,
        fontWeight: 700,
        marginLeft: '12px',
      }}>
        <span style={{ color: STYLES.coins.iconColor }}>◈</span>
        {coins}
      </div>
    </div>
  )
}
