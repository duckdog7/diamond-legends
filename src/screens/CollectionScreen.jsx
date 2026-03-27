/**
 * CollectionScreen.jsx
 * Card grid with era/rarity/position filters, sort, and pack opening.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollectionStore, PACK_TYPES } from '../stores/collectionStore'
import Card from '../components/Card'
import PackOpenScreen from './PackOpenScreen'
import { colors, fonts, fontSize, radius } from '../theme'
import cards from '../data/cards.json'

// ─── Design tokens ────────────────────────────────────────────────────────────
const STYLES = {
  screen: {
    bg:      'linear-gradient(160deg, #0a0a18 0%, #0e1020 100%)',
    minH:    'calc(100vh - 48px)',
    padding: '24px 20px',
    font:    fonts.body,
    color:   colors.text.primary,
  },
  filterBar: {
    bg:      'rgba(255,255,255,0.03)',
    border:  '1px solid rgba(255,255,255,0.07)',
    radius:  radius.lg,
    padding: '8px 12px',
    gap:     '6px',
    mb:      '20px',
  },
  filterBtn: {
    radius:     radius.md,
    padding:    '4px 12px',
    fontSize:   fontSize.xxs,
    font:       fonts.ui,
    active: {
      bg:     'rgba(255,255,255,0.14)',
      border: '1px solid rgba(255,255,255,0.25)',
      color:  '#fff',
    },
    idle: {
      bg:     'transparent',
      border: '1px solid transparent',
      color:  colors.text.muted,
    },
  },
  grid: {
    gap:        '16px',
    columns:    'repeat(auto-fill, minmax(260px, 1fr))',
  },
  counter: {
    fontSize: fontSize.xs,
    color:    colors.text.muted,
  },
  packSection: {
    bg:      'rgba(255,255,255,0.03)',
    border:  '1px solid rgba(255,255,255,0.07)',
    radius:  radius.lg,
    padding: '16px',
    mt:      '32px',
  },
  packCard: {
    bg:      'rgba(255,255,255,0.04)',
    border:  '1px solid rgba(255,255,255,0.1)',
    hoverBorder: '1px solid rgba(255,255,255,0.25)',
    radius:  radius.lg,
    padding: '14px 16px',
    gap:     '8px',
  },
  emptyState: {
    color:    colors.text.muted,
    fontSize: fontSize.md,
    padding:  '40px 0',
  },
}

const ERA_FILTERS   = ['all', 'deadball', 'modern']
const RARITY_FILTERS = ['all', 'common', 'uncommon', 'rare', 'legend']
const POS_FILTERS   = ['all', 'SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']
const SORT_OPTIONS  = [
  { id: 'ovr',      label: 'OVR'      },
  { id: 'name',     label: 'Name'     },
  { id: 'era',      label: 'Era'      },
  { id: 'rarity',   label: 'Rarity'   },
  { id: 'position', label: 'Position' },
]

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, legend: 3 }
const ERA_ORDER    = { deadball: 0, golden: 1, hardball: 2, modern: 3 }

function overallRating(tools) {
  const w = { average: 0.25, power: 0.25, speed: 0.15, fielding: 0.2, arm: 0.15 }
  return Math.round(Object.entries(tools).reduce((s, [k, v]) => s + v * (w[k] ?? 0.2), 0))
}

export default function CollectionScreen() {
  const store        = useCollectionStore()
  const ownedCards   = store.getUniqueOwned()
  const coins        = store.coins

  const [eraFilter,    setEraFilter]    = useState('all')
  const [rarityFilter, setRarityFilter] = useState('all')
  const [posFilter,    setPosFilter]    = useState('all')
  const [sortBy,       setSortBy]       = useState('ovr')
  const [packOpen,     setPackOpen]     = useState(null)   // pack type id or null
  const [lastPack,     setLastPack]     = useState(null)   // drawn cards after open

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = ownedCards
    .filter(c => eraFilter    === 'all' || c.era      === eraFilter)
    .filter(c => rarityFilter === 'all' || c.rarity   === rarityFilter)
    .filter(c => posFilter    === 'all' || c.position === posFilter || (c.positions ?? []).includes(posFilter))
    .sort((a, b) => {
      if (sortBy === 'ovr')      return overallRating(b.tools) - overallRating(a.tools)
      if (sortBy === 'name')     return a.name.localeCompare(b.name)
      if (sortBy === 'era')      return (ERA_ORDER[a.era] ?? 0) - (ERA_ORDER[b.era] ?? 0)
      if (sortBy === 'rarity')   return (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0)
      if (sortBy === 'position') return a.position.localeCompare(b.position)
      return 0
    })

  function handleOpenPack(packTypeId) {
    const drawn = store.openPack(packTypeId)
    if (drawn) {
      setLastPack(drawn)
      setPackOpen(packTypeId)
    }
  }

  if (packOpen && lastPack) {
    return (
      <PackOpenScreen
        cards={lastPack}
        packLabel={PACK_TYPES[packOpen]?.label ?? 'Pack'}
        onDone={() => { setPackOpen(null); setLastPack(null) }}
      />
    )
  }

  return (
    <div style={{
      background: STYLES.screen.bg,
      minHeight:  STYLES.screen.minH,
      padding:    STYLES.screen.padding,
      fontFamily: STYLES.screen.font,
      color:      STYLES.screen.color,
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: fonts.ui, letterSpacing: '0.04em' }}>COLLECTION</div>
            <div style={{ fontSize: fontSize.xs, color: colors.text.muted, marginTop: '2px' }}>
              {ownedCards.length} cards owned · {filtered.length} shown
            </div>
          </div>
          <div style={{ fontSize: fontSize.xs, color: colors.amber, fontWeight: 700 }}>
            ◈ {coins}
          </div>
        </div>

        {/* Filter bar */}
        <div style={{
          background: STYLES.filterBar.bg,
          border:     STYLES.filterBar.border,
          borderRadius: STYLES.filterBar.radius,
          padding:    STYLES.filterBar.padding,
          display:    'flex', flexWrap: 'wrap', gap: STYLES.filterBar.gap,
          marginBottom: STYLES.filterBar.mb,
        }}>
          <FilterGroup label="ERA"   options={ERA_FILTERS}   value={eraFilter}    onChange={setEraFilter} />
          <Divider />
          <FilterGroup label="RARITY" options={RARITY_FILTERS} value={rarityFilter} onChange={setRarityFilter}
            colorMap={{ common: colors.rarity.common, uncommon: colors.rarity.uncommon, rare: colors.rarity.rare, legend: colors.rarity.legend }} />
          <Divider />
          <FilterGroup label="POS"  options={POS_FILTERS}   value={posFilter}    onChange={setPosFilter} />
          <Divider />
          <FilterGroup label="SORT" options={SORT_OPTIONS.map(o => o.id)} labels={Object.fromEntries(SORT_OPTIONS.map(o => [o.id, o.label]))}
            value={sortBy} onChange={setSortBy} />
        </div>

        {/* Card grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', ...STYLES.emptyState }}>
            No cards match this filter.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: STYLES.grid.columns,
            gap: STYLES.grid.gap,
          }}>
            {filtered.map(card => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
              >
                <Card card={card} size="lg" />
              </motion.div>
            ))}
          </div>
        )}

        {/* Pack section */}
        <div style={{
          ...STYLES.packSection,
          marginTop: STYLES.packSection.mt,
        }}>
          <div style={{
            fontSize: fontSize.xs, fontWeight: 900, fontFamily: fonts.ui,
            letterSpacing: '0.12em', color: colors.text.muted,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            paddingBottom: '8px', marginBottom: '14px',
          }}>
            OPEN PACKS
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.values(PACK_TYPES).map(pack => (
              <PackCard key={pack.id} pack={pack} coins={coins} onOpen={() => handleOpenPack(pack.id)} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterGroup({ label, options, value, onChange, colorMap = {}, labels = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontSize: '0.38rem', color: colors.text.muted, letterSpacing: '0.14em', fontWeight: 900, marginRight: '2px', fontFamily: fonts.ui }}>
        {label}
      </span>
      {options.map(opt => {
        const active  = value === opt
        const s       = active ? STYLES.filterBtn.active : STYLES.filterBtn.idle
        const optColor = colorMap[opt]
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              borderRadius: STYLES.filterBtn.radius,
              padding:      STYLES.filterBtn.padding,
              fontSize:     STYLES.filterBtn.fontSize,
              fontFamily:   STYLES.filterBtn.font,
              fontWeight:   700,
              background:   s.bg,
              border:       s.border,
              color:        active && optColor ? optColor : s.color,
              cursor:       'pointer',
              letterSpacing:'0.06em',
              transition:   'all 0.1s',
            }}
          >
            {labels[opt] ?? (opt === 'all' ? 'ALL' : opt.toUpperCase())}
          </button>
        )
      })}
    </div>
  )
}

function Divider() {
  return <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)', alignSelf: 'center', margin: '0 2px' }} />
}

function PackCard({ pack, coins, onOpen }) {
  const canAfford = coins >= pack.cost
  return (
    <motion.div
      onClick={canAfford ? onOpen : undefined}
      whileHover={canAfford ? { y: -2 } : {}}
      style={{
        ...STYLES.packCard,
        display:      'flex',
        flexDirection:'column',
        cursor:       canAfford ? 'pointer' : 'not-allowed',
        opacity:      canAfford ? 1 : 0.45,
        minWidth:     '140px',
        transition:   'border 0.12s',
      }}
    >
      <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>📦</div>
      <div style={{ fontSize: '0.65rem', fontWeight: 900, fontFamily: fonts.ui, color: '#fff' }}>{pack.label}</div>
      <div style={{ fontSize: fontSize.xxs, color: colors.text.muted, marginTop: '2px' }}>{pack.size} cards per pack</div>
      <div style={{
        marginTop: '8px',
        fontSize: fontSize.xs, fontWeight: 900,
        color: pack.cost === 0 ? colors.success : colors.amber,
      }}>
        {pack.cost === 0 ? 'FREE' : `◈ ${pack.cost}`}
      </div>
    </motion.div>
  )
}
