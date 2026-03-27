/**
 * LineScore.jsx
 * Inning-by-inning line score strip.
 * Shows runs per half-inning, total R, active inning highlight.
 */

import { fonts } from '../theme'

export default function LineScore({ inningScores, currentInning, half, maxInnings = 9 }) {
  const innings = Array.from({ length: maxInnings }, (_, i) => i + 1)
  const awayRuns = inningScores.away.reduce((a, b) => a + (b ?? 0), 0)
  const homeRuns = inningScores.home.reduce((a, b) => a + (b ?? 0), 0)

  return (
    <div style={{
      background: 'rgba(0,0,0,0.45)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '5px 20px',
      fontFamily: fonts.ui,
      overflowX: 'auto',
    }}>
      <table style={{ borderCollapse: 'collapse', minWidth: '460px' }}>
        <tbody>
          {/* Header */}
          <tr>
            <td style={S.teamCell} />
            {innings.map(n => (
              <td key={n} style={{
                ...S.innCell,
                color: n === currentInning ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                fontWeight: n === currentInning ? 700 : 400,
              }}>
                {n}
              </td>
            ))}
            <td style={{ ...S.totalCell, color: 'rgba(255,255,255,0.45)' }}>R</td>
          </tr>

          {/* Away */}
          <TeamRow
            label="AWAY"
            scores={inningScores.away}
            total={awayRuns}
            innings={innings}
            currentInning={currentInning}
            isActive={half === 'top'}
          />

          {/* Home */}
          <TeamRow
            label="HOME"
            scores={inningScores.home}
            total={homeRuns}
            innings={innings}
            currentInning={currentInning}
            isActive={half === 'bottom'}
          />
        </tbody>
      </table>
    </div>
  )
}

function TeamRow({ label, scores, total, innings, currentInning, isActive }) {
  return (
    <tr>
      <td style={{
        ...S.teamCell,
        color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
        fontWeight: isActive ? 900 : 400,
      }}>
        {isActive ? '▶ ' : ''}{label}
      </td>
      {innings.map((n, i) => {
        const val = scores[i]
        const isCur = n === currentInning && isActive
        return (
          <td key={n} style={{
            ...S.innCell,
            background: isCur ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: val != null
              ? (val > 0 ? '#22c55e' : 'rgba(255,255,255,0.5)')
              : 'rgba(255,255,255,0.13)',
            fontWeight: val > 0 ? 700 : 400,
          }}>
            {val != null ? val : '·'}
          </td>
        )
      })}
      <td style={{ ...S.totalCell, color: '#fff', fontWeight: 900 }}>
        {total}
      </td>
    </tr>
  )
}

const S = {
  teamCell: {
    fontSize: '0.72rem',
    letterSpacing: '0.12em',
    paddingRight: '14px',
    paddingTop: '3px',
    paddingBottom: '3px',
    whiteSpace: 'nowrap',
    fontFamily: fonts.ui,
    width: '64px',
  },
  innCell: {
    fontSize: '0.78rem',
    textAlign: 'center',
    width: '32px',
    height: '22px',
    padding: '2px 3px',
    borderLeft: '1px solid rgba(255,255,255,0.05)',
    fontFamily: fonts.ui,
    transition: 'background 0.2s',
  },
  totalCell: {
    fontSize: '0.88rem',
    textAlign: 'center',
    padding: '2px 14px',
    borderLeft: '2px solid rgba(255,255,255,0.14)',
    fontFamily: fonts.ui,
  },
}
