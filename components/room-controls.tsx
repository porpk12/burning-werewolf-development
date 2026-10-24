'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Plus, QrCode, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Room = { id: string; room_code: string; player_limit: number; werewolf_count: number; phase: string; lobby_open: boolean }

export function RoomControls() {
  const router = useRouter()
  const [mode, setMode] = useState<'closed' | 'create' | 'join'>('closed')
  const [room, setRoom] = useState<Room | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [previousRoom, setPreviousRoom] = useState('')
  useEffect(() => {
    const code = window.localStorage.getItem('bwf_last_room')
    if (!code || !/^[A-Z0-9]{6}$/.test(code)) return
    fetch(`/api/rooms?code=${encodeURIComponent(code)}`, { cache: 'no-store' }).then(async response => {
      if (response.ok) setPreviousRoom(code)
      else { window.localStorage.removeItem('bwf_last_room'); setPreviousRoom('') }
    }).catch(() => { /* Keep saved room for retry if offline. */ })
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage('')
    const action = mode === 'create' ? 'create' : 'join'
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action === 'create' ? { action, roomName: roomName.trim() } : { action, roomCode: roomCode.trim(), displayName: displayName.trim() }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setMessage(result?.error ?? `ดำเนินการไม่สำเร็จ (HTTP ${response.status})`)
      } else if (action === 'create') {
        setRoom(result.game)
      } else {
        window.localStorage.setItem('bwf_last_room', roomCode.trim().toUpperCase())
        router.push(`/lobby/${roomCode.trim().toUpperCase()}`)
      }
    } catch {
      setMessage('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'closed') return <div className="room-actions">{previousRoom && <Button className="secondary-button" onClick={() => router.push(`/lobby/${previousRoom}`)}>กลับเข้าห้องเดิม ({previousRoom})</Button>}<Button className="primary-button" onClick={() => setMode('create')}><Plus data-icon="inline-start" /> สร้างเกมใหม่</Button><Button className="secondary-button" onClick={() => setMode('join')}><Users data-icon="inline-start" /> เข้าร่วมห้อง</Button></div>

  return <div className="room-control-card">
    <div className="room-control-header"><div><p className="eyebrow">ห้องเกมออนไลน์</p><h3>{mode === 'create' ? 'สร้างห้องใหม่' : 'เข้าร่วมห้อง'}</h3></div><button className="icon-button" onClick={() => { setMode('closed'); setRoom(null); setMessage('') }} aria-label="ปิด"><X /></button></div>
    {room ? <div className="room-created"><p className="text-sm text-[#b7aaa0]">รหัสสำหรับผู้เล่น</p><strong>{room.room_code}</strong><div className="room-created-actions"><Button className="secondary-button" onClick={() => navigator.clipboard?.writeText(room.room_code)}><Copy data-icon="inline-start" /> คัดลอกรหัส</Button><Button className="secondary-button" onClick={() => router.push(`/lobby/${room.room_code}`)}>ไปที่ห้องเกม</Button></div><p className="text-xs text-[#d4a65a]">สร้างห้องสำเร็จ · ไปที่ห้องเกมเพื่อจัดการผู้เล่น</p></div> : <form onSubmit={submit} className="room-form">{mode === 'create' ? <label>ชื่อห้อง<input value={roomName} onChange={(event) => setRoomName(event.target.value)} maxLength={80} placeholder="ตั้งชื่อห้องเกม" required /></label> : <><label>รหัสห้อง<input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={6} placeholder="เช่น A7K2P9" required /></label><label>ชื่อผู้เล่น<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={32} placeholder="ชื่อที่จะแสดงในห้อง" required /></label></>}<Button type="submit" className="primary-button" disabled={busy}>{busy ? 'กำลังดำเนินการ…' : mode === 'create' ? 'สร้างห้อง' : 'เข้าร่วมเกม'}</Button>{message && <p className="text-xs text-[#d4a65a]" role="status">{message}</p>}</form>}
  </div>
}
