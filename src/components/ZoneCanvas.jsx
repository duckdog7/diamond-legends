/**
 * ZoneCanvas.jsx
 * SVG pitch zone — GameDay-style coordinate-based pitch plot.
 *
 * Zone cells show color-coded percentages:
 *   Pitcher mode → % of pitches likely thrown here (green = hot, red = cold)
 *   Batter mode  → hit quality score per zone (green = best, red = worst)
 *
 * Coordinate system (SVG units):
 *   Strike zone: x=20–200, y=20–200  (180×180, 9 cells of 60×60)
 *   Home plate:  below zone, y≈215–268
 *   Full SVG:    220 × 280
 */

import { useState, useRef, useMemo } from 'react'
import pitchTypesData from '../data/pitchTypes.json'

// ─── Zone coordinate constants (shared with pitchAI.js) ───────────────────────
export const SVG_W  = 220
export const SVG_H  = 280
export const ZONE_X = 20
export const ZONE_Y = 20
export const ZONE_W = 180
export const ZONE_H = 180
export const CELL_W = 60
export const CELL_H = 60

const ZONE_KEYS = ['TL','TC','TR','ML','MC','MR','BL','BC','BR']

export function coordToZone(x, y) {
  const rx = x - ZONE_X, ry = y - ZONE_Y
  if (rx < 0 || rx >= ZONE_W || ry < 0 || ry >= ZONE_H) return null
  const col = rx < CELL_W ? 'L' : rx < CELL_W * 2 ? 'C' : 'R'
  const row = ry < CELL_H ? 'T' : ry < CELL_H * 2 ? 'M' : 'B'
  return row + col
}

function zoneToCell(zone) {
  const col = zone[1] === 'L' ? 0 : zone[1] === 'C' ? 1 : 2
  const row = zone[0] === 'T' ? 0 : zone[0] === 'M' ? 1 : 2
  return { x: ZONE_X + col * CELL_W, y: ZONE_Y + row * CELL_H }
}

// ─── Visual constants ──────────────────────────────────────────────────────────
export const PITCH_COLORS = {
  FB: '#ef4444', CB: '#3b82f6', CH: '#22c55e',
  SL: '#f59e0b', SK: '#8b5cf6', CF: '#ec4899', KN: '#94a3b8',
}

// Home plate pentagon
const PL_Y0 = ZONE_Y + ZONE_H + 14
const PL_Y1 = PL_Y0 + 26
const PL_Y2 = PL_Y1 + 22
const PL_XL = ZONE_X + 24
const PL_XR = ZONE_X + ZONE_W - 24
const PL_CX = ZONE_X + ZONE_W / 2
const PLATE_PTS = `${PL_XL},${PL_Y0} ${PL_XR},${PL_Y0} ${PL_XR},${PL_Y1} ${PL_CX},${PL_Y2} ${PL_XL},${PL_Y1}`

// ─── Zone profile calculators ─────────────────────────────────────────────────

/**
 * Pitcher zone display — shows remainingBudget[zone] / totalRemaining.
 * This directly reflects the budget system: heavily-used zones shrink in probability.
 * Falls back to affinity-based baseline if pitchState has no remainingBudget.
 */
function computePitcherZones(pitcherCard, pitchState) {
  // ── Primary path: use live remaining budget ────────────────────────────────
  if (pitchState?.remainingBudget) {
    const rb    = pitchState.remainingBudget
    const total = Object.values(rb).reduce((a, b) => a + b, 0) || 1
    const result = {}
    ZONE_KEYS.forEach(z => { result[z] = rb[z] / total })
    return result
  }

  // ── Fallback: compute from pitch type affinities ───────────────────────────
  const repertoire = pitcherCard?.pitchRepertoire ?? ['FB']
  const baseline   = {}
  ZONE_KEYS.forEach(z => { baseline[z] = 0 })
  repertoire.forEach(typeId => {
    const td = pitchTypesData.find(p => p.id === typeId)
    if (!td) return
    ZONE_KEYS.forEach(z => { baseline[z] += (td.zoneAffinities[z] ?? 0.11) })
  })
  const bSum = Object.values(baseline).reduce((a, b) => a + b, 0) || 1
  ZONE_KEYS.forEach(z => { baseline[z] /= bSum })
  return baseline
}

/**
 * Batter hit % by zone — derived from tools.
 * Returns { zone: probability 0–1 } representing actual hit chance in each zone.
 * A contact hitter (.300 avg) hits ~30% in sweet spot, ~15% in worst zone.
 * Power hitter crushes elevated pitches; speed/contact favors middle and low.
 */
function computeBatterZones(batterCard) {
  const { power = 50, average = 50, speed = 50 } = batterCard?.tools ?? {}
  const p = power / 100, a = average / 100, s = speed / 100

  return {
    // Top zone: power hitters thrive on elevated pitches
    TL: 0.15 + p * 0.18 + a * 0.05,
    TC: 0.18 + p * 0.16 + a * 0.08,
    TR: 0.15 + p * 0.18 + a * 0.05,
    // Middle: best for all hitters — contact especially
    ML: 0.22 + a * 0.16 + p * 0.05,
    MC: 0.25 + a * 0.18 + p * 0.04,
    MR: 0.22 + a * 0.16 + p * 0.05,
    // Low: contact + speed hitters put these in play
    BL: 0.15 + a * 0.11 + s * 0.07,
    BC: 0.17 + a * 0.13 + s * 0.05,
    BR: 0.13 + a * 0.09 + s * 0.07,
  }
}

// ─── Color helpers ────────────────────────────────────────────────────────────
// Normalize raw zone values to 0-1 range for color coding
function normalizeRange(values) {
  const vals = Object.values(values)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const out = {}
  ZONE_KEYS.forEach(z => { out[z] = (values[z] - min) / range })
  return out
}

function heatColor(norm) {
  if (norm >= 0.67) return '#22c55e'   // green
  if (norm >= 0.34) return '#f59e0b'   // amber
  return '#ef4444'                      // red
}

function heatBg(norm) {
  if (norm >= 0.67) return 'rgba(34,197,94,0.22)'
  if (norm >= 0.34) return 'rgba(245,158,11,0.20)'
  return 'rgba(239,68,68,0.22)'
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ZoneCanvas({
  mode          = 'guess',   // 'guess' | 'view'
  selectedCoord = null,
  onGuess       = null,
  pitchLog      = [],
  highlightLast = false,
  overlayMode   = 'pitcher', // 'pitcher' | 'batter'
  pitchState    = null,
  pitcherCard   = null,
  batterCard    = null,
  disabled      = false,
}) {
  const svgRef   = useRef(null)
  const [hover, setHover] = useState(null)

  // ── Zone percentage values ─────────────────────────────────────────────────
  const rawValues = useMemo(() => {
    return overlayMode === 'pitcher'
      ? computePitcherZones(pitcherCard, pitchState)
      : computeBatterZones(batterCard)
  }, [overlayMode, pitcherCard, pitchState, batterCard])

  // Normalized 0-1 for color coding (relative within this zone set)
  const normValues = useMemo(() => normalizeRange(rawValues), [rawValues])

  // ── SVG coordinate helpers ─────────────────────────────────────────────────
  function toSVGCoord(e) {
    const svg = svgRef.current
    if (!svg) return null
    const r = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width)  * SVG_W,
      y: ((e.clientY - r.top)  / r.height) * SVG_H,
    }
  }

  function handleClick(e) {
    if (disabled || mode !== 'guess') return
    const c = toSVGCoord(e)
    if (!c) return
    const zone = coordToZone(c.x, c.y)
    if (zone && onGuess) onGuess(c, zone)
  }

  function handleMove(e) {
    if (disabled || mode !== 'guess') return
    setHover(toSVGCoord(e))
  }

  const hoverInZone = hover ? coordToZone(hover.x, hover.y) !== null : false

  // All pitch dots for this pitcher (no cap — accumulates whole game)
  const dots    = pitchLog.filter(p => p.coord)
  const lastIdx = dots.length - 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      {/* Overlay mode label */}
      <div style={{
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.35)',
        letterSpacing: '0.1em',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
      }}>
        {overlayMode === 'pitcher' ? '% PITCHER TENDS TO THROW HERE' : '% HIT CHANCE BY ZONE'}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{
          width: '100%',
          maxWidth: `${SVG_W}px`,
          cursor: (!disabled && mode === 'guess' && hoverInZone) ? 'crosshair' : 'default',
          userSelect: 'none',
        }}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* ── Zone cells: colored background + % label ── */}
        {ZONE_KEYS.map(zone => {
          const cell = zoneToCell(zone)
          const raw  = rawValues[zone] ?? 0
          const norm = normValues[zone] ?? 0

          // Display: pitcher = % remaining budget, batter = % hit chance
          const displayStr = `${Math.round(raw * 100)}%`

          return (
            <g key={zone}>
              <rect
                x={cell.x} y={cell.y} width={CELL_W} height={CELL_H}
                fill={heatBg(norm)}
              />
              <text
                x={cell.x + CELL_W / 2}
                y={cell.y + CELL_H / 2 + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="900"
                fill={heatColor(norm)}
                style={{ pointerEvents: 'none', fontFamily: 'Arial Black, Arial, sans-serif', opacity: 0.85 }}
              >
                {displayStr}
              </text>
            </g>
          )
        })}

        {/* ── Strike zone rectangle ── */}
        <rect
          x={ZONE_X} y={ZONE_Y} width={ZONE_W} height={ZONE_H}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.5"
        />

        {/* ── Grid lines ── */}
        {[1, 2].map(i => (
          <g key={i}>
            <line x1={ZONE_X + i*CELL_W} y1={ZONE_Y} x2={ZONE_X + i*CELL_W} y2={ZONE_Y+ZONE_H}
              stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" />
            <line x1={ZONE_X} y1={ZONE_Y + i*CELL_H} x2={ZONE_X+ZONE_W} y2={ZONE_Y + i*CELL_H}
              stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" />
          </g>
        ))}

        {/* ── Home plate ── */}
        <polygon points={PLATE_PTS}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1"
        />

        {/* ── Pitch history dots ── */}
        {dots.map((p, i) => {
          const isLast    = i === lastIdx
          const isHighlit = isLast && highlightLast
          const color     = PITCH_COLORS[p.pitchType] ?? '#fff'
          const r         = isHighlit ? 9 : 6
          // Older pitches fade; last 10 are fully visible
          const recency   = Math.max(0, i - (dots.length - 10)) / 10
          const opacity   = 0.28 + recency * 0.72
          return (
            <g key={`dot${i}`} opacity={opacity}>
              {isHighlit && (
                <circle cx={p.coord.x} cy={p.coord.y} r={r + 4}
                  fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
              )}
              <circle cx={p.coord.x} cy={p.coord.y} r={r}
                fill={`${color}dd`} stroke={color} strokeWidth="1" />
              <text x={p.coord.x} y={p.coord.y + 3}
                textAnchor="middle" fontSize={isHighlit ? 9 : 7.5}
                fontWeight="bold" fill="#fff"
                style={{ pointerEvents: 'none', fontFamily: 'Arial Black, Arial, sans-serif' }}>
                {i + 1}
              </text>
            </g>
          )
        })}

        {/* ── Batter's guess marker ── */}
        {selectedCoord && mode === 'guess' && (
          <g>
            <line x1={selectedCoord.x-16} y1={selectedCoord.y} x2={selectedCoord.x+16} y2={selectedCoord.y}
              stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
            <line x1={selectedCoord.x} y1={selectedCoord.y-16} x2={selectedCoord.x} y2={selectedCoord.y+16}
              stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
            <circle cx={selectedCoord.x} cy={selectedCoord.y} r={6}
              fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" />
          </g>
        )}

        {/* ── Hover guide ring ── */}
        {hover && hoverInZone && mode === 'guess' && !disabled && !selectedCoord && (
          <circle cx={hover.x} cy={hover.y} r={5}
            fill="none" stroke="rgba(255,255,255,0.3)"
            strokeWidth="1" strokeDasharray="2,2"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>
    </div>
  )
}
