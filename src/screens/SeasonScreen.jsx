/**
 * SeasonScreen.jsx
 * 30-game season view — next game panel, series schedule grid, standings.
 */

import { motion } from 'framer-motion'
import { useSeasonStore } from '../stores/seasonStore'
import { colors, fonts, fontSize, radius } from '../theme'
import aiTeams from '../data/aiTeams.json'

// ─── Design tokens ────────────────────────────────────────────────────────────
const STYLES = {
  screen: {
    bg:      'linear-gradient(160deg, #0a0a18 0%, #0e1020 100%)',
    minH:    'calc(100vh - 48px)',
    padding: '28px 24px',
    font:    fonts.body,
    color:   colors.text.primary,
  },
  header: {
    titleSize:  '1.1rem',
    titleFont:  fonts.ui,
    metaSize:   fontSize.xs,
    metaColor:  colors.text.muted,
  },
  stat: {
    fontSize: '1.4rem',
    font:     fonts.ui,
    labelSize: fontSize.xxs,
    labelColor: colors.text.muted,
  },
  nextGame: {
    bg:       'rgba(255,255,255,0.04)',
    border:   '1px solid rgba(255,255,255,0.12)',
    hoverBorder: '1px solid rgba(255,255,255,0.28)',
    radius:   radius.xl,
    padding:  '24px',
  },
  difficultyBadge: {
    easy:   { bg: 'rgba(34,197,94,0.15)',  border: '1px solid rgba(34,197,94,0.35)',  color: '#22c55e' },
    medium: { bg: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b' },
    hard:   { bg: 'rgba(239,68,68,0.15)',  border: '1px solid rgba(239,68,68,0.35)',  color: '#ef4444' },
  },
  playBtn: {
    padding:    '12px 40px',
    radius:     radius.lg,
    font:       fonts.ui,
    fontSize:   fontSize.md,
    bg:         'rgba(240,168,48,0.15)',
    border:     '1px solid rgba(240,168,48,0.45)',
    color:      colors.amber,
  },
  startBtn: {
    padding:    '14px 48px',
    radius:     radius.lg,
    font:       fonts.ui,
    fontSize:   fontSize.xl,
    bg:         'rgba(240,168,48,0.12)',
    border:     '1px solid rgba(240,168,48,0.4)',
    color:      colors.amber,
  },
  series: {
    bg:         'rgba(255,255,255,0.03)',
    border:     '1px solid rgba(255,255,255,0.07)',
    activeBg:   'rgba(255,255,255,0.06)',
    activeBorder:'1px solid rgba(255,255,255,0.18)',
    radius:     radius.lg,
    padding:    '14px 16px',
    dotSize:    '14px',
  },
  rosterRow: {
    labelColor: colors.text.muted,
    labelSize:  fontSize.xxs,
    valueSize:  fontSize.xs,
  },
}

const DIFFICULTY_LABEL = { easy: 'EASY', medium: 'MED', hard: 'HARD' }
const ERA_LABEL = {
  deadball: 'Deadball Era',
  golden:   'Golden Age',
  hardball: 'Hardball Era',
  modern:   'Modern',
}

function getTeamById(id) {
  return aiTeams.find(t => t.id === id) ?? null
}

function runDiff(standings) {
  const d = standings.runsFor - standings.runsAgainst
  if (d > 0) return `+${d}`
  return `${d}`
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function SeasonScreen({ onPlayGame }) {
  const store      = useSeasonStore()
  const standings  = store.standings
  const schedule   = store.schedule
  const seriesResults = store.seriesResults

  // Group schedule into series
  const seriesMap = {}
  for (const game of schedule) {
    if (!seriesMap[game.seriesNum]) seriesMap[game.seriesNum] = []
    seriesMap[game.seriesNum].push(game)
  }

  const nextGame   = schedule.find(g => g.status !== 'complete') ?? null
  const nextTeam   = nextGame ? getTeamById(nextGame.opponent) : null
  const isComplete = store.isSeasonComplete()

  // ── Pre-season start ──────────────────────────────────────────────────────
  if (!store.seasonStarted) {
    return (
      <div style={{
        ...baseScreen,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '20px',
      }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: fonts.ui, letterSpacing: '0.08em' }}>
          SEASON 2025
        </div>
        <div style={{ fontSize: fontSize.sm, color: colors.text.muted, textAlign: 'center', maxWidth: '320px' }}>
          30-game season across 10 series. Build your record, earn coins, face tougher opponents as the season progresses.
        </div>
        <motion.button
          onClick={() => store.startSeason()}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding:      STYLES.startBtn.padding,
            borderRadius: STYLES.startBtn.radius,
            fontFamily:   STYLES.startBtn.font,
            fontSize:     STYLES.startBtn.fontSize,
            background:   STYLES.startBtn.bg,
            border:       STYLES.startBtn.border,
            color:        STYLES.startBtn.color,
            fontWeight:   900,
            cursor:       'pointer',
            letterSpacing:'0.12em',
          }}
        >
          START SEASON
        </motion.button>
      </div>
    )
  }

  return (
    <div style={baseScreen}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: STYLES.header.titleSize, fontWeight: 900, fontFamily: STYLES.header.titleFont, letterSpacing: '0.06em' }}>
              SEASON 2025
            </div>
            <div style={{ fontSize: STYLES.header.metaSize, color: STYLES.header.metaColor, marginTop: '3px' }}>
              {isComplete ? 'Season complete' : `Game ${store.currentGameNum} of 30`}
            </div>
          </div>
          <StandingsStat standings={standings} />
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* Left — next game or season complete */}
          <div>
            {isComplete ? (
              <SeasonCompletePanel standings={standings} />
            ) : nextGame && nextTeam ? (
              <NextGamePanel
                game={nextGame}
                team={nextTeam}
                onPlay={onPlayGame}
              />
            ) : null}
          </div>

          {/* Right — series schedule grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              fontSize: fontSize.xxs, fontWeight: 900, fontFamily: fonts.ui,
              letterSpacing: '0.14em', color: colors.text.muted,
              marginBottom: '6px',
            }}>
              SCHEDULE
            </div>
            {Object.values(seriesMap).map(games => (
              <SeriesRow
                key={games[0].seriesNum}
                games={games}
                seriesResult={seriesResults.find(s => s.seriesNum === games[0].seriesNum)}
                isActive={nextGame?.seriesNum === games[0].seriesNum}
              />
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StandingsStat({ standings }) {
  const diff = standings.runsFor - standings.runsAgainst
  const diffStr = diff > 0 ? `+${diff}` : `${diff}`
  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'baseline' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: STYLES.stat.fontSize, fontWeight: 900, fontFamily: STYLES.stat.font, color: colors.success }}>
          {standings.w}
        </div>
        <div style={{ fontSize: STYLES.stat.labelSize, color: STYLES.stat.labelColor, letterSpacing: '0.1em' }}>WINS</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: STYLES.stat.fontSize, fontWeight: 900, fontFamily: STYLES.stat.font, color: colors.danger }}>
          {standings.l}
        </div>
        <div style={{ fontSize: STYLES.stat.labelSize, color: STYLES.stat.labelColor, letterSpacing: '0.1em' }}>LOSSES</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: STYLES.stat.fontSize, fontWeight: 900, fontFamily: STYLES.stat.font, color: diff >= 0 ? colors.success : colors.danger }}>
          {diffStr}
        </div>
        <div style={{ fontSize: STYLES.stat.labelSize, color: STYLES.stat.labelColor, letterSpacing: '0.1em' }}>RUN DIFF</div>
      </div>
    </div>
  )
}

// ─── Next game panel ──────────────────────────────────────────────────────────

function NextGamePanel({ game, team, onPlay }) {
  const diff     = STYLES.difficultyBadge[team.difficulty] ?? STYLES.difficultyBadge.medium
  const sp       = team.roster.find(r => r.slot === 'SP')
  const hitters  = team.roster.filter(r => !['SP','RP'].includes(r.slot)).slice(0, 4)

  // Era breakdown from roster
  const eras = [...new Set(team.roster.map(r => r.era))].filter(Boolean)

  return (
    <motion.div
      style={{
        background:   STYLES.nextGame.bg,
        border:       STYLES.nextGame.border,
        borderRadius: STYLES.nextGame.radius,
        padding:      STYLES.nextGame.padding,
        display:      'flex',
        flexDirection:'column',
        gap:          '16px',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: fontSize.xxs, color: colors.text.muted, letterSpacing: '0.12em', marginBottom: '4px' }}>
            SERIES {game.seriesNum} · GAME {game.gameInSeries} · {game.home ? 'HOME' : 'AWAY'}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: fonts.ui, letterSpacing: '0.04em' }}>
            {team.name}
          </div>
          <div style={{ fontSize: fontSize.xs, color: colors.text.muted, marginTop: '2px' }}>
            {eras.map(e => ERA_LABEL[e] ?? e).join(' / ')}
          </div>
        </div>
        <DifficultyBadge difficulty={team.difficulty} />
      </div>

      {/* Description */}
      <div style={{ fontSize: fontSize.xs, color: colors.text.secondary, lineHeight: 1.55 }}>
        {team.description}
      </div>

      {/* Starter + top hitters */}
      <div style={{
        background: 'rgba(0,0,0,0.2)', borderRadius: radius.lg,
        padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        <div style={{ fontSize: fontSize.xxs, color: colors.text.muted, letterSpacing: '0.12em', marginBottom: '2px' }}>
          THEIR LINEUP
        </div>
        {sp && (
          <RosterPreviewRow slot="SP" tools={sp.tools} trait={sp.trait} repertoire={sp.pitchRepertoire} />
        )}
        {hitters.map((h, i) => (
          <RosterPreviewRow key={i} slot={h.slot} tools={h.tools} trait={h.trait} />
        ))}
      </div>

      {/* AI tendencies */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <TendencyPill label="Token aggression" value={Math.round(team.aiProfile.tokenAggressiveness * 100) + '%'} />
        <TendencyPill label="Zone variety"     value={Math.round(team.aiProfile.zoneVariety * 100) + '%'} />
        <TendencyPill label="Bluff freq"       value={Math.round(team.aiProfile.bluffFrequency * 100) + '%'} />
      </div>

      {/* Play button */}
      <motion.button
        onClick={onPlay}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        style={{
          padding:      STYLES.playBtn.padding,
          borderRadius: STYLES.playBtn.radius,
          fontFamily:   STYLES.playBtn.font,
          fontSize:     STYLES.playBtn.fontSize,
          background:   STYLES.playBtn.bg,
          border:       STYLES.playBtn.border,
          color:        STYLES.playBtn.color,
          fontWeight:   900,
          cursor:       'pointer',
          letterSpacing:'0.12em',
          alignSelf:    'flex-start',
        }}
      >
        ▶ PLAY GAME {game.gameNum}
      </motion.button>
    </motion.div>
  )
}

// ─── Series row ───────────────────────────────────────────────────────────────

function SeriesRow({ games, seriesResult, isActive }) {
  const team    = getTeamById(games[0].opponent)
  const diff    = STYLES.difficultyBadge[team?.difficulty ?? 'medium']
  const isComplete = seriesResult?.complete ?? false
  const seriesWon  = isComplete && seriesResult.wins > seriesResult.losses

  return (
    <div style={{
      background:   isActive ? STYLES.series.activeBg   : STYLES.series.bg,
      border:       isActive ? STYLES.series.activeBorder : STYLES.series.border,
      borderRadius: STYLES.series.radius,
      padding:      STYLES.series.padding,
      display:      'flex',
      alignItems:   'center',
      gap:          '12px',
    }}>
      {/* Series number */}
      <div style={{
        fontSize: fontSize.xxs, color: colors.text.muted,
        fontFamily: fonts.ui, fontWeight: 900, minWidth: '22px',
        letterSpacing: '0.06em',
      }}>
        S{games[0].seriesNum}
      </div>

      {/* Team name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: fontSize.sm, fontWeight: 700, fontFamily: fonts.ui,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          color: isActive ? colors.text.primary : colors.text.secondary,
        }}>
          {team?.name ?? games[0].opponent}
        </div>
      </div>

      {/* Game dots */}
      <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
        {games.map(game => (
          <GameDot key={game.gameNum} game={game} />
        ))}
      </div>

      {/* Series result badge */}
      {isComplete && (
        <div style={{
          fontSize: fontSize.xxs, fontWeight: 900, fontFamily: fonts.ui,
          color:   seriesWon ? colors.success : colors.danger,
          letterSpacing: '0.08em', flexShrink: 0,
        }}>
          {seriesWon ? 'WON' : 'LOST'}
        </div>
      )}

      {/* Difficulty dot */}
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
        background: diff.color, opacity: 0.8,
      }} />
    </div>
  )
}

function GameDot({ game }) {
  let bg, border
  if (game.status === 'complete') {
    if (game.result?.win) {
      bg = 'rgba(34,197,94,0.7)'; border = '1px solid rgba(34,197,94,0.9)'
    } else {
      bg = 'rgba(239,68,68,0.7)'; border = '1px solid rgba(239,68,68,0.9)'
    }
  } else {
    bg = 'rgba(255,255,255,0.1)'; border = '1px solid rgba(255,255,255,0.2)'
  }
  return (
    <div style={{
      width: STYLES.series.dotSize, height: STYLES.series.dotSize,
      borderRadius: '50%', background: bg, border,
    }} />
  )
}

// ─── Season complete panel ────────────────────────────────────────────────────

function SeasonCompletePanel({ standings }) {
  const diff    = standings.runsFor - standings.runsAgainst
  const diffStr = diff > 0 ? `+${diff}` : `${diff}`
  const winPct  = standings.w + standings.l > 0
    ? ((standings.w / (standings.w + standings.l)) * 100).toFixed(1)
    : '0.0'

  return (
    <div style={{
      background: 'rgba(240,168,48,0.06)',
      border: '1px solid rgba(240,168,48,0.25)',
      borderRadius: STYLES.nextGame.radius,
      padding: STYLES.nextGame.padding,
      display: 'flex', flexDirection: 'column', gap: '16px',
    }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: fonts.ui, letterSpacing: '0.06em', color: colors.amber }}>
        SEASON COMPLETE
      </div>
      <div style={{ display: 'flex', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: fonts.ui }}>{standings.w}–{standings.l}</div>
          <div style={{ fontSize: fontSize.xxs, color: colors.text.muted, letterSpacing: '0.1em' }}>RECORD</div>
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: fonts.ui, color: diff >= 0 ? colors.success : colors.danger }}>
            {diffStr}
          </div>
          <div style={{ fontSize: fontSize.xxs, color: colors.text.muted, letterSpacing: '0.1em' }}>RUN DIFF</div>
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: fonts.ui }}>{winPct}%</div>
          <div style={{ fontSize: fontSize.xxs, color: colors.text.muted, letterSpacing: '0.1em' }}>WIN PCT</div>
        </div>
      </div>
      <div style={{ fontSize: fontSize.xs, color: colors.text.muted }}>
        Head to COLLECTION to open packs, then build a new roster for next season.
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }) {
  const s = STYLES.difficultyBadge[difficulty] ?? STYLES.difficultyBadge.medium
  return (
    <div style={{
      background: s.bg, border: s.border, borderRadius: radius.md,
      padding: '3px 8px', fontSize: fontSize.xxs,
      fontFamily: fonts.ui, fontWeight: 900, color: s.color,
      letterSpacing: '0.1em', flexShrink: 0,
    }}>
      {DIFFICULTY_LABEL[difficulty] ?? difficulty.toUpperCase()}
    </div>
  )
}

function TendencyPill({ label, value }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: radius.pill,
      padding: '3px 10px',
      display: 'flex', gap: '6px', alignItems: 'center',
    }}>
      <span style={{ fontSize: fontSize.xxs, color: colors.text.muted }}>{label}</span>
      <span style={{ fontSize: fontSize.xxs, fontWeight: 700, color: colors.text.secondary }}>{value}</span>
    </div>
  )
}

function RosterPreviewRow({ slot, tools, trait, repertoire }) {
  const ovr = Math.round(
    (tools.average ?? 0) * 0.25 +
    (tools.power   ?? 0) * 0.25 +
    (tools.speed   ?? 0) * 0.15 +
    (tools.fielding ?? 0) * 0.2 +
    (tools.arm     ?? 0) * 0.15
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        fontSize: fontSize.xxs, fontFamily: fonts.ui, fontWeight: 900,
        color: colors.text.muted, minWidth: '24px', letterSpacing: '0.06em',
      }}>
        {slot}
      </div>
      <div style={{
        fontSize: fontSize.xs, fontWeight: 700, fontFamily: fonts.ui,
        color: '#fff',
      }}>
        {ovr}
      </div>
      {trait && (
        <div style={{
          fontSize: fontSize.xxs, color: colors.text.muted,
          fontStyle: 'italic',
        }}>
          {trait}
        </div>
      )}
      {repertoire && (
        <div style={{ display: 'flex', gap: '3px', marginLeft: 'auto' }}>
          {repertoire.map(p => (
            <div key={p} style={{
              fontSize: '0.38rem', fontFamily: fonts.ui, fontWeight: 900,
              color: colors.pitch[p] ?? colors.text.muted,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${colors.pitch[p] ?? 'rgba(255,255,255,0.1)'}`,
              borderRadius: radius.sm,
              padding: '1px 4px',
            }}>
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Shared ────────────────────────────────────────────────────────────────────

const baseScreen = {
  background: STYLES.screen.bg,
  minHeight:  STYLES.screen.minH,
  padding:    STYLES.screen.padding,
  fontFamily: STYLES.screen.font,
  color:      STYLES.screen.color,
}
