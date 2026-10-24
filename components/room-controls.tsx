'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gamepad2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Room = { id: string; room_code: string; player_limit: number; werewolf_count: number; phase: string; lobby_open: boolean }

export function RoomControls({ trigger = 'inline' }: { trigger?: 'inline' | 'header' }) {
  const router = useRouter()
  const [mode, setMode] = useState<'closed' | 'join'>('closed')
  const [roomCode, setRoomCode] = useState('')
  const [displayName, setDisplayName] = useState('')
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
    const action = 'join'
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, roomCode: roomCode.trim(), displayName: displayName.trim() }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setMessage(result?.error ?? `ดำเนินการไม่สำเร็จ (HTTP ${response.status})`)
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


  useEffect(() => {
    if (trigger !== 'header') return
    const open = () => { setMessage(''); setMode('join') }
    window.addEventListener('bw-open-join', open)
    return () => window.removeEventListener('bw-open-join', open)
  }, [trigger])

  return <>
    {trigger === 'header' ? <Button className="bw-start-button" onClick={() => setMode('join')}><Gamepad2 className="mr-2 size-4" /> เริ่มเล่น</Button> :
      <div className="room-actions"><Button className="primary-button" onClick={() => window.dispatchEvent(new Event('bw-open-join'))}><Users className="mr-2 size-4" /> เข้าร่วมห้อง</Button>{previousRoom && <Button className="secondary-button" onClick={() => router.push(`/lobby/${previousRoom}`)}>กลับเข้าห้องเดิม ({previousRoom})</Button>}</div>}
    {trigger === 'header' && mode === 'join' && <div className="bw-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setMode('closed') }}>
      <div className="bw-modal-card" role="dialog" aria-modal="true" aria-labelledby="bw-join-title">
        <div className="room-control-header"><div><p className="eyebrow">BURNING WEREWOLF</p><h3 id="bw-join-title">เข้าร่วมห้องเกม</h3></div><button type="button" className="icon-button" onClick={() => { setMode('closed'); setMessage('') }} aria-label="ปิด"><X /></button></div>
        <form onSubmit={submit} className="room-form">
          <label>รหัสห้อง<input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} maxLength={6} placeholder="กรอกรหัสห้อง 6 ตัว" required autoFocus /></label>
          <label>ชื่อผู้เล่น<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} placeholder="ชื่อที่จะแสดงในเกม" required /></label>
          <Button type="submit" className="primary-button" disabled={busy}>{busy ? 'กำลังเข้าร่วม…' : 'ยืนยันเข้าร่วมเกม'}</Button>
          {message && <p role="status" className="text-xs text-[#f1a777]">{message}</p>}
        </form>
      </div>
    </div>}
  </>
}
