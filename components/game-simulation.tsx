'use client'

import { useState } from 'react'
import { Flame, ShieldCheck, Users, Vote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createDefaultState, type GameState } from '@/lib/game-engine/types'
import { calculateVotes } from '@/lib/game-engine/voting-engine'
import { resolveLocations } from '@/lib/game-engine/location-engine'
import { resolveBurn } from '@/lib/game-engine/werewolf-engine'
import { describeVictory } from '@/lib/game-engine/victory-engine'

export function GameSimulation() {
  const [state, setState] = useState<GameState>(() => createDefaultState())
  const [message, setMessage] = useState('พร้อมคำนวณผลร่างสำหรับผู้ดูแล')
  const [confirmed, setConfirmed] = useState(false)
  const runVote = () => { const result = calculateVotes(state, state.players.slice(2).map((player, index) => ({ voterId: player.id, targetId: state.players[index % 2].id, kind: index % 2 ? 'distrust' : 'trust' }))); setMessage(result.value.exiledPlayerId ? `ร่างผล: ขับ ${result.value.exiledPlayerId}` : 'ร่างผล: ไม่มีผู้เล่นถูกขับออก'); setConfirmed(false) }
  const runLocations = () => { const result = resolveLocations(state, state.players.slice(0, 5).map((player) => ({ playerId: player.id, locationId: 'tower' }))); setMessage(`ร่างผลสถานที่: เข้าได้ ${result.value.enteredPlayerIds.length} คน · ล้มเหลว ${result.value.failedPlayerIds.length} คน`); setConfirmed(false) }
  const runBurn = () => { const result = resolveBurn(state, [{ werewolfId: 'player-1', locationId: 'library' }, { werewolfId: 'player-2', locationId: 'market' }]); setMessage(`ร่างผลการเผา: ${result.value.reason}`); setConfirmed(false) }
  return <section className="simulation-panel" id="simulation"><div className="panel-header"><div><p className="eyebrow">เครื่องมือผู้ดูแล · Simulation</p><h2>จำลองเกมและตรวจสอบผล</h2><p className="lede">ทุกการคำนวณเป็นผลร่าง ต้องยืนยันก่อนนำไปใช้จริง</p></div><span className="status-pill status-gold">โหมดจำลอง</span></div><div className="simulation-stats"><div><Users /><strong>{state.players.length}</strong><span>ผู้เล่น</span></div><div><Flame /><strong>{state.locations.filter((l) => !l.burned).length}</strong><span>สถานที่ไม่ไหม้</span></div><div><ShieldCheck /><strong>{state.playableNight}/7</strong><span>คืนที่เล่นได้</span></div></div><div className="simulation-actions"><Button className="secondary-button" onClick={runVote}><Vote data-icon="inline-start" /> จำลองการโหวต</Button><Button className="secondary-button" onClick={runLocations}><Users data-icon="inline-start" /> ตรวจความจุสถานที่</Button><Button className="secondary-button" onClick={runBurn}><Flame data-icon="inline-start" /> จำลองการเผา</Button></div><div className="simulation-result"><span className="live-dot" /><span>{message}</span><span className="ml-auto text-xs text-[#83776f]">{describeVictory(state)}</span></div><div className="simulation-footer"><span>{confirmed ? 'ยืนยันผลร่างแล้วในเซสชันนี้' : 'ยังไม่มีผลใดถูกนำไปใช้ถาวร'}</span><Button className="primary-button" onClick={() => setConfirmed(true)}>ยืนยันผลร่าง</Button></div></section>
}
