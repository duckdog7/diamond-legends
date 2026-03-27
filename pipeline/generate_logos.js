/**
 * Diamond Legends — Team Logo SVG Generator
 *
 * Reads src/data/teams.json and writes one SVG placeholder logo per franchise
 * to src/assets/logos/[franchiseId].svg
 *
 * Run: node pipeline/generate_logos.js
 *
 * When ComfyUI-generated logo art is approved, place it at the same path as
 * [franchiseId].png — the TeamLogo component checks for PNG first, SVG as fallback.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, '..')
const TEAMS     = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/teams.json'), 'utf8'))
const OUT_DIR   = path.join(ROOT, 'src/assets/logos')

fs.mkdirSync(OUT_DIR, { recursive: true })

// ─── Math helpers ─────────────────────────────────────────────────────────────

const rad  = deg => (deg * Math.PI) / 180
const ptX  = (cx, r, deg) => (cx + r * Math.cos(rad(deg))).toFixed(2)
const ptY  = (cy, r, deg) => (cy + r * Math.sin(rad(deg))).toFixed(2)
const pt   = (cx, cy, r, deg) => `${ptX(cx, r, deg)},${ptY(cy, r, deg)}`

/** Polygon points at evenly-spaced angles, optional rotation offset */
function polyPoints(cx, cy, r, n, offsetDeg = 0) {
  return Array.from({ length: n }, (_, i) => pt(cx, cy, r, offsetDeg + (360 / n) * i)).join(' ')
}

/** Gear path: outerR = tooth tip, innerR = tooth root, teeth = count */
function gearPath(cx, cy, outerR, innerR, teeth) {
  const step = 360 / teeth
  const half = step / 2
  let d = ''
  for (let i = 0; i < teeth; i++) {
    const base = i * step - 90
    const x1 = ptX(cx, outerR, base)
    const y1 = ptY(cy, outerR, base)
    const x2 = ptX(cx, outerR, base + half)
    const y2 = ptY(cy, outerR, base + half)
    const x3 = ptX(cx, innerR, base + half)
    const y3 = ptY(cy, innerR, base + half)
    const x4 = ptX(cx, innerR, base + step)
    const y4 = ptY(cy, innerR, base + step)
    d += i === 0 ? `M ${x1} ${y1} ` : `L ${x1} ${y1} `
    d += `L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} `
  }
  return d + 'Z'
}

/** 4-point star (compass rose / sharp cross) */
function starPath(cx, cy, outerR, innerR, points = 4, offsetDeg = -90) {
  const step = 360 / points
  let d = ''
  for (let i = 0; i < points; i++) {
    const outerAngle = offsetDeg + i * step
    const innerAngle = outerAngle + step / 2
    const ox = ptX(cx, outerR, outerAngle)
    const oy = ptY(cy, outerR, outerAngle)
    const ix = ptX(cx, innerR, innerAngle)
    const iy = ptY(cy, innerR, innerAngle)
    d += i === 0 ? `M ${ox} ${oy} ` : `L ${ox} ${oy} `
    d += `L ${ix} ${iy} `
  }
  return d + 'Z'
}

// ─── Per-franchise shape definitions ─────────────────────────────────────────
// Each function receives (primary, secondary) hex colors and returns SVG inner markup.

const SHAPES = {

  // Chicago Irons — I-beam cross-section
  irons: (p, s) => `
    <rect x="18" y="14" width="64" height="14" rx="2" fill="${p}"/>
    <rect x="41" y="28" width="18" height="44" rx="1" fill="${p}"/>
    <rect x="18" y="72" width="64" height="14" rx="2" fill="${p}"/>
    <rect x="28" y="20" width="4" height="60" fill="${s}" opacity="0.25"/>`,

  // Boston Pilgrims — ship's wheel
  pilgrims: (p, s) => {
    const spokes = Array.from({ length: 8 }, (_, i) => {
      const angle = i * 45 - 90
      return `<line x1="${ptX(50, 13, angle)}" y1="${ptY(50, 13, angle)}" x2="${ptX(50, 34, angle)}" y2="${ptY(50, 34, angle)}" stroke="${p}" stroke-width="5" stroke-linecap="round"/>`
    }).join('')
    return `
    <circle cx="50" cy="50" r="40" fill="none" stroke="${p}" stroke-width="9"/>
    <circle cx="50" cy="50" r="28" fill="none" stroke="${p}" stroke-width="4"/>
    ${spokes}
    <circle cx="50" cy="50" r="11" fill="${p}"/>
    <circle cx="50" cy="50" r="5"  fill="${s}"/>`
  },

  // Atlanta Peaches — peach with leaf
  peaches: (p, s) => `
    <ellipse cx="50" cy="56" rx="34" ry="32" fill="${p}"/>
    <path d="M 50 24 Q 56 55 50 88" fill="none" stroke="${s}" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="22" rx="7" ry="14" fill="${s}" transform="rotate(-30 50 22)"/>`,

  // San Francisco Foghorns — megaphone with sound waves
  foghorns: (p, s) => `
    <path d="M 22 38 L 22 62 L 68 78 L 68 22 Z" fill="${p}"/>
    <rect x="10" y="41" width="14" height="18" rx="3" fill="${p}"/>
    <path d="M 76 32 A 22 22 0 0 1 76 68" fill="none" stroke="${s}" stroke-width="5" stroke-linecap="round"/>
    <path d="M 82 22 A 34 34 0 0 1 82 78" fill="none" stroke="${s}" stroke-width="4" stroke-linecap="round" opacity="0.65"/>`,

  // Brooklyn Monuments / New York Empire — crown
  empire: (p, s) => `
    <rect x="14" y="57" width="72" height="22" rx="3" fill="${p}"/>
    <path d="M 14 57 L 14 22 L 29 40 L 43 18 L 50 36 L 57 18 L 71 40 L 86 22 L 86 57 Z" fill="${p}"/>
    <circle cx="29" cy="42" r="4" fill="${s}"/>
    <circle cx="50" cy="38" r="4" fill="${s}"/>
    <circle cx="71" cy="42" r="4" fill="${s}"/>`,

  // Brooklyn Sentinels / Los Angeles Rovers — compass rose
  rovers: (p, s) => `
    <path d="${starPath(50, 50, 44, 16, 4, -90)}" fill="${p}"/>
    <path d="${starPath(50, 50, 32, 14, 4, -45)}" fill="${s}" opacity="0.7"/>
    <circle cx="50" cy="50" r="8" fill="${p}"/>
    <circle cx="50" cy="50" r="4" fill="${s}"/>`,

  // Pittsburgh Foundry / Detroit Foundry — anvil
  foundry: (p, s) => `
    <path d="M 18 28 L 14 43 L 24 43 Z" fill="${p}"/>
    <rect x="22" y="24" width="62" height="26" rx="4" fill="${p}"/>
    <rect x="34" y="50" width="38" height="9"  rx="2" fill="${p}"/>
    <rect x="20" y="59" width="60" height="17" rx="3" fill="${p}"/>
    <rect x="26" y="59" width="8"  height="17" rx="2" fill="${s}" opacity="0.3"/>
    <rect x="66" y="59" width="8"  height="17" rx="2" fill="${s}" opacity="0.3"/>`,

  // Baltimore Tides / New Orleans Deltas — delta / river triangle
  deltas: (p, s) => `
    <path d="M 50 82 L 10 22 L 90 22 Z" fill="${p}"/>
    <path d="M 50 65 L 24 38 L 76 38 Z" fill="${s}" opacity="0.35"/>
    <path d="M 50 50 L 34 30 L 66 30 Z" fill="${s}" opacity="0.55"/>`,

  // Philadelphia Cinders — flame
  cinders: (p, s) => `
    <path d="M 50 88
             C 24 74 16 54 28 38
             C 22 56 34 62 32 50
             C 30 36 42 24 50 10
             C 58 24 58 38 68 28
             C 80 42 76 60 72 50
             C 76 64 64 76 50 88 Z"
          fill="${p}"/>
    <path d="M 50 76
             C 36 66 32 54 40 44
             C 38 54 44 58 44 52
             C 44 44 48 38 50 30
             C 52 38 54 46 60 40
             C 66 50 62 62 50 76 Z"
          fill="${s}" opacity="0.6"/>`,

  // Cincinnati Engines — gear with 8 teeth
  engines: (p, s) => `
    <path d="${gearPath(50, 50, 44, 32, 8)}" fill="${p}"/>
    <circle cx="50" cy="50" r="20" fill="${s}"/>
    <circle cx="50" cy="50" r="10" fill="${p}"/>`,

  // Kansas City Ramblers — forward arrow / chevron
  ramblers: (p, s) => `
    <path d="M 12 50 L 54 12 L 54 32 L 88 32 L 88 68 L 54 68 L 54 88 Z" fill="${p}"/>
    <path d="M 30 50 L 54 26 L 54 38 L 72 38 L 72 62 L 54 62 L 54 74 Z" fill="${s}" opacity="0.4"/>`,

  // Miami Glare — sunburst
  glare: (p, s) => {
    const rays = Array.from({ length: 8 }, (_, i) => {
      const angle = i * 45 - 90
      const x1 = ptX(50, 30, angle); const y1 = ptY(50, 30, angle)
      const x2 = ptX(50, 46, angle - 7); const y2 = ptY(50, 46, angle - 7)
      const x3 = ptX(50, 46, angle + 7); const y3 = ptY(50, 46, angle + 7)
      return `<polygon points="${ptX(50,22,angle)},${ptY(50,22,angle)} ${x2},${y2} ${x3},${y3}" fill="${p}"/>`
    }).join('')
    return `
    ${rays}
    <circle cx="50" cy="50" r="26" fill="${p}"/>
    <circle cx="50" cy="50" r="14" fill="${s}"/>`
  },

  // Denver Ascent — mountain peak with snow cap
  ascent: (p, s) => `
    <path d="M 50 10 L 88 82 L 12 82 Z" fill="${p}"/>
    <path d="M 50 10 L 64 36 L 50 30 L 36 36 Z" fill="${s}"/>
    <rect x="12" y="76" width="76" height="8" rx="3" fill="${p}" opacity="0.5"/>`,
}

// ─── SVG wrapper ──────────────────────────────────────────────────────────────

function makeSVG(franchiseId, primary, secondary) {
  const shapeFn = SHAPES[franchiseId]
  if (!shapeFn) {
    console.warn(`  ⚠ No shape defined for "${franchiseId}" — using fallback diamond`)
  }
  const inner = shapeFn
    ? shapeFn(primary, secondary)
    : `<polygon points="${polyPoints(50, 50, 42, 4, -45)}" fill="${primary}"/>
       <text x="50" y="57" text-anchor="middle" fill="${secondary}" font-size="18" font-family="Arial Black" font-weight="900">${franchiseId.slice(0,2).toUpperCase()}</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <title>${franchiseId}</title>${inner}
</svg>`
}

// ─── Generate ─────────────────────────────────────────────────────────────────

let generated = 0
let skipped   = 0

for (const franchise of TEAMS) {
  const { franchiseId } = franchise
  // Use the most recent era's colors as the canonical logo colors
  const latest  = franchise.history[franchise.history.length - 1]
  const primary = latest.primary
  const secondary = latest.secondary

  const outPath = path.join(OUT_DIR, `${franchiseId}.svg`)

  // Skip if a PNG already exists (ComfyUI art has been approved and promoted)
  if (fs.existsSync(path.join(OUT_DIR, `${franchiseId}.png`))) {
    console.log(`  ↷ ${franchiseId} — PNG exists, skipping SVG`)
    skipped++
    continue
  }

  const svg = makeSVG(franchiseId, primary, secondary)
  fs.writeFileSync(outPath, svg, 'utf8')
  console.log(`  ✓ ${franchiseId}.svg  (${latest.city} ${latest.name})`)
  generated++
}

console.log(`\nDone. ${generated} SVGs written, ${skipped} skipped (PNG exists).`)
console.log(`Output: src/assets/logos/`)
