import { describe, expect, it } from 'vitest'
import { applyBurnDraft, resolveBurn } from './werewolf-engine'
import { createDefaultState, getVictory } from './types'
import { resolveLocations } from './location-engine'
import { advanceToNextNight, resolveNightEffects } from './phase-engine'
import { applyExileDraft, calculateVotes } from './voting-engine'

const vote = (voterId: string, targetId: string, kind: 'trust' | 'distrust') => ({ voterId, targetId, kind })
const burn = (werewolfId: string, locationId: string) => ({ werewolfId, locationId })
const choice = (playerId: string, locationId: string | null) => ({ playerId, locationId })

describe('Burning Werewolf engine', () => {
  it('exiles a unique highest distrust target with zero trust votes', () => {
    const result = calculateVotes(createDefaultState(), [vote('player-3', 'player-4', 'distrust'), vote('player-5', 'player-4', 'distrust'), vote('player-6', 'player-3', 'distrust')])
    expect(result.value.exiledPlayerId).toBe('player-4')
  })

  it('exiles a unique highest distrust target even when another target has trust votes', () => {
    const result = calculateVotes(createDefaultState(), [vote('player-3', 'player-4', 'distrust'), vote('player-5', 'player-4', 'distrust'), vote('player-6', 'player-3', 'distrust'), vote('player-7', 'player-3', 'trust')])
    expect(result.value.exiledPlayerId).toBe('player-4')
  })

  it('resolves a tied highest distrust vote with exactly one zero-trust candidate', () => {
    const result = calculateVotes(createDefaultState(), [vote('player-3', 'player-4', 'distrust'), vote('player-5', 'player-4', 'distrust'), vote('player-6', 'player-3', 'distrust'), vote('player-7', 'player-3', 'distrust'), vote('player-8', 'player-3', 'trust')])
    expect(result.value.eligiblePlayerIds).toEqual(['player-4'])
    expect(result.value.exiledPlayerId).toBe('player-4')
  })

  it('does not exile tied highest distrust candidates when multiple have zero trust', () => {
    const result = calculateVotes(createDefaultState(), [vote('player-3', 'player-4', 'distrust'), vote('player-5', 'player-4', 'distrust'), vote('player-6', 'player-3', 'distrust'), vote('player-7', 'player-3', 'distrust')])
    expect(result.value.eligiblePlayerIds).toEqual(['player-4', 'player-3'])
    expect(result.value.exiledPlayerId).toBeNull()
  })

  it('rejects a werewolf trusting another werewolf', () => {
    const result = calculateVotes(createDefaultState(), [vote('player-1', 'player-2', 'trust')])
    expect(result.value.trustCounts).toEqual({})
  })

  it('rejects self trust', () => {
    expect(calculateVotes(createDefaultState(), [vote('player-3', 'player-3', 'trust')]).value.trustCounts).toEqual({})
  })

  it('rejects self distrust', () => {
    expect(calculateVotes(createDefaultState(), [vote('player-3', 'player-3', 'distrust')]).value.distrustCounts).toEqual({})
  })

  it('ignores invalid voter and target ids', () => {
    const result = calculateVotes(createDefaultState(), [vote('missing', 'player-3', 'distrust'), vote('player-3', 'missing', 'distrust')])
    expect(result.value.distrustCounts).toEqual({})
  })

  it('ignores duplicate submissions only when they are not valid game actions', () => {
    const result = calculateVotes(createDefaultState(), [vote('player-3', 'player-4', 'distrust'), vote('player-3', 'player-3', 'distrust')])
    expect(result.value.distrustCounts).toEqual({ 'player-4': 1 })
  })

  it('does not exile on an empty vote', () => {
    expect(calculateVotes(createDefaultState(), []).value.exiledPlayerId).toBeNull()
  })

  it('applies a confirmed exile immutably', () => {
    const state = createDefaultState()
    const result = calculateVotes(state, [vote('player-3', 'player-4', 'distrust')])
    const next = applyExileDraft(state, result, true)
    expect(next.players.find((p) => p.id === 'player-4')).toMatchObject({ active: false, exiled: true })
    expect(state.players.find((p) => p.id === 'player-4')?.active).toBe(true)
  })

  it('does not apply an unconfirmed exile draft', () => {
    const state = createDefaultState()
    const result = calculateVotes(state, [vote('player-3', 'player-4', 'distrust')])
    expect(applyExileDraft(state, result, false)).toEqual(state)
  })

  it('allows visitors equal to location capacity', () => {
    const state = createDefaultState()
    const result = resolveLocations(state, [choice('player-3', 'tower'), choice('player-4', 'tower')])
    expect(result.value.enteredPlayerIds).toEqual(['player-3', 'player-4'])
    expect(result.value.failedPlayerIds).toEqual([])
  })

  it('fails all visitors when location capacity is exceeded', () => {
    const state = createDefaultState()
    const result = resolveLocations(state, [choice('player-3', 'tower'), choice('player-4', 'tower'), choice('player-5', 'tower')])
    expect(result.value.failedPlayerIds).toEqual(['player-3', 'player-4', 'player-5'])
    expect(result.value.enteredPlayerIds).toEqual([])
  })

  it('resolves visitors at multiple locations independently', () => {
    const result = resolveLocations(createDefaultState(), [choice('player-3', 'tower'), choice('player-4', 'library')])
    expect(result.value.enteredPlayerIds).toEqual(['player-3', 'player-4'])
  })

  it('ignores null and burned location choices', () => {
    const state = createDefaultState()
    state.locations[0].burned = true
    const result = resolveLocations(state, [choice('player-3', null), choice('player-4', 'library')])
    expect(result.value.enteredPlayerIds).toEqual([])
    expect(result.value.byLocation).toEqual({})
  })

  it('reports conflicting burn targets from multiple werewolves', () => {
    expect(resolveBurn(createDefaultState(), [burn('player-1', 'library'), burn('player-2', 'market')]).value).toMatchObject({ succeeded: false, reason: 'conflict' })
  })

  it('allows multiple werewolves agreeing on one burn target', () => {
    expect(resolveBurn(createDefaultState(), [burn('player-1', 'library'), burn('player-2', 'library')]).value).toMatchObject({ succeeded: true, targetLocationId: 'library' })
  })

  it('reports no attempt when werewolves submit nothing', () => {
    expect(resolveBurn(createDefaultState(), []).value.reason).toBe('no-attempt')
  })

  it('guard tower protection prevents burning any location', () => {
    const state = createDefaultState()
    state.temporaryEffects.guardTowerProtected = true
    expect(resolveBurn(state, [burn('player-1', 'library')]).value.reason).toBe('guard-tower')
  })

  it('church protection prevents burning the church', () => {
    const state = createDefaultState()
    state.temporaryEffects.churchProtected = true
    expect(resolveBurn(state, [burn('player-1', 'church')]).value.reason).toBe('church')
  })

  it('applies a successful burn only after confirmation', () => {
    const state = createDefaultState()
    const result = resolveBurn(state, [burn('player-1', 'library')])
    expect(applyBurnDraft(state, result, false).locations[0].burned).toBe(false)
    expect(applyBurnDraft(state, result, true).locations[0].burned).toBe(true)
  })

  it('expires church protection after the next day phase', () => {
    const state = createDefaultState()
    const day = resolveNightEffects(state, { churchProtected: true })
    expect(day.value.phase).toBe('day')
    expect(advanceToNextNight(day.value).value.temporaryEffects.churchProtected).toBe(false)
  })

  it('expires market bonus after the next day phase', () => {
    const state = createDefaultState()
    const day = resolveNightEffects(state, { marketVotingBonus: true })
    expect(advanceToNextNight(day.value).value.temporaryEffects.marketVotingBonus).toBe(false)
  })

  it('advances the playable night and phase together', () => {
    const state = createDefaultState()
    const next = advanceToNextNight(state).value
    expect(next).toMatchObject({ playableNight: 1, phase: 'night' })
  })

  it('werewolves win when exactly three unburned locations remain', () => {
    const state = createDefaultState()
    state.locations = state.locations.map((location, index) => ({ ...location, burned: index > 2 }))
    expect(getVictory(state)).toBe('werewolves')
  })

  it('villagers win when all werewolves are exiled', () => {
    const state = createDefaultState()
    state.players = state.players.map((player) => player.role === 'werewolf' ? { ...player, active: false, exiled: true } : player)
    expect(getVictory(state)).toBe('villagers')
  })

  it('villagers win after seven playable nights', () => {
    expect(getVictory({ ...createDefaultState(), playableNight: 7 })).toBe('villagers')
  })

  it('does not mutate state while checking victory', () => {
    const state = createDefaultState()
    const before = JSON.stringify(state)
    getVictory(state)
    expect(JSON.stringify(state)).toBe(before)
  })

  it('keeps a finished victory decisive when villagers also have no werewolves', () => {
    const state = createDefaultState()
    state.locations = state.locations.map((location, index) => ({ ...location, burned: index > 2 }))
    state.players = state.players.map((player) => player.role === 'werewolf' ? { ...player, active: false, exiled: true } : player)
    expect(getVictory(state)).toBe('werewolves')
  })
})


describe('engine integration contract', () => {
  it('starts in night zero with two werewolves and five unburned locations', () => {
    const state = createDefaultState()
    expect(state.playableNight).toBe(0)
    expect(state.players.filter((p) => p.role === 'werewolf')).toHaveLength(2)
    expect(state.locations.filter((l) => !l.burned)).toHaveLength(5)
  })
})
