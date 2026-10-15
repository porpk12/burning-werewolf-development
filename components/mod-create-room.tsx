'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type CreatedGame = { id: string; room_code: string }

export function ModCreateRoom() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [werewolfCount, setWerewolfCount] = useState(1)
  const [error, setError] = useState('')
  const [game, setGame] = useState<CreatedGame | null>(null)

  async function createRoom() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'create', werewolfCount }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.game?.room_code) {
        setError(result?.error ?? `สร้างห้องไม่สำเร็จ (HTTP ${response.status})`)
        return
      }
      setGame(result.game)
      router.refresh()
      router.push(`/mod/room/${result.game.room_code}`)
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setBusy(false)
    }
  }

  async function copyCode() {
    if (!game) return
    try {
      await navigator.clipboard.writeText(game.room_code)
    } catch {
      setError('คัดลอกอัตโนมัติไม่สำเร็จ กรุณาคัดลอกรหัสด้วยตนเอง')
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-[#4b3226] bg-[#211614] p-6">
      <h2 className="font-display text-xl">สร้างห้องเกม</h2>
      <p className="mt-2 text-sm text-[#b7aaa0]">ห้องรองรับผู้เล่นสูงสุด 12 คน และเริ่มได้โดยไม่ต้องรอให้ครบ</p>
      <label htmlFor="werewolf-count" className="mt-4 block text-sm text-[#f2e4c9]">จำนวนหมาป่า</label>
      <select id="werewolf-count" value={werewolfCount} onChange={(event) => setWerewolfCount(Number(event.target.value))} disabled={busy} className="mt-2 block w-full max-w-xs rounded-md border border-[#6e4e2f] bg-[#170f0d] px-3 py-2 text-[#f2e4c9]">
        {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} คน</option>)}
      </select>
      <p className="mt-2 text-xs text-[#b7aaa0]">เมื่อเริ่มเกม จำนวนผู้เล่นจริงต้องมากกว่าจำนวนหมาป่า</p>
      <button type="button" onClick={createRoom} disabled={busy} className="mt-4 rounded-md bg-[#d4a65a] px-5 py-3 font-semibold text-[#170f0d] disabled:opacity-50">
        {busy ? 'กำลังสร้างห้อง…' : 'สร้างห้องเกมใหม่'}
      </button>
      {game && (
        <div className="mt-5 rounded-lg border border-[#6e4e2f] p-4" role="status">
          <p className="text-sm">สร้างห้องสำเร็จ! รหัสห้องคือ</p>
          <p className="mt-2 text-3xl font-bold tracking-widest text-[#d4a65a]">{game.room_code}</p>
          <button type="button" onClick={copyCode} className="mt-3 rounded-md border border-[#6e4e2f] px-4 py-2 text-sm">คัดลอกรหัสห้อง</button>
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    </section>
  )
}
