/**
 * CardExpanded — landscape detail view shown when a card is clicked.
 * Left panel: era-styled art area. Right panel: full stats + tool bars.
 */
import TeamLogo from './TeamLogo'

const TOOL_LABELS = { average: 'AVG', power: 'PWR', speed: 'SPD', fielding: 'FLD', arm: 'ARM' }
const TOOL_KEYS   = ['average', 'power', 'speed', 'fielding', 'arm']

function toolGrade(v) {
  if (v >= 90) return 'A+'
  if (v >= 80) return 'A'
  if (v >= 70) return 'B+'
  if (v >= 60) return 'B'
  if (v >= 50) return 'C+'
  if (v >= 35) return 'C'
  if (v >= 20) return 'D'
  return 'F'
}

function toolColor(v) {
  if (v >= 80) return '#22c55e'
  if (v >= 65) return '#86efac'
  if (v >= 50) return '#fbbf24'
  if (v >= 35) return '#f97316'
  return '#ef4444'
}

const STAT_COLS = [
  { key: 'g',   label: 'G' },
  { key: 'ab',  label: 'AB' },
  { key: 'h',   label: 'H' },
  { key: 'r',   label: 'R' },
  { key: 'rbi', label: 'RBI' },
  { key: 'avg', label: 'AVG' },
]

function isPitcher(card) {
  return card.positions.every(p => ['SP', 'RP', 'CP'].includes(p))
}

// ─── Era visual config ────────────────────────────────────────────────────────

function getEraStyle(era, team) {
  const styles = {
    deadball: {
      leftBg:     team.primary,
      leftBorder: 'rgba(245,240,232,0.3)',
      rightBg:    '#f2ead8',
      rightBorder:'rgba(58,40,16,0.12)',
      nameColor:  '#2a1a08',
      labelColor: '#8b6340',
      bioColor:   '#5a3a18',
      statHeaderBg:  '#8b6340',
      statHeaderText: '#f5f0e8',
      statAltBg:  'rgba(139,99,64,0.08)',
      statBorderColor: 'rgba(139,99,64,0.18)',
      statTextColor: '#3a2810',
      nameFont:   "'Playfair Display', Georgia, serif",
      uiFont:     "'Playfair Display', Georgia, serif",
      artFilter:  'sepia(0.5) contrast(0.9)',
      artBg:      'rgba(0,0,0,0.2)',
      artShape:   'ellipse',
    },
    golden: {
      leftBg:     team.primary,
      leftBorder: team.secondary,
      rightBg:    '#faf6ee',
      rightBorder:'rgba(0,0,0,0.08)',
      nameColor:  '#1a1a2a',
      labelColor: team.primary,
      bioColor:   '#44401a',
      statHeaderBg:  team.primary,
      statHeaderText: team.secondary,
      statAltBg:  'rgba(0,0,0,0.04)',
      statBorderColor: 'rgba(0,0,0,0.08)',
      statTextColor: '#2a2a1a',
      nameFont:   "'Playfair Display', Georgia, serif",
      uiFont:     'Arial, sans-serif',
      artFilter:  'saturate(0.85) brightness(1.05)',
      artBg:      '#c8bfaa',
      artShape:   'rect',
    },
    hardball: {
      leftBg:     '#111',
      leftBorder: team.primary,
      rightBg:    team.primary,
      rightBorder:'rgba(255,255,255,0.1)',
      nameColor:  '#fff',
      labelColor: team.secondary,
      bioColor:   'rgba(255,255,255,0.75)',
      statHeaderBg:  'rgba(0,0,0,0.4)',
      statHeaderText: team.secondary,
      statAltBg:  'rgba(0,0,0,0.18)',
      statBorderColor: 'rgba(255,255,255,0.1)',
      statTextColor: 'rgba(255,255,255,0.9)',
      nameFont:   "'Arial Black', Arial, sans-serif",
      uiFont:     'Arial, sans-serif',
      artFilter:  'saturate(1.2) contrast(1.05)',
      artBg:      '#666',
      artShape:   'rect',
    },
    modern: {
      leftBg:     '#111',
      leftBorder: team.primary,
      rightBg:    '#f8f9fa',
      rightBorder:'#e0e0e8',
      nameColor:  '#111',
      labelColor: team.primary,
      bioColor:   '#555',
      statHeaderBg:  team.primary,
      statHeaderText: team.secondary,
      statAltBg:  'rgba(0,0,0,0.03)',
      statBorderColor: '#e8e8f0',
      statTextColor: '#333',
      nameFont:   "'Arial Black', Arial, sans-serif",
      uiFont:     'Arial, sans-serif',
      artFilter:  'none',
      artBg:      '#999',
      artShape:   'rect',
    },
  }
  return styles[era] ?? styles.modern
}

// ─── Left art panel ───────────────────────────────────────────────────────────

function ArtPanel({ card, team, overall, rarity, s }) {
  const initials = card.name.split(' ').filter(w => !w.startsWith('"')).map(w => w[0]).join('').slice(0, 2)

  return (
    <div style={{
      width: '260px',
      flexShrink: 0,
      background: s.leftBg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 16px',
      borderRight: `2px solid ${s.leftBorder}`,
      position: 'relative',
    }}>
      {/* Era label */}
      <div style={{
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.65rem',
        fontFamily: 'monospace',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        {card.era === 'deadball' ? 'Deadball Era' :
         card.era === 'golden'   ? 'Golden Age' :
         card.era === 'hardball' ? 'Hardball Era' : 'The Modern Game'}
      </div>

      {/* Art */}
      <div style={{
        width: '140px',
        height: '140px',
        borderRadius: s.artShape === 'ellipse' ? '50%' : '6px',
        overflow: 'hidden',
        background: s.artBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid rgba(255,255,255,0.15)`,
        flexShrink: 0,
      }}>
        {card.art
          ? <img src={card.art} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: s.artFilter }} />
          : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', opacity: 0.25, color: '#fff' }}>⚾</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '2rem', fontWeight: 900, fontFamily: 'Arial Black' }}>{initials}</div>
            </div>
          )
        }
      </div>

      {/* Overall + rarity */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: rarity.color, fontSize: '2.8rem', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
          {overall}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          OVERALL
        </div>
        <div style={{
          marginTop: '4px',
          color: rarity.color,
          fontSize: '0.65rem',
          fontFamily: 'monospace',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}>
          {rarity.label}
        </div>
      </div>

      {/* Team logo + card number bottom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <TeamLogo franchiseId={card.franchiseId} size={26} />
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', fontFamily: 'monospace' }}>
          #{card.cardNumber}
        </div>
      </div>
    </div>
  )
}

// ─── Right stats panel ────────────────────────────────────────────────────────

function StatsPanel({ card, team, rarity, s }) {
  const pitcher = isPitcher(card)
  const statCols = pitcher
    ? [{ key: 'g', label: 'G' }]
    : STAT_COLS

  return (
    <div style={{
      flex: 1,
      background: s.rightBg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 6px',
        borderBottom: `1px solid ${s.rightBorder}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexShrink: 0,
      }}>
        <div>
          <div style={{
            color: s.nameColor,
            fontSize: '1.15rem',
            fontWeight: 900,
            fontFamily: s.nameFont,
            lineHeight: 1.1,
          }}>
            {card.name}
          </div>
          <div style={{
            color: s.labelColor,
            fontSize: '0.68rem',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: '3px',
          }}>
            {card.positions.join(' / ')} · {team.city} {team.name}
          </div>
        </div>
        <div style={{
          background: s.statHeaderBg,
          color: s.statHeaderText,
          fontSize: '0.65rem',
          fontFamily: 'monospace',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '4px 10px',
          borderRadius: '99px',
          flexShrink: 0,
          alignSelf: 'flex-start',
        }}>
          {card.trait}
        </div>
      </div>

      {/* Bio strip */}
      <div style={{
        padding: '4px 14px',
        borderBottom: `1px solid ${s.rightBorder}`,
        flexShrink: 0,
      }}>
        <span style={{ color: s.bioColor, fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
          HT: {card.height} · WT: {card.weight} lbs · BATS: {card.bats} · THROWS: {card.throws} · BORN: {card.birthplace}
        </span>
      </div>

      {/* Stats table */}
      <div style={{ flex: 1, padding: '6px 14px', overflow: 'auto' }}>
        <div style={{
          color: s.labelColor,
          fontSize: '0.65rem',
          fontFamily: 'monospace',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: '5px',
          fontWeight: 700,
        }}>
          {pitcher ? 'Pitching Record' : 'Batting Record'}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.63rem', fontFamily: 'monospace' }}>
          <thead>
            <tr style={{ background: s.statHeaderBg }}>
              <th style={{ padding: '4px 6px', textAlign: 'left', color: s.statHeaderText, letterSpacing: '0.06em', borderRight: `1px solid ${s.statBorderColor}` }}>YR</th>
              <th style={{ padding: '4px 6px', textAlign: 'left', color: s.statHeaderText, letterSpacing: '0.06em', borderRight: `1px solid ${s.statBorderColor}` }}>CLUB</th>
              {statCols.map(c => (
                <th key={c.key} style={{ padding: '4px 7px', textAlign: 'center', color: s.statHeaderText, letterSpacing: '0.04em', borderRight: `1px solid ${s.statBorderColor}` }}>{c.label}</th>
              ))}
              {/* Tool columns */}
              {['AVG','PWR','SPD','FLD','ARM'].map(l => (
                <th key={l} style={{ padding: '4px 7px', textAlign: 'center', color: s.statHeaderText, letterSpacing: '0.04em', borderRight: `1px solid ${s.statBorderColor}`, opacity: 0.8 }}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {card.stats.map((row, i) => (
              <tr key={row.season} style={{ background: i % 2 === 1 ? s.statAltBg : 'transparent' }}>
                <td style={{ padding: '4px 6px', color: s.statTextColor, borderRight: `1px solid ${s.statBorderColor}` }}>{row.season}</td>
                <td style={{ padding: '4px 6px', color: s.statTextColor, borderRight: `1px solid ${s.statBorderColor}` }}>{row.team}</td>
                {statCols.map(c => (
                  <td key={c.key} style={{ padding: '4px 7px', textAlign: 'center', color: s.statTextColor, borderRight: `1px solid ${s.statBorderColor}` }}>
                    {row[c.key] ?? '—'}
                  </td>
                ))}
                {['avg_tool','power_tool','speed_tool','fielding_tool','arm_tool'].map(k => (
                  <td key={k} style={{ padding: '4px 7px', textAlign: 'center', color: toolColor(row[k] ?? 0), fontWeight: 700, borderRight: `1px solid ${s.statBorderColor}` }}>
                    {row[k] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tool bars */}
      <div style={{
        padding: '6px 14px 10px',
        borderTop: `1px solid ${s.rightBorder}`,
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '6px',
        flexShrink: 0,
      }}>
        {TOOL_KEYS.map(key => {
          const val = card.tools[key]
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: s.bioColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {TOOL_LABELS[key]}
                </span>
                <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: toolColor(val), fontWeight: 700 }}>
                  {val} <span style={{ opacity: 0.7 }}>{toolGrade(val)}</span>
                </span>
              </div>
              <div style={{ height: '7px', background: 'rgba(0,0,0,0.12)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${val}%`, height: '100%', background: toolColor(val), borderRadius: '99px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Close button ─────────────────────────────────────────────────────────────

function CloseButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        top: '-14px',
        right: '-14px',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: '#1a1a1a',
        border: '2px solid rgba(255,255,255,0.2)',
        color: 'rgba(255,255,255,0.8)',
        fontSize: '0.75rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        zIndex: 10,
      }}
    >
      ✕
    </button>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function CardExpanded({ card, team, overall, rarity, onClose }) {
  const s = getEraStyle(card.era, team)

  return (
    <div style={{ position: 'relative' }}>
      <CloseButton onClick={onClose} />
      <div style={{
        width: '900px',
        height: '500px',
        display: 'flex',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08), 0 0 40px ${rarity.color}33`,
      }}>
        <ArtPanel card={card} team={team} overall={overall} rarity={rarity} s={s} />
        <StatsPanel card={card} team={team} rarity={rarity} s={s} />
      </div>
    </div>
  )
}
