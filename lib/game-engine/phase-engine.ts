import { draft, type DraftResult, type GameState } from './types'
export const resolveNightEffects = (state: GameState, effects: Partial<GameState['temporaryEffects']>): DraftResult<GameState> => draft({ ...structuredClone(state), temporaryEffects: { ...state.temporaryEffects, ...effects }, phase: 'day' })
export const advanceToNextNight = (state: GameState): DraftResult<GameState> => draft({ ...structuredClone(state), playableNight: state.playableNight + 1, phase: 'night', temporaryEffects: { guardTowerProtected: false, churchProtected: false, marketVotingBonus: false } })
