/**
 * rosterStore.js
 * Player's 15-man roster, active lineup (9), bench, and lineup order.
 * Persisted to localStorage.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import cards from '../data/cards.json'

const LINEUP_SIZE  = 9
const ROSTER_SIZE  = 15
const BENCH_SIZE   = ROSTER_SIZE - LINEUP_SIZE   // 6

const LINEUP_SLOTS = ['C','1B','2B','3B','SS','LF','CF','RF','DH']

// Default starter roster: all modern-era cards (exactly 15)
const DEFAULT_ROSTER = cards
  .filter(c => c.era === 'modern')
  .slice(0, ROSTER_SIZE)
  .map(c => c.id)

// Default lineup: first 9 modern-era position players (no pitchers)
const DEFAULT_LINEUP = cards
  .filter(c => c.era === 'modern' && c.position !== 'SP' && c.position !== 'RP')
  .slice(0, LINEUP_SIZE)
  .map(c => c.id)

// Default pitcher: first modern SP
const DEFAULT_PITCHER = cards.find(
  c => c.era === 'modern' && c.position === 'SP'
)?.id ?? null

export const useRosterStore = create(
  persist(
    (set, get) => ({
      // All card IDs currently on the roster (up to 15)
      rosterIds: DEFAULT_ROSTER,

      // Active lineup: 9 card IDs in batting order
      lineupIds: DEFAULT_LINEUP,

      // Starting pitcher card ID
      pitcherId: DEFAULT_PITCHER,

      // ── Derived helpers ───────────────────────────────────────────────────

      getRoster() {
        const { rosterIds } = get()
        return cards.filter(c => rosterIds.includes(c.id))
      },

      getLineup() {
        const { lineupIds } = get()
        return lineupIds.map(id => cards.find(c => c.id === id)).filter(Boolean)
      },

      getPitcher() {
        const { pitcherId } = get()
        return cards.find(c => c.id === pitcherId) ?? null
      },

      getBench() {
        const { rosterIds, lineupIds, pitcherId } = get()
        const activeIds = new Set([...lineupIds, pitcherId])
        return cards.filter(c => rosterIds.includes(c.id) && !activeIds.has(c.id))
      },

      // ── Mutations ─────────────────────────────────────────────────────────

      /**
       * Add a card to the roster (from collection / pack).
       */
      addToRoster(cardId) {
        const { rosterIds } = get()
        if (rosterIds.includes(cardId)) return
        if (rosterIds.length >= ROSTER_SIZE) return   // roster full
        set({ rosterIds: [...rosterIds, cardId] })
      },

      /**
       * Remove a card from the roster (also removes from lineup).
       */
      removeFromRoster(cardId) {
        const { rosterIds, lineupIds, pitcherId } = get()
        set({
          rosterIds: rosterIds.filter(id => id !== cardId),
          lineupIds: lineupIds.filter(id => id !== cardId),
          pitcherId: pitcherId === cardId ? null : pitcherId,
        })
      },

      /**
       * Set the full lineup order (array of 9 card IDs).
       */
      setLineup(newLineupIds) {
        if (newLineupIds.length !== LINEUP_SIZE) return
        set({ lineupIds: newLineupIds })
      },

      /**
       * Swap a batter in the lineup for one on the bench.
       */
      swapLineupSpot(lineupIdx, benchCardId) {
        const { lineupIds, rosterIds } = get()
        if (!rosterIds.includes(benchCardId)) return
        const newLineup = [...lineupIds]
        newLineup[lineupIdx] = benchCardId
        set({ lineupIds: newLineup })
      },

      /**
       * Move a card within the lineup (reorder batting order).
       */
      moveInLineup(fromIdx, toIdx) {
        const { lineupIds } = get()
        const next = [...lineupIds]
        const [moved] = next.splice(fromIdx, 1)
        next.splice(toIdx, 0, moved)
        set({ lineupIds: next })
      },

      /**
       * Set the starting pitcher.
       */
      setPitcher(cardId) {
        set({ pitcherId: cardId })
      },

      /**
       * Reset to default roster / lineup.
       */
      resetRoster() {
        set({
          rosterIds: DEFAULT_ROSTER,
          lineupIds: DEFAULT_LINEUP,
          pitcherId: DEFAULT_PITCHER,
        })
      },
    }),
    {
      name: 'diamond-legends-roster-v2',
    }
  )
)
