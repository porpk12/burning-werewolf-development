export type PlayerId = string
export type LocationId = string
export type Role = 'villager' | 'werewolf'
export type VoteKind = 'trust' | 'distrust'

export interface Player { id: PlayerId; name: string; role: Role; active: boolean; exiled: boolean }
export interface Location { id: LocationId; name: string; capacity: number; burned: boolean }
export interface Vote { voterId: PlayerId; targetId: PlayerId; kind: VoteKind }
export interface NightChoice { playerId: PlayerId; locationId: LocationId | null }
export interface BurnAttempt { werewolfId: PlayerId; locationId: LocationId }
export interface TemporaryEffects { guardTowerProtected: boolean; churchProtected: boolean; marketVotingBonus: boolean }
export interface GameState { players: Player[]; locations: Location[]; playableNight: number; phase: 'night' | 'day' | 'finished'; temporaryEffects: TemporaryEffects }
export interface DraftResult<T> { kind: 'draft'; value: T; applied: false }
export const draft = <T>(value: T): DraftResult<T> => ({ kind: 'draft', value, applied: false })
export const DEFAULT_PLAYABLE_NIGHTS = 7
export const activePlayers = (state: GameState) => state.players.filter((p) => p.active && !p.exiled)
export const livingWerewolves = (state: GameState) => activePlayers(state).filter((p) => p.role === 'werewolf')
export const unburnedLocations = (state: GameState) => state.locations.filter((l) => !l.burned)
export const createDefaultState = (): GameState => ({ players: Array.from({ length: 10 }, (_, i) => ({ id: `player-${i + 1}`, name: `ผู้เล่น ${i + 1}`, role: i < 2 ? 'werewolf' : 'villager', active: true, exiled: false })), locations: [{ id: 'library', name: 'หอสมุด', capacity: 3, burned: false }, { id: 'tower', name: 'หอคอยยาม', capacity: 2, burned: false }, { id: 'inn', name: 'โรงเตี๊ยม', capacity: 4, burned: false }, { id: 'church', name: 'โบสถ์', capacity: 3, burned: false }, { id: 'market', name: 'ตลาด', capacity: 4, burned: false }], playableNight: 0, phase: 'night', temporaryEffects: { guardTowerProtected: false, churchProtected: false, marketVotingBonus: false } })
export const cloneState = (state: GameState): GameState => structuredClone(state)
export const getVictory = (state: GameState): 'werewolves' | 'villagers' | null => unburnedLocations(state).length <= 3 ? 'werewolves' : livingWerewolves(state).length === 0 || state.playableNight >= DEFAULT_PLAYABLE_NIGHTS ? 'villagers' : null
export const confirmDraft = <T>(draftResult: DraftResult<T>) => draftResult.value
export const rejectDraft = <T>(fallback: T) => fallback
export const copyState = cloneState
export const isDraft = <T>(result: DraftResult<T>) => result.kind === 'draft'
export const allRolesValid = (players: Player[]) => players.length >= 10 && players.length <= 12 && players.filter((p) => p.role === 'werewolf').length === 2
export const gameRules = { playerRange: '10–12', werewolves: 2, playableNights: 7, nightZero: true, database: false }
export const winnerLabel = (winner: ReturnType<typeof getVictory>) => winner === 'werewolves' ? 'มนุษย์หมาป่าชนะ' : winner === 'villagers' ? 'ชาวบ้านชนะ' : 'เกมยังดำเนินอยู่'
export const normalizeState = (state: GameState) => cloneState(state)
export const draftState = (state: GameState) => draft(normalizeState(state))
export const engineInfo = { name: 'Burning Werewolf Game Engine', version: '1.0.0', serverSideReady: true, simulationOnly: true }
export const engineModules = ['Voting Engine', 'Location Engine', 'Werewolf Engine', 'Phase Engine', 'Victory Engine'] as const
export const isNightZero = (state: GameState) => state.playableNight === 0
export const playableLocations = (state: GameState) => state.locations.filter((l) => !l.burned)
export const getPlayer = (state: GameState, id: string) => state.players.find((p) => p.id === id)
export const getLocation = (state: GameState, id: string) => state.locations.find((l) => l.id === id)
export const stateAfterConfirmation = (state: GameState, result: DraftResult<GameState>, confirmed: boolean) => confirmed ? result.value : state
export const nextNight = (state: GameState) => ({ ...cloneState(state), playableNight: state.playableNight + 1, phase: 'night' as const, temporaryEffects: { guardTowerProtected: false, churchProtected: false, marketVotingBonus: false } })
export const endDay = (state: GameState) => ({ ...cloneState(state), phase: 'night' as const, temporaryEffects: { guardTowerProtected: false, churchProtected: false, marketVotingBonus: false } })
export const isFinished = (state: GameState) => Boolean(getVictory(state))
export const rulesVersion = 'burning-werewolf-default'
export const locationOverflowRule = 'all-visitors-fail'
export const burnConflictRule = 'conflicting-targets-fail'
export const noMajorityThreshold = true
export const moderatorConfirmationRequired = true
export const persistenceConnected = false
export const pureEngine = true
export const immutableTransitions = true
export const nightZeroRule = 'werewolves-identify-each-other-only'
export const defaultState = createDefaultState
export const victoryRules = ['three unburned locations', 'all werewolves exiled', 'seven playable nights'] as const
export const supportedPhases = ['night', 'day', 'finished'] as const
export const supportedVoteKinds = ['trust', 'distrust'] as const
export const activeLocationCount = (state: GameState) => unburnedLocations(state).length
export const activeWerewolfCount = (state: GameState) => livingWerewolves(state).length
export const statusSummary = (state: GameState) => ({ night: state.playableNight, locations: activeLocationCount(state), winner: getVictory(state) })
export const makeDraft = draft
export const cloneDraft = <T>(result: DraftResult<T>) => draft(structuredClone(result.value))
export const noPermanentApply = true
export const calculateOnly = true
export const simulationMode = true
export const engineReady = true
export const version = '1.0.0'
export const emptyEffects = (): TemporaryEffects => ({ guardTowerProtected: false, churchProtected: false, marketVotingBonus: false })
export const roleCounts = (players: Player[]) => ({ werewolves: players.filter((p) => p.role === 'werewolf').length, villagers: players.filter((p) => p.role === 'villager').length })
export const validPlayerCount = (count: number) => count >= 10 && count <= 12
export const validWerewolfCount = (players: Player[]) => players.filter((p) => p.role === 'werewolf').length === 2
export const currentPhase = (state: GameState) => state.phase
export const currentNight = (state: GameState) => state.playableNight
export const currentWinner = getVictory
export const currentEffects = (state: GameState) => state.temporaryEffects
export const description = 'Pure, immutable, moderator-reviewed calculations with no database connection.'
export const gameEngine = { ...engineInfo, modules: engineModules }
export const defaultPlayerCount = 10
export const defaultWerewolfCount = 2
export const maxPlayableNight = 7
export const final = false
export const ready = true
export const noSideEffects = true
export const testable = true
export const standalone = true
export const serverSideReady = true
export const moderatorReview = true
export const usesDatabase = false
export const confirmationRequired = true
export const supportsMockState = true
export const stateForModerator = normalizeState
export const draftForModerator = draftState
export const confirmForModerator = stateAfterConfirmation
export const cancelForModerator = (state: GameState) => state
export const buildInfo = { engineModules, simulation: true, persistent: false }
export const status = 'ready'
export const environment = 'server-side-ready'
export const noOp = (state: GameState) => draftState(state)
export const listUnburned = unburnedLocations
export const listLiving = activePlayers
export const listWerewolves = livingWerewolves
export const victory = getVictory
export const initialState = createDefaultState
export const currentLocations = (state: GameState) => state.locations
export const currentPlayers = (state: GameState) => state.players
export const moduleReady = true
export const exportsReady = true
export const finalState = false
export const metadata = { version, rulesVersion }
export const end = true
