/**
 * seasonStore.js
 * 30-game season schedule, standings, series results.
 * Persisted to localStorage.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import aiTeams from '../data/aiTeams.json'

// ─── Season structure ─────────────────────────────────────────────────────────
// 10 series × 3 games each = 30 games
// Difficulty escalates: 2 easy → 3 easy/medium → 3 medium/hard → 2 hard

const SERIES_SCHEDULE = [
  { seriesNum: 1,  opponent: 'ai_ironclads',    games: 3, home: true  },
  { seriesNum: 2,  opponent: 'ai_goldenstars',   games: 3, home: false },
  { seriesNum: 3,  opponent: 'ai_ironclads',     games: 3, home: false },
  { seriesNum: 4,  opponent: 'ai_goldenstars',   games: 3, home: true  },
  { seriesNum: 5,  opponent: 'ai_hardballers',   games: 3, home: true  },
  { seriesNum: 6,  opponent: 'ai_hardballers',   games: 3, home: false },
  { seriesNum: 7,  opponent: 'ai_modernmachine', games: 3, home: false },
  { seriesNum: 8,  opponent: 'ai_modernmachine', games: 3, home: true  },
  { seriesNum: 9,  opponent: 'ai_alleras',       games: 3, home: true  },
  { seriesNum: 10, opponent: 'ai_alleras',       games: 3, home: false },
]

function buildSchedule() {
  const games = []
  let gameNum = 1
  for (const series of SERIES_SCHEDULE) {
    for (let g = 0; g < series.games; g++) {
      games.push({
        gameNum,
        seriesNum:  series.seriesNum,
        gameInSeries: g + 1,
        opponent:   series.opponent,
        home:       series.home,
        status:     'scheduled',   // 'scheduled' | 'active' | 'complete'
        result:     null,          // null | { playerScore, aiScore, win: bool }
      })
      gameNum++
    }
  }
  return games
}

function emptyStandings() {
  return { w: 0, l: 0, runsFor: 0, runsAgainst: 0 }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSeasonStore = create(
  persist(
    (set, get) => ({
      seasonStarted: false,
      schedule:      [],
      standings:     emptyStandings(),
      seriesResults: [],   // [{ seriesNum, opponent, wins, losses, complete }]
      currentGameNum: 1,
      seasonYear:    2025,

      // ── Season lifecycle ──────────────────────────────────────────────────

      startSeason() {
        set({
          seasonStarted: true,
          schedule:      buildSchedule(),
          standings:     emptyStandings(),
          seriesResults: [],
          currentGameNum: 1,
        })
      },

      // ── Game result recording ─────────────────────────────────────────────

      recordGameResult({ gameNum, playerScore, aiScore }) {
        const { schedule, standings, seriesResults } = get()
        const win = playerScore > aiScore

        const newSchedule = schedule.map(g =>
          g.gameNum === gameNum
            ? { ...g, status: 'complete', result: { playerScore, aiScore, win } }
            : g
        )

        const newStandings = {
          w:            standings.w + (win ? 1 : 0),
          l:            standings.l + (win ? 0 : 1),
          runsFor:      standings.runsFor + playerScore,
          runsAgainst:  standings.runsAgainst + aiScore,
        }

        // Update series result
        const game = schedule.find(g => g.gameNum === gameNum)
        const existingSeries = seriesResults.find(s => s.seriesNum === game?.seriesNum)
        let newSeriesResults
        if (existingSeries) {
          newSeriesResults = seriesResults.map(s =>
            s.seriesNum === game.seriesNum
              ? {
                  ...s,
                  wins:   s.wins + (win ? 1 : 0),
                  losses: s.losses + (win ? 0 : 1),
                  complete: (s.wins + (win ? 1 : 0) + s.losses + (win ? 0 : 1)) >= 3,
                }
              : s
          )
        } else {
          newSeriesResults = [...seriesResults, {
            seriesNum: game?.seriesNum,
            opponent:  game?.opponent,
            wins:   win ? 1 : 0,
            losses: win ? 0 : 1,
            complete: false,
          }]
        }

        set({
          schedule: newSchedule,
          standings: newStandings,
          seriesResults: newSeriesResults,
          currentGameNum: gameNum + 1,
        })
      },

      // ── Queries ───────────────────────────────────────────────────────────

      getCurrentGame() {
        const { schedule, currentGameNum } = get()
        return schedule.find(g => g.gameNum === currentGameNum) ?? null
      },

      getNextGame() {
        const { schedule } = get()
        return schedule.find(g => g.status === 'scheduled') ?? null
      },

      getCurrentOpponent() {
        const game = get().getCurrentGame()
        if (!game) return null
        return aiTeams.find(t => t.id === game.opponent) ?? null
      },

      getRunDifferential() {
        const { standings } = get()
        return standings.runsFor - standings.runsAgainst
      },

      isSeasonComplete() {
        const { schedule } = get()
        return schedule.length > 0 && schedule.every(g => g.status === 'complete')
      },

      resetSeason() {
        set({
          seasonStarted: false,
          schedule: [],
          standings: emptyStandings(),
          seriesResults: [],
          currentGameNum: 1,
        })
      },
    }),
    {
      name: 'diamond-legends-season',
    }
  )
)
