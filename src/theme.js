/**
 * theme.js
 * Shared design tokens for Diamond Legends.
 * Import specific groups as needed — e.g. import { colors, fonts } from '../theme'
 *
 * To do a design pass on the game UI: start here, then open each component's
 * STYLES block at the top of the file.
 */

// ─── Colors ───────────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds
  bg: {
    base:    '#0a0a18',
    surface: '#0e1020',
    panel:   'rgba(8,8,18,0.92)',
    overlay: 'rgba(8,8,22,0.97)',
    card:    'rgba(255,255,255,0.06)',
    hover:   'rgba(255,255,255,0.10)',
  },

  // Borders
  border: {
    subtle:  'rgba(255,255,255,0.08)',
    default: 'rgba(255,255,255,0.12)',
    strong:  'rgba(255,255,255,0.30)',
  },

  // Text
  text: {
    primary:   '#ffffff',
    secondary: 'rgba(255,255,255,0.6)',
    muted:     'rgba(255,255,255,0.35)',
    label:     'rgba(255,255,255,0.4)',
  },

  // Game UI
  batting:  '#60a5fa',   // blue
  pitching: '#f87171',   // red
  amber:    '#f0a830',
  gold:     '#d4a520',
  success:  '#22c55e',
  warning:  '#f59e0b',
  danger:   '#ef4444',

  // Pitch type colors
  pitch: {
    FB: '#ef4444',
    CB: '#3b82f6',
    CH: '#22c55e',
    SL: '#f59e0b',
    SK: '#8b5cf6',
    CF: '#ec4899',
    KN: '#e5e7eb',
  },

  // Rarity
  rarity: {
    common:   '#9ca3af',
    uncommon: '#34d399',
    rare:     '#818cf8',
    legend:   '#f59e0b',
  },

  // Inning phase
  phase: {
    early: 'rgba(100,150,255,0.6)',
    mid:   'rgba(255,180,60,0.6)',
    late:  'rgba(255,80,80,0.6)',
  },

  // Token tier
  tier: {
    1:  '#94a3b8',   // Spark
    3:  '#34d399',   // Boost
    6:  '#818cf8',   // Surge
    10: '#f59e0b',   // Blitz
  },

  // Outcomes
  outcome: {
    hit:  { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)' },
    out:  { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)' },
    error:{ bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' },
  },
}

// ─── Typography ───────────────────────────────────────────────────────────────

export const fonts = {
  display: "'Playfair Display', Georgia, serif",
  ui:      'Arial Black, Arial, sans-serif',
  mono:    'monospace',
  body:    'Arial, sans-serif',
}

export const fontSize = {
  xxs:  '0.65rem',
  xs:   '0.78rem',
  sm:   '0.92rem',
  md:   '1.05rem',
  lg:   '1.25rem',
  xl:   '1.5rem',
  '2xl':'1.9rem',
  '3xl':'2.6rem',
}

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const spacing = {
  1: '4px',
  2: '6px',
  3: '8px',
  4: '10px',
  5: '12px',
  6: '16px',
  7: '20px',
  8: '24px',
}

// ─── Radii ────────────────────────────────────────────────────────────────────

export const radius = {
  sm:   '3px',
  md:   '5px',
  lg:   '8px',
  xl:   '10px',
  pill: '99px',
}

// ─── Zone grid ────────────────────────────────────────────────────────────────

export const zoneGrid = {
  cellSize:   72,          // px — width and height of each zone cell
  gap:        3,           // px — gap between cells
  cellRadius: '4px',
  bg: {
    default:  'rgba(255,255,255,0.06)',
    fatigued: 'rgba(255,255,255,0.02)',
    pending:  'rgba(255,255,200,0.15)',
    selected: 'rgba(100,180,255,0.2)',
    revealed: 'rgba(255,80,80,0.25)',
  },
  border: {
    default:  '1px solid rgba(255,255,255,0.12)',
    pending:  '1px solid rgba(255,255,200,0.6)',
    selected: '1px solid rgba(100,180,255,0.7)',
    revealed: '1px solid rgba(255,80,80,0.8)',
  },
  tendency: {
    fillColor:    'rgba(255,200,80,0.12)',
    lineColor:    'rgba(255,200,80,0.3)',
    labelColor:   'rgba(255,200,80,0.7)',
    labelSize:    '0.72rem',
  },
  fatigue: {
    labelColor: 'rgba(255,100,100,0.7)',
    opacity:    0.45,
  },
  trail: {
    dotSize:    7,           // px diameter
    opacities:  [0.85, 0.5, 0.25],
    spacing:    10,          // px between trail dots
  },
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

export const hud = {
  panelBg:     'rgba(8,8,18,0.92)',
  panelBorder: '1px solid rgba(255,255,255,0.1)',
  panelRadius: '8px',
  minWidth:    '220px',
  dotSize:     10,          // count/outs indicator dot size px
  tokenBarH:   4,           // px — token bar height
  baseDiamondSize: 44,      // px — svg viewbox size
}

// ─── Token menu ───────────────────────────────────────────────────────────────

export const tokenMenu = {
  panelBg:     'rgba(8,8,22,0.97)',
  panelBorder: '1px solid rgba(255,255,255,0.12)',
  panelRadius: '8px',
  rowRadius:   '5px',
  costBadgeH:  '20px',
  costBadgeW:  '28px',
}
