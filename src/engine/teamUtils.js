import teams from '../data/teams.json'

/**
 * Returns the city, name, colors and abbreviation for a franchise in a given era.
 */
export function getTeamForEra(franchiseId, era) {
  const franchise = teams.find(t => t.franchiseId === franchiseId)
  if (!franchise) return null
  const history = franchise.history.find(h => h.eras.includes(era))
  if (!history) return null
  return {
    franchiseId,
    city: history.city,
    name: history.name,
    fullName: `${history.city} ${history.name}`,
    primary: history.primary,
    secondary: history.secondary,
    abbreviation: history.abbreviation,
  }
}
