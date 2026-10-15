'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Player = { id: string; display_name: string; seat_number: number; status: string }
type LobbyData = { game: { room_code: string; phase: string; player_limit: number; lobby_open: boolean }; players: Player[]; isModerator: boolean; selfId: string | null }

export function LobbyView({ code, moderator = false }: { code: string; moderator?: boolean }) {
  const router = useRouter()
  const [data, setData] = useState<LobbyData | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/lobby?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) { setError(result.error ?? 'โหลดข้อมูลไม่สำเร็จ'); return }
      setData(result)
      setError('')
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
  }, [code])
  useEffect(() => { void refresh(); const interval = setInterval(() => void refresh(), 3000); return () => clearInterval(interval) }, [refresh])
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
  return <main className="min-h-screen bg-[#170f0d] px-5 py-10 text-[#f2e4c9]"><div className="mx-auto max-w-xl rounded-xl border border-[#4b3226] bg-[#211614] p-6">
    <p className="text-xs tracking-widest text-[#d4a65a]">BURNING WEREWOLF</p>
    <h1 className="mt-2 text-3xl font-semibold">{moderator ? 'จัดการห้องเกม' : 'ห้องรอเกม'}</h1>
    <p className="mt-5 text-sm text-[#b7aaa0]">รหัสห้อง</p><div className="mt-1 flex items-center gap-4"><strong className="text-3xl tracking-widest text-[#d4a65a]">{code}</strong><button className="rounded border border-[#6e4e2f] px-3 py-2 text-sm" onClick={() => void navigator.clipboard.writeText(code)}>คัดลอก</button></div>
    <div className="mt-6 flex items-center justify-between"><h2 className="text-lg font-semibold">ผู้เล่นในห้อง</h2><span>{data?.players.length ?? '…'} คน</span></div>
    <ul className="mt-3 space-y-2">{data?.players.map(player => <li key={player.id} className="rounded-md border border-[#4b3226] px-3 py-2">{player.seat_number}. {player.display_name} {player.id === data.selfId ? '(คุณ)' : ''}</li>)}</ul>
    {!data?.players.length && <p className="mt-3 text-sm text-[#988c83]">ยังไม่มีผู้เล่น</p>}
    {data?.game.phase === 'lobby' ? <p className="mt-6 text-sm text-[#d4a65a]">กำลังรอผู้เล่นและ Moderator เริ่มเกม · รายชื่ออัปเดตทุก 3 วินาที</p> : <p className="mt-6 text-sm text-[#d4a65a]">เริ่มเกมแล้ว: {data?.game.phase} · ระบบการเล่นแต่ละเฟสยังอยู่ระหว่างพัฒนา</p>}
    {moderator && data?.isModerator && data.game.phase === 'lobby' && <button disabled={busy || data.players.length < 2} onClick={() => void start()} className="mt-5 rounded-md bg-[#d4a65a] px-5 py-3 font-semibold text-[#170f0d] disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'กำลังเริ่ม…' : 'เริ่มเกมด้วยผู้เล่นที่อยู่ในห้อง (Night 0)'}</button>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    <div className="mt-6 flex gap-4"><button className="text-sm underline" onClick={() => void refresh()}>รีเฟรชรายชื่อ</button><button className="text-sm underline" onClick={() => router.push(moderator ? '/mod' : '/')}>กลับหน้าหลัก</button></div>
  </div></main>
}
