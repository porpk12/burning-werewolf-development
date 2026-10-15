import { draft, type DraftResult, type GameState, type Player, type Vote } from './types'

export interface VoteResult { trustCounts: Record<string, number>; distrustCounts: Record<string, number>; eligiblePlayerIds: string[]; exiledPlayerId: string | null }

export const validateVotes = (players: Player[], votes: Vote[]) => {
  const submittedVoters = new Set<string>()
  return votes.filter((vote) => {
    const voter = players.find((p) => p.id === vote.voterId)
    const target = players.find((p) => p.id === vote.targetId)
    if (!voter || !target || submittedVoters.has(vote.voterId)) return false
    if (voter.id === target.id) return false
    if (vote.kind === 'trust' && voter.role === 'werewolf' && target.role === 'werewolf') return false
    if (!voter.active || voter.exiled || !target.active || target.exiled) return false
    submittedVoters.add(vote.voterId)
    return true
  })
}
export const calculateVotes = (state: GameState, votes: Vote[]): DraftResult<VoteResult> => { const valid = validateVotes(state.players, votes); const trustCounts: Record<string, number> = {}; const distrustCounts: Record<string, number> = {}; valid.forEach((vote) => { const counts = vote.kind === 'trust' ? trustCounts : distrustCounts; counts[vote.targetId] = (counts[vote.targetId] ?? 0) + 1 }); const maxDistrust = Math.max(0, ...Object.values(distrustCounts)); const eligiblePlayerIds = Object.keys(distrustCounts).filter((id) => distrustCounts[id] === maxDistrust && (trustCounts[id] ?? 0) === 0); return draft({ trustCounts, distrustCounts, eligiblePlayerIds, exiledPlayerId: eligiblePlayerIds.length === 1 ? eligiblePlayerIds[0] : null }) }
export const applyExileDraft = (state: GameState, result: DraftResult<VoteResult>, confirmed: boolean): GameState => { if (!confirmed || !result.value.exiledPlayerId) return state; return { ...structuredClone(state), players: state.players.map((p) => p.id === result.value.exiledPlayerId ? { ...p, active: false, exiled: true } : p) } }
