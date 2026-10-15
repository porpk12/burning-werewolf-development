'use client'

import { FormEvent, useState } from 'react'
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
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

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
        body: JSON.stringify(action === 'create' ? { action } : { action, roomCode: roomCode.trim(), displayName: displayName.trim() }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setMessage(result?.error ?? `ดำเนินการไม่สำเร็จ (HTTP ${response.status})`)
      } else if (action === 'create') {
        setRoom(result.game)
      } else {
        router.push(`/lobby/${roomCode.trim().toUpperCase()}`)
      }
    } catch {
      setMessage('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'closed') return <div className="room-actions"><Button className="primary-button" onClick={() => setMode('create')}><Plus data-icon="inline-start" /> สร้างเกมใหม่</Button><Button className="secondary-button" onClick={() => setMode('join')}><Users data-icon="inline-start" /> เข้าร่วมห้อง</Button></div>

  return <div className="room-control-card">
    <div className="room-control-header"><div><p className="eyebrow">ห้องเกมออนไลน์</p><h3>{mode === 'create' ? 'สร้างห้องใหม่' : 'เข้าร่วมห้อง'}</h3></div><button className="icon-button" onClick={() => { setMode('closed'); setRoom(null); setMessage('') }} aria-label="ปิด"><X /></button></div>
    {room ? <div className="room-created"><p className="text-sm text-[#b7aaa0]">รหัสสำหรับผู้เล่น</p><strong>{room.room_code}</strong><div className="room-created-actions"><Button className="secondary-button" onClick={() => navigator.clipboard?.writeText(room.room_code)}><Copy data-icon="inline-start" /> คัดลอกรหัส</Button><Button className="secondary-button" onClick={() => setMessage('QR พร้อมสร้างเมื่อเปิดใช้งานห้อง')}><QrCode data-icon="inline-start" /> QR Code</Button></div><p className="text-xs text-[#d4a65a]">รอผู้เล่นเข้าร่วม · 0 / {room.player_limit} คน</p></div> : <form onSubmit={submit} className="room-form">{mode === 'create' ? <p className="text-sm text-[#b7aaa0]">กฎคืนเพลิง · v2.4 · 12 คน · มนุษย์หมาป่า 2 ตัว</p> : <><label>รหัสห้อง<input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={6} placeholder="เช่น A7K2P9" required /></label><label>ชื่อผู้เล่น<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={32} placeholder="ชื่อที่จะแสดงในห้อง" required /></label></>}<Button type="submit" className="primary-button" disabled={busy}>{busy ? 'กำลังดำเนินการ…' : mode === 'create' ? 'สร้างห้อง' : 'เข้าร่วมเกม'}</Button>{message && <p className="text-xs text-[#d4a65a]" role="status">{message}</p>}</form>}
  </div>
}
