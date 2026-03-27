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

// Add display fields to AI roster entries so engine + HUD can render them
function normalizeAICard(entry, teamId) {
  return {
    ...entry,
    id:   entry.cardId ?? `${teamId}_${entry.slot}`,
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
