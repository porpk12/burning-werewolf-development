'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NightZeroPanel } from '@/components/night-zero-panel'
import { DayVotePanel } from '@/components/day-vote-panel'
import { NightLocationPanel } from '@/components/night-location-panel'
import { SpecialLocationPanel } from '@/components/special-location-panel'
import { NeighborLetterPanel } from '@/components/neighbor-letter-panel'

type Player = { id: string; display_name: string; seat_number: number; status: string }
type LobbyData = { game: { room_code: string; phase: string; round_number: number; voting_closed: boolean; player_limit: number | null; werewolf_count: number; lobby_open: boolean }; burnedCount?: number; latestExileNames?: string[]; players: Player[]; isModerator: boolean; selfId: string | null; ownRole?: 'werewolf' | 'villager' | null; teammates?: string[]; moderatorRoles?: Record<string, string> }

export function LobbyView({ code, moderator = false }: { code: string; moderator?: boolean }) {
  const router = useRouter()
  const [data, setData] = useState<LobbyData | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [kickTarget, setKickTarget] = useState<Player | null>(null)
  const [showOwnRole, setShowOwnRole] = useState(false)
  const [visibleRoles, setVisibleRoles] = useState<Record<string, boolean>>({})
  const [wolfCount, setWolfCount] = useState(1)
  const [settingsChanged, setSettingsChanged] = useState(false)
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/lobby?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) { setError(result.error ?? 'โหลดข้อมูลไม่สำเร็จ'); return }
      setData(result)
      if (!moderator && result.selfId) window.localStorage.setItem('bwf_last_room', code)
      if (!settingsChanged) setWolfCount(result.game.werewolf_count)
      setError('')
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
  }, [code, settingsChanged, moderator])
  useEffect(() => { void refresh(); const interval = setInterval(() => void refresh(), 3000); return () => clearInterval(interval) }, [refresh])
  async function saveSettings() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/lobby', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'settings', code, werewolfCount: wolfCount }) })
      const result = await response.json()
      if (!response.ok) setError(result.error ?? 'บันทึกการตั้งค่าไม่สำเร็จ')
      else { setSettingsChanged(false); await refresh() }
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  async function start() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/lobby', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start', code }) })
      const result = await response.json()
      if (!response.ok) setError(result.error ?? 'เริ่มเกมไม่สำเร็จ')
      else await refresh()
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  async function restart() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/lobby', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'restart', code }) })
      const result = await response.json()
      if (!response.ok) setError(result.error ?? 'เริ่มเกมใหม่ไม่สำเร็จ')
      else { setConfirmRestart(false); await refresh() }
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  async function kickPlayer() {
    if (!kickTarget) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/lobby', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'kick', code, playerId: kickTarget.id }) })
      const result = await response.json()
      if (!response.ok) setError(result.error ?? 'เตะผู้เล่นไม่สำเร็จ')
      else { setKickTarget(null); await refresh() }
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  async function leaveRoom() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'leave', roomCode: code }) })
      const result = await response.json().catch(() => null)
      if (!response.ok) { setError(result?.error ?? 'ออกจากห้องไม่สำเร็จ'); return }
      window.localStorage.removeItem('bwf_last_room')
      router.push('/')
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
    finally { setBusy(false); setConfirmLeave(false) }
  }
  async function navigate(direction: 'back' | 'forward') {
    if (direction === 'back' && !window.confirm('ย้อนกลับไป Phase ก่อนหน้า?\nข้อมูลตั้งแต่ Phase ที่ย้อนกลับไปและหลังจากนั้นจะถูกลบถาวร')) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/phase-navigation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, direction }) })
      const result = await response.json()
      if (!response.ok) setError(result.error ?? 'เปลี่ยน Phase ไม่สำเร็จ')
      else await refresh()
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  const exiled = !moderator && data?.players.some(p => p.id === data.selfId && p.status === 'eliminated')
  return <main className={`min-h-screen px-5 py-10 text-[#f2e4c9] ${exiled ? 'bg-gradient-to-b from-[#080a12] via-[#171320] to-[#090910]' : 'bg-[#170f0d]'}`}><div className="mx-auto max-w-xl rounded-xl border border-[#4b3226] bg-[#211614] p-6">
    <p className="text-xs tracking-widest text-[#d4a65a]">BURNING WEREWOLF</p>
    <h1 className="mt-2 text-3xl font-semibold">{moderator ? 'จัดการห้องเกม' : 'ห้องรอเกม'}</h1>
    <p className="mt-5 text-sm text-[#b7aaa0]">รหัสห้อง</p><div className="mt-1 flex items-center gap-4"><strong className="text-3xl tracking-widest text-[#d4a65a]">{code}</strong><button className="rounded border border-[#6e4e2f] px-3 py-2 text-sm" onClick={() => void navigator.clipboard.writeText(code)}>คัดลอก</button></div>
    {data && data.game.phase !== 'lobby' && <section className="mt-5 rounded-lg border border-[#6e4e2f] bg-[#170f0d] p-4" aria-label="วันและคืนปัจจุบัน">
      <p className="text-xs text-[#b7aaa0]">ความคืบหน้าของเกม</p>
      <p className="mt-1 text-lg font-semibold text-[#d4a65a]">{data.game.phase === 'night_zero' ? '🌙 คืนที่ 0 · คืนเปิดเผยบทบาท' : `วันที่ ${data.game.round_number} · ${data.game.phase === 'night' ? `🌙 คืนที่ ${data.game.round_number}` : `คืนที่ ${Math.max(0, data.game.round_number - 1)} ผ่านไปแล้ว`}`}</p>
      <p className="mt-1 text-sm text-[#b7aaa0]">{data.game.phase === 'night_zero' ? 'คืนที่ 0 ไม่นับรวมในจำนวนคืนสูงสุด' : `จำนวนคืนสูงสุด ${data.game.player_limit && data.game.player_limit >= 11 ? 7 : data.players.length >= 11 ? 7 : 6} คืน · ไม่นับคืนที่ 0`}</p>
    </section>}
    {data && data.game.phase !== 'lobby' && <section className="mt-3 rounded-lg border border-orange-800/60 bg-[#291713] px-4 py-3 text-sm text-orange-200" role="status">🔥 สถานที่ถูกเผาแล้ว <strong>{data.burnedCount ?? 0}</strong> แห่ง จาก <strong>{data.players.length >= 11 ? 6 : 5}</strong> แห่ง</section>}
    {data?.game.phase === 'lobby' && <>
    <div className="mt-6 flex items-center justify-between"><h2 className="text-lg font-semibold">ผู้เล่นในห้อง</h2><span>{data?.players.length ?? '…'} คน</span></div>
    <ul className="mt-3 space-y-2">{data?.players.map(player => <li key={player.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#4b3226] px-3 py-2"><span>{player.seat_number}. {player.display_name} {player.id === data.selfId ? '(คุณ)' : ''}</span>{data.game.phase !== 'lobby' && <span className={player.status === 'eliminated' ? 'text-sm text-red-300' : 'text-sm text-emerald-300'}>{player.status === 'eliminated' ? '☠ ถูกเนรเทศ' : '♥ ยังอยู่ในหมู่บ้าน'}</span>}{moderator && data.isModerator && <button type="button" disabled={busy} onClick={() => setKickTarget(player)} className="rounded border border-red-500/60 px-2 py-1 text-xs text-red-200 disabled:opacity-40">เตะออก</button>}</li>)}</ul>
    </>}
    {moderator && data?.isModerator && data.game.phase !== 'lobby' && <section className="mt-5 rounded-lg border border-[#6e4e2f] p-4">
      <h2 className="font-semibold text-[#d4a65a]">สถานะผู้เล่นในเกม</h2>
      <p className="mt-1 text-xs text-[#b7aaa0]">เฉพาะ Moderator · ดูบทบาทได้ทุก Phase</p>
      <div className="mt-3 space-y-2">{data.players.map(player => <div key={player.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 ${data.moderatorRoles?.[player.id] === 'werewolf' ? 'border-red-500/70 bg-red-950/25' : 'border-[#4b3226]'}`}>
        <div><p className={`font-medium ${data.moderatorRoles?.[player.id] === 'werewolf' ? 'text-red-300' : ''}`}>{data.moderatorRoles?.[player.id] === 'werewolf' ? '🐺 ' : ''}{player.seat_number}. {player.display_name} {moderator && data.isModerator && <button type="button" disabled={busy} onClick={() => setKickTarget(player)} className="ml-2 rounded border border-red-500/60 px-2 py-1 text-xs text-red-200 disabled:opacity-40">เตะออก</button>}</p><p className={player.status === 'eliminated' ? 'text-sm text-red-300' : 'text-sm text-green-300'}>{player.status === 'eliminated' ? '☠ ถูกเนรเทศ' : '♥ ยังอยู่ในหมู่บ้าน'}</p></div>
        <div className="flex items-center gap-3"><span className="text-sm text-[#d4a65a]">{visibleRoles[player.id] ? (data.moderatorRoles?.[player.id] === 'werewolf' ? 'หมาป่า' : data.moderatorRoles?.[player.id] === 'villager' ? 'ชาวบ้าน' : 'ยังไม่มีบทบาท') : '••••••'}</span><button type="button" onClick={() => setVisibleRoles(prev => ({ ...prev, [player.id]: !prev[player.id] }))} className="rounded border border-[#6e4e2f] px-3 py-2 text-sm">{visibleRoles[player.id] ? 'ซ่อนบทบาท' : 'ดูบทบาท'}</button></div>
      </div>)}</div>
    </section>}
    {exiled && <section className="mt-5 rounded-xl border border-[#514258] bg-[#191522] p-6 text-center shadow-[0_0_40px_rgba(65,47,82,0.35)]"><div className="text-5xl">👻</div><h2 className="mt-3 text-2xl font-bold text-[#e2d4ef]">คุณถูกเนรเทศแล้ว</h2><p className="mt-2 text-sm text-[#b9abc9]">คุณอยู่ในหมู่บ้านข้าง ๆ และไม่สามารถโหวตหรือเลือกสถานที่ได้อีก แต่ยังสามารถส่งจดหมายในช่วงกลางคืนได้</p></section>}
    {!moderator && data?.game.phase === 'night' && <section className="mt-5 rounded-lg border border-[#d4a65a] bg-[#24170f] p-4" role="status">
      <h2 className="font-semibold text-[#f0c477]">📣 ผลการเนรเทศหลัง Day {data.game.round_number}</h2>
      <p className="mt-2 text-sm text-[#e9d5bd]">{!data.latestExileNames?.length ? 'ไม่มีใครถูกเนรเทศ' : `ผู้ถูกเนรเทศในวันนี้: ${data.latestExileNames.join(', ')}`}</p>
    </section>}
    {!moderator && data?.game.phase !== 'lobby' && data?.game.phase !== 'night_zero' && <section className="mt-5 rounded-lg border border-[#6e4e2f] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-[#d4a65a]">บทบาทของฉัน</h2><button type="button" onClick={() => setShowOwnRole(value => !value)} className="rounded-md border border-[#d4a65a] px-3 py-2 text-sm text-[#d4a65a]">{showOwnRole ? 'ซ่อนบทบาท' : 'ดูบทบาท'}</button></div>
      {showOwnRole && <div className="mt-3 rounded-md bg-[#170f0d] p-3"><p className="mb-2 text-sm text-[#d4a65a]">ชื่อผู้เล่น: {data?.players.find(p => p.id === data.selfId)?.display_name ?? '-'}</p><p className="font-semibold">{data?.ownRole === 'werewolf' ? '🐺 หมาป่า' : data?.ownRole === 'villager' ? 'ชาวบ้าน' : 'ยังไม่ได้รับบทบาท'}</p><p className="mt-2 text-sm text-[#d4a65a]">เงื่อนไขชัยชนะ: {data?.ownRole === 'werewolf' ? `เผาสถานที่จนเหลือเพียง 3 แห่ง ภายใน ${data.players.length >= 11 ? 7 : 6} คืน (ไม่นับ Night 0)` : data?.ownRole === 'villager' ? `เนรเทศหมาป่าทั้งหมด หรือปกป้องหมู่บ้านให้เหลือสถานที่มากกว่า 3 แห่งจนครบ ${data.players.length >= 11 ? 7 : 6} คืน` : ''}</p>{data?.ownRole === 'werewolf' && <p className="mt-2 text-sm text-[#b7aaa0]">เพื่อนร่วมทีมหมาป่า: {data.teammates?.length ? data.teammates.join(', ') : 'ไม่มี'}</p>}</div>}
      <p className="mt-2 text-xs text-[#b7aaa0]">แสดงบทบาทของคุณเท่านั้น และเปิดดูได้ตลอดเกม</p>
      {data && <div className="mt-5 border-t border-[#4b3226] pt-4">
        <h3 className="font-semibold text-[#d4a65a]">สถานะผู้เล่นในหมู่บ้าน</h3>
        <div className="mt-3 space-y-2">{data.players.map(player => <div key={player.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#4b3226] px-3 py-2 text-sm">
          <span>{player.seat_number}. {player.display_name}{player.id === data.selfId ? ' (คุณ)' : ''}</span>
          <span className={player.status === 'eliminated' ? 'text-red-300' : 'text-emerald-300'}>{player.status === 'eliminated' ? '☠ ถูกเนรเทศ' : '♥ ยังอยู่ในหมู่บ้าน'}</span>
        </div>)}</div>
      </div>}
    </section>}
    {moderator && data?.isModerator && kickTarget && <section className="mt-4 rounded-lg border border-red-500/60 bg-red-950/30 p-4">
      <p className="font-semibold text-red-200">ยืนยันเตะ {kickTarget.display_name} ออกจากห้อง?</p>
      <p className="mt-2 text-sm text-red-100">ผู้เล่นคนนี้จะเข้าห้องด้วยเซสชันเดิมไม่ได้อีก และจะไม่ใช่ผู้ถูกเนรเทศ{data.game.phase !== 'lobby' ? ' · การเตะระหว่างเกมอาจกระทบคะแนนหรือความสมดุลของรอบปัจจุบัน' : ''}</p>
      <div className="mt-3 flex gap-3"><button type="button" disabled={busy} onClick={() => void kickPlayer()} className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">ยืนยันเตะออก</button><button type="button" disabled={busy} onClick={() => setKickTarget(null)} className="rounded border border-[#6e4e2f] px-4 py-2 text-sm">ยกเลิก</button></div>

    </section>}
    {!moderator && data && data.game.phase === 'night_zero' && <section className="mt-5 rounded-xl border border-[#6e4e2f] p-4"><h2 className="font-semibold text-[#d4a65a]">สถานะผู้เล่นในหมู่บ้าน</h2><div className="mt-3 space-y-2">{data.players.map(player => <div key={player.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#4b3226] px-3 py-2 text-sm"><span>{player.seat_number}. {player.display_name}{player.id === data.selfId ? ' (คุณ)' : ''}</span><span className={player.status === 'eliminated' ? 'text-red-300' : 'text-emerald-300'}>{player.status === 'eliminated' ? '☠ ถูกเนรเทศ' : '♥ ยังอยู่ในหมู่บ้าน'}</span></div>)}</div></section>}
    {!data?.players.length && <p className="mt-3 text-sm text-[#988c83]">ยังไม่มีผู้เล่น</p>}
    {data?.game.phase === 'lobby' ? <p className="mt-6 text-sm text-[#d4a65a]">กำลังรอผู้เล่นและ Moderator เริ่มเกม · รายชื่ออัปเดตทุก 3 วินาที</p> : <p className="mt-6 text-sm text-[#d4a65a]">เริ่มเกมแล้ว: {data?.game.phase} · ระบบการเล่นแต่ละเฟสยังอยู่ระหว่างพัฒนา</p>}
    {moderator && data?.isModerator && data.game.phase === 'lobby' && <section className="mt-5 rounded-lg border border-[#6e4e2f] p-4">
      <h2 className="font-semibold text-[#d4a65a]">ตั้งค่าเกมในห้องเดิม</h2>
      <p className="mt-2 text-sm text-[#b7aaa0]">รอผู้เล่นเพิ่มได้โดยไม่ต้องสร้างห้องใหม่ เปลี่ยนจำนวนหมาป่าได้ก่อนเริ่มเกม</p>
      <label htmlFor="lobby-wolf-count" className="mt-3 block text-sm">จำนวนหมาป่า</label>
      <input id="lobby-wolf-count" type="number" min={1} max={1000} step={1} value={wolfCount} disabled={busy} onChange={event => { setWolfCount(Number(event.target.value)); setSettingsChanged(true) }} className="mt-2 w-28 rounded-md border border-[#6e4e2f] bg-[#170f0d] px-3 py-2" />
      <p className="mt-2 text-xs text-[#b7aaa0]">ต้องมีผู้เล่นมากกว่าจำนวนหมาป่าจึงจะเริ่มเกมได้</p>
      <button type="button" disabled={busy || !settingsChanged || !Number.isSafeInteger(wolfCount) || wolfCount < 1 || wolfCount > 1000} onClick={() => void saveSettings()} className="mt-3 rounded-md border border-[#d4a65a] px-4 py-2 font-semibold text-[#d4a65a] disabled:opacity-40">บันทึกการตั้งค่า</button>
      {settingsChanged && <p className="mt-2 text-xs text-amber-300">กรุณาบันทึกจำนวนหมาป่าก่อนเริ่มเกม</p>}
    </section>}
    {moderator && data?.isModerator && data.game.phase === 'lobby' && <button disabled={busy || settingsChanged || data.players.length < 2} onClick={() => void start()} className="mt-5 rounded-md bg-[#d4a65a] px-5 py-3 font-semibold text-[#170f0d] disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'กำลังเริ่ม…' : 'เริ่มเกมด้วยผู้เล่นที่อยู่ในห้อง (Night 0)'}</button>}
    {moderator && data?.isModerator && data.game.phase !== 'lobby' && <div className="mt-5">
      {!confirmRestart ? <button type="button" disabled={busy} onClick={() => setConfirmRestart(true)} className="rounded-md border border-red-500/60 px-5 py-3 font-semibold text-red-200 disabled:opacity-50">เริ่มเกมใหม่ในห้องเดิม</button> :
        <div className="rounded-md border border-red-500/60 bg-red-950/30 p-4">
          <p className="font-semibold text-red-200">ยืนยันเริ่มเกมใหม่ในห้องเดิม?</p>
          <p className="mt-2 text-sm text-red-100">ข้อมูลเกมรอบนี้จะถูกลบถาวร แต่รหัสห้องและผู้เล่นเดิมจะยังอยู่</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => void restart()} className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'กำลังรีเซ็ต…' : 'ยืนยันเริ่มเกมใหม่'}</button>
            <button type="button" disabled={busy} onClick={() => setConfirmRestart(false)} className="rounded-md border border-[#6e4e2f] px-4 py-2 disabled:opacity-50">ยกเลิก</button>
          </div>
        </div>}
    </div>}
    {moderator && data?.isModerator && data.game.phase !== 'lobby' && data.game.phase !== 'day' && <div className="mt-4 flex flex-wrap gap-3">
      <button disabled={busy || (data.game.phase === 'night_zero' && data.game.round_number === 0)} onClick={() => void navigate('back')} className="rounded-md border border-[#6e4e2f] px-4 py-2 disabled:opacity-40">← ย้อนกลับ Phase</button>
      <button disabled={busy || (data.game.phase === 'day' && !data.game.voting_closed) || data.game.phase === 'finished'} onClick={() => void navigate('forward')} className="rounded-md border border-[#6e4e2f] px-4 py-2 disabled:opacity-40">ไปข้างหน้า Phase →</button>
    </div>}
    {data && data.game.phase !== 'lobby' && data.game.phase !== 'night_zero' && <SpecialLocationPanel code={code} moderator={moderator && Boolean(data.isModerator)} />}
    {data && data.game.phase !== 'lobby' && data.game.phase !== 'night_zero' && <NeighborLetterPanel code={code} moderator={moderator && Boolean(data.isModerator)} selfId={data.selfId} eliminated={Boolean(data.players.find(p=>p.id===data.selfId)?.status==='eliminated')} />}
    {!exiled && data?.game.phase === 'night' && <NightLocationPanel code={code} moderator={moderator && Boolean(data?.isModerator)} />}
    {data?.game.phase === 'night_zero' && <NightZeroPanel code={code} moderator={moderator} phase={data.game.phase} />}
    {!exiled && data?.game.phase === 'day' && <DayVotePanel code={code} navigation={moderator && data?.isModerator ? (<div className="mt-4 flex flex-wrap gap-3">
      <button disabled={busy || (data.game.phase === 'night_zero' && data.game.round_number === 0)} onClick={() => void navigate('back')} className="rounded-md border border-[#6e4e2f] px-4 py-2 disabled:opacity-40">← ย้อนกลับ Phase</button>
      <button disabled={busy || (data.game.phase === 'day' && !data.game.voting_closed) || data.game.phase === 'finished'} onClick={() => void navigate('forward')} className="rounded-md border border-[#6e4e2f] px-4 py-2 disabled:opacity-40">ไปข้างหน้า Phase →</button>
    </div>) : null} />}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {!moderator && confirmLeave && <section className="mt-4 rounded-lg border border-red-500/60 bg-red-950/30 p-4"><p className="font-semibold text-red-200">ยืนยันออกจากห้อง?</p><p className="mt-2 text-sm text-red-100">ชื่อของคุณจะว่างให้คนอื่นใช้ได้ และจะกลับเข้ามาด้วยเซสชันเดิมไม่ได้ หากเกมเริ่มแล้วจะเข้าร่วมใหม่ไม่ได้จนกว่า Lobby จะเปิดอีกครั้ง</p><div className="mt-3 flex gap-3"><button disabled={busy} onClick={() => void leaveRoom()} className="rounded bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-40">{busy ? 'กำลังออก…' : 'ยืนยันออกจากห้อง'}</button><button disabled={busy} onClick={() => setConfirmLeave(false)} className="rounded border border-[#6e4e2f] px-4 py-2 text-sm">ยกเลิก</button></div></section>}
    <div className="mt-6 flex flex-wrap gap-4"><button className="text-sm underline" onClick={() => void refresh()}>รีเฟรชรายชื่อ</button><button className="text-sm underline" onClick={() => router.push(moderator ? '/mod' : '/')}>กลับหน้าหลัก (ยังอยู่ในห้อง)</button>{!moderator && data?.selfId && <button disabled={busy} className="text-sm text-red-300 underline disabled:opacity-40" onClick={() => setConfirmLeave(true)}>ออกจากห้อง</button>}</div>
  </div></main>
}
