import { useState } from 'react'
import Nav from './components/Nav'
import AtBatScene from './components/AtBatScene'
import CollectionScreen from './screens/CollectionScreen'
import RosterScreen from './screens/RosterScreen'
import SeasonScreen from './screens/SeasonScreen'
import { useCollectionStore } from './stores/collectionStore'
import { useSeasonStore } from './stores/seasonStore'
import { useRosterStore } from './stores/rosterStore'
import cards from './data/cards.json'
import aiTeams from './data/aiTeams.json'

// Fallback AI team for quick-play when no season is active
const FALLBACK_AI = aiTeams[0]

// Resolve AI roster entry to a real card, falling back to a synthetic stub
function normalizeAICard(entry, teamId) {
  // 1. Exact cardId match
  if (entry.cardId) {
    const exact = cards.find(c => c.id === entry.cardId)
    if (exact) return exact
  }
  // 2. Fuzzy: same franchiseId + era + position
  const fuzzy = cards.find(c =>
    c.franchiseId === entry.franchiseId &&
    c.era         === entry.era         &&
    c.position    === entry.position
  )
  if (fuzzy) return fuzzy
  // 3. Loose: any card with matching era + position (different team is fine)
  const loose = cards.find(c =>
    c.era      === entry.era &&
    c.position === entry.position
  )
  if (loose) return loose
  // 4. Position-only: any era (e.g. DH exists in modern but not deadball)
  const anyEra = cards.find(c => c.position === entry.position)
  if (anyEra) return anyEra
  // 5. Synthetic stub
  return {
    ...entry,
    id:   `${teamId}_${entry.slot}`,
    name: `${entry.franchiseId} ${entry.slot}`,
  }
}

export default function App() {
  const [screen, setScreen] = useState('collection')  // 'collection' | 'roster' | 'season' | 'atbat'

  const coins     = useCollectionStore(s => s.coins)
  const standings = useSeasonStore(s => s.standings)

  const lineupIds  = useRosterStore(s => s.lineupIds)
  const currentGameNum   = useSeasonStore(s => s.currentGameNum)
  const schedule         = useSeasonStore(s => s.schedule)
  const recordGameResult = useSeasonStore(s => s.recordGameResult)

  // AtBat — full screen, no nav
  if (screen === 'atbat') {
    // Resolve player's lineup from card data
    const playerLineup = lineupIds
      .map(id => cards.find(c => c.id === id))
      .filter(Boolean)

    // Resolve AI opponent from current scheduled game, or fallback
    const currentGame = schedule.find(g => g.gameNum === currentGameNum) ?? null
    const aiTeam = currentGame
      ? (aiTeams.find(t => t.id === currentGame.opponent) ?? FALLBACK_AI)
      : FALLBACK_AI
    const aiPitcher  = normalizeAICard(aiTeam.roster.find(r => r.position === 'SP'), aiTeam.id)
    const aiDefense  = aiTeam.roster
      .filter(r => r.position !== 'SP' && r.position !== 'RP')
      .map(r => normalizeAICard(r, aiTeam.id))

    // Player's best-arm card becomes their starting pitcher in the bottom half
    const playerPitcher = playerLineup.length > 0
      ? playerLineup.reduce((best, c) =>
          (c?.tools?.arm ?? 0) > (best?.tools?.arm ?? 0) ? c : best
        , playerLineup[0])
      : null

    function handleGameEnd(game) {
      if (currentGame) {
        recordGameResult({
          gameNum:     currentGame.gameNum,
          playerScore: game.score.away,   // player bats as away
          aiScore:     game.score.home,
        })
      }
      setScreen('season')
    }

    return (
      <AtBatScene
        lineup={playerLineup.length > 0 ? playerLineup : [cards[0]]}
        pitcherCard={aiPitcher}
        defenseLineup={aiDefense}
        playerPitcherCard={playerPitcher}
        aiLineup={aiDefense}
        onGameEnd={handleGameEnd}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080814' }}>
      <Nav
        screen={screen}
        onNav={setScreen}
        standings={standings}
        coins={coins}
      />

      {screen === 'collection' && <CollectionScreen />}
      {screen === 'roster'     && <RosterScreen onPlayGame={() => setScreen('atbat')} />}
      {screen === 'season'     && <SeasonScreen onPlayGame={() => setScreen('atbat')} />}
    </div>
  )
}
