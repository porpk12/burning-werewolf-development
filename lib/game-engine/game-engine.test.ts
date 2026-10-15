import { describe, expect, it } from 'vitest'
import { createDefaultState } from './types'
import { calculateVotes } from './voting-engine'
import { resolveLocations } from './location-engine'
import { resolveBurn } from './werewolf-engine'
import { advanceToNextNight, resolveNightEffects } from './phase-engine'
import { getVictory } from './victory-engine'

describe('Burning Werewolf engine', () => {
  it('does not exile on a tied distrust vote', () => { const state = createDefaultState(); const result = calculateVotes(state, [{ voterId: 'player-3', targetId: 'player-1', kind: 'distrust' }, { voterId: 'player-4', targetId: 'player-2', kind: 'distrust' }]); expect(result.value.exiledPlayerId).toBeNull() })
  it('fails every visitor when capacity overflows', () => { const state = createDefaultState(); const result = resolveLocations(state, state.players.slice(0, 3).map((p) => ({ playerId: p.id, locationId: 'tower' }))); expect(result.value.failedPlayerIds).toHaveLength(3); expect(result.value.enteredPlayerIds).toHaveLength(0) })
  it('fails conflicting burn targets', () => { const state = createDefaultState(); const result = resolveBurn(state, [{ werewolfId: 'player-1', locationId: 'library' }, { werewolfId: 'player-2', locationId: 'market' }]); expect(result.value.reason).toBe('conflict') })
  it('expires temporary effects on the next night', () => { const state = createDefaultState(); const day = resolveNightEffects(state, { churchProtected: true, marketVotingBonus: true }); const next = advanceToNextNight(day.value); expect(next.value.temporaryEffects.churchProtected).toBe(false); expect(next.value.temporaryEffects.marketVotingBonus).toBe(false) })
  it('detects both victory conditions', () => { const state = createDefaultState(); expect(getVictory({ ...state, playableNight: 7 })).toBe('villagers'); expect(getVictory({ ...state, locations: state.locations.map((l, i) => ({ ...l, burned: i > 2 })) })).toBe('werewolves') })
})
