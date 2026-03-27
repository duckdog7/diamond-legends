/**
 * collectionStore.js
 * Cards the player owns, pack history, and pack opening logic.
 * Persisted to localStorage.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import cards from '../data/cards.json'

// ─── Pack definitions ─────────────────────────────────────────────────────────

export const PACK_TYPES = {
  starter: {
    id:     'starter',
    label:  'Starter Pack',
    size:   5,
    cost:   0,
    weights: { common: 0.55, uncommon: 0.30, rare: 0.13, legend: 0.02 },
  },
  standard: {
    id:     'standard',
    label:  'Standard Pack',
    size:   5,
    cost:   100,
    weights: { common: 0.50, uncommon: 0.32, rare: 0.15, legend: 0.03 },
  },
  premium: {
    id:     'premium',
    label:  'Premium Pack',
    size:   5,
    cost:   300,
    weights: { common: 0.30, uncommon: 0.38, rare: 0.25, legend: 0.07 },
  },
}

// Cards available per era for the beta
const BETA_CARDS = cards.filter(c => c.era === 'deadball' || c.era === 'modern')

/**
 * Draw a rarity tier based on pack weights.
 */
function drawRarity(weights) {
  const roll = Math.random()
  if (roll < weights.legend)                             return 'legend'
  if (roll < weights.legend + weights.rare)              return 'rare'
  if (roll < weights.legend + weights.rare + weights.uncommon) return 'uncommon'
  return 'common'
}

/**
 * Draw n cards from available pool, weighted by rarity.
 * Guaranteed at least one uncommon in a pack of 5.
 */
function drawPack(packType, ownedIds) {
  const { size, weights } = packType
  const byRarity = {
    common:   BETA_CARDS.filter(c => c.rarity === 'common'),
    uncommon: BETA_CARDS.filter(c => c.rarity === 'uncommon'),
    rare:     BETA_CARDS.filter(c => c.rarity === 'rare'),
    legend:   BETA_CARDS.filter(c => c.rarity === 'legend'),
  }

  const drawn = []
  let guaranteedUncommonUsed = false

  for (let i = 0; i < size; i++) {
    // Guarantee at least one uncommon in the pack
    let rarity
    if (i === size - 1 && !guaranteedUncommonUsed && drawn.every(c => c.rarity === 'common')) {
      rarity = 'uncommon'
    } else {
      rarity = drawRarity(weights)
    }
    if (rarity === 'uncommon') guaranteedUncommonUsed = true

    const pool = byRarity[rarity]
    if (!pool || pool.length === 0) continue

    // Prefer cards not yet owned (pity system)
    const unowned = pool.filter(c => !ownedIds.has(c.id))
    const source  = unowned.length > 0 ? unowned : pool
    const card    = source[Math.floor(Math.random() * source.length)]
    drawn.push(card)
  }

  return drawn
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCollectionStore = create(
  persist(
    (set, get) => ({
      // All card IDs the player owns (may have duplicates as strings)
      ownedIds: cards
        .filter(c => c.era === 'deadball' || c.era === 'modern')
        .map(c => c.id),

      // Pack history: [{ packType, cardIds, openedAt }]
      packHistory: [],

      // Currency (for future pack economy)
      coins: 500,

      // ── Derived ─────────────────────────────────────────────────────────

      getOwnedCards() {
        const { ownedIds } = get()
        return ownedIds.map(id => cards.find(c => c.id === id)).filter(Boolean)
      },

      getUniqueOwned() {
        const { ownedIds } = get()
        const seen = new Set()
        return ownedIds.filter(id => {
          if (seen.has(id)) return false
          seen.add(id); return true
        }).map(id => cards.find(c => c.id === id)).filter(Boolean)
      },

      ownsCard(cardId) {
        return get().ownedIds.includes(cardId)
      },

      // ── Pack opening ─────────────────────────────────────────────────────

      /**
       * Open a pack. Returns the drawn cards (or null if can't afford).
       */
      openPack(packTypeId) {
        const packType = PACK_TYPES[packTypeId]
        if (!packType) return null

        const { ownedIds, packHistory, coins } = get()
        if (coins < packType.cost) return null

        const ownedSet = new Set(ownedIds)
        const drawn    = drawPack(packType, ownedSet)
        const newIds   = drawn.map(c => c.id)

        set({
          ownedIds:    [...ownedIds, ...newIds],
          packHistory: [...packHistory, {
            packType:  packTypeId,
            cardIds:   newIds,
            openedAt:  Date.now(),
          }],
          coins: coins - packType.cost,
        })

        return drawn
      },

      /**
       * Award coins (after a win, series, etc.).
       */
      awardCoins(amount) {
        set(s => ({ coins: s.coins + amount }))
      },

      /**
       * Add a specific card (from draft, reward, etc.).
       */
      addCard(cardId) {
        set(s => ({ ownedIds: [...s.ownedIds, cardId] }))
      },

      resetCollection() {
        set({
          ownedIds: cards
            .filter(c => c.era === 'deadball' || c.era === 'modern')
            .map(c => c.id),
          packHistory: [],
          coins: 500,
        })
      },
    }),
    {
      name: 'diamond-legends-collection-v3',
    }
  )
)
