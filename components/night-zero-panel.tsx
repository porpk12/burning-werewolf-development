'use client'

import { useCallback, useEffect, useState } from 'react'
import { Moon, Shield, X, ChevronRight } from 'lucide-react'

type NightData =
  | { isModerator: true; phase: string; playerCount: number; roleCount: number }
  | { isModerator: false; phase: string; role: 'villager' | 'werewolf'; teammates: string[] }

export function NightZeroPanel({ code, moderator, phase }: { code: string; moderator: boolean; phase: string }) {
  const [data, setData] = useState<NightData | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/night-zero?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) { setError(result.error ?? 'โหลดข้อมูลไม่สำเร็จ'); return }
      setData(result as NightData)
      setError('')
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
  }, [code])
  useEffect(() => {
    void refresh()
    if (!moderator) return
    const timer = setInterval(() => void refresh(), 3000)
    return () => clearInterval(timer)
  }, [refresh, moderator])
  useEffect(() => { setRevealed(false); setDetailsOpen(false) }, [code, phase])
  useEffect(() => {
    if (!detailsOpen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setDetailsOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [detailsOpen])

  async function startDay() {
    if (!window.confirm('ยืนยันเข้าสู่ Day 1? Night 0 จะสิ้นสุดทันที')) return
    setBusy(true)
    try {
      const response = await fetch('/api/night-zero', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'start_day', code }),
      })
      const result = await response.json()
      if (!response.ok) setError(result.error ?? 'เปลี่ยนเฟสไม่สำเร็จ')
      else window.location.reload()
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
    finally { setBusy(false) }
  }

  if (phase === 'day') return null
  const player = data && !data.isModerator ? data : null
  const roleName = player?.role === 'werewolf' ? 'หมาป่า' : 'ชาวบ้าน'
  const isWolf = player?.role === 'werewolf'
  return <section className="mt-4 rounded-2xl bg-[#202523] p-4 text-[#e8e6dc] sm:p-5">
    <div className="flex items-center gap-3 border-b border-[#3d4741] pb-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#343d42] text-[#c1ced7]"><Moon size={20} /></span>
      <div><h2 className="text-base font-semibold">คืนที่ 0</h2><p className="text-xs text-[#aab5ae]">คืนเปิดเผยตัวตน</p></div>
    </div>
    {moderator ? <div className="pt-4">
      <p className="text-sm">แจกบทบาทแล้ว {data?.isModerator ? data.roleCount : '…'} / {data?.isModerator ? data.playerCount : '…'} คน</p>
      <p className="mt-2 text-sm text-[#aab5ae]">ให้ผู้เล่นเปิดดูบทบาทบนอุปกรณ์ของตนเอง จากนั้น Moderator จึงเข้าสู่ Day 1</p>
      <button type="button" disabled={busy || !data?.isModerator || data.roleCount !== data.playerCount || data.playerCount < 2} onClick={() => void startDay()} className="mt-4 rounded-lg bg-[#bda47b] px-5 py-3 font-semibold text-[#202523] disabled:opacity-50">{busy ? 'กำลังเปลี่ยนเฟส…' : 'เข้าสู่ Day 1'}</button>
    </div> : <div className="pt-4">
      {!revealed ? <button type="button" disabled={!player} onClick={() => setRevealed(true)} className="w-full rounded-xl bg-[#303b36] px-5 py-5 text-center font-semibold text-[#e8e6dc] transition hover:bg-[#3b4a43] disabled:opacity-50">เปิดการ์ดบทบาท</button> : player ? <div className="rounded-xl bg-[#303b36] p-4">
        <div className="flex items-center justify-between"><p className="text-xs text-[#b6c2b8]">บทบาทของคุณ</p><Shield size={18} className="text-[#d3c09b]" /></div>
        <p className="mt-2 text-2xl font-bold">{roleName}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => setRevealed(false)} className="rounded-lg border border-[#56645b] px-3 py-2 text-sm text-[#d8dfd9] hover:bg-[#435149]">ซ่อนบทบาท</button>
          <button type="button" onClick={() => setDetailsOpen(true)} className="inline-flex items-center gap-1 rounded-lg bg-[#45534a] px-4 py-2 text-sm font-semibold hover:bg-[#526358]">อ่านเพิ่มเติม <ChevronRight size={16} /></button>
        </div>
      </div> : null}
    </div>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {detailsOpen && player && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setDetailsOpen(false) }}>
      <div role="dialog" aria-modal="true" aria-labelledby="night-zero-role-details" className="w-full max-w-md rounded-2xl border border-[#46534b] bg-[#202523] p-5 text-[#e8e6dc] shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#aab5ae]">รายละเอียดบทบาท</p><h3 id="night-zero-role-details" className="mt-1 text-xl font-bold">{roleName}</h3></div><button type="button" aria-label="ปิดรายละเอียด" onClick={() => setDetailsOpen(false)} className="rounded-lg p-2 text-[#b6c2b8] hover:bg-[#303b36]"><X size={20} /></button></div>
        <div className="mt-4 space-y-3 border-t border-[#3d4741] pt-4 text-sm leading-7 text-[#d2d9d2]">
          <p>{isWolf ? 'คุณแฝงตัวอยู่ในหมู่บ้าน และสามารถเผาสถานที่ที่เข้าไปได้สำเร็จ' : 'คุณไม่มีพลังพิเศษ แต่ใช้การลงคะแนนและความสามารถของสถานที่เพื่อปกป้องหมู่บ้านได้'}</p>
          <div><p className="font-semibold text-[#e8e6dc]">เงื่อนไขชัยชนะ</p><p>{isWolf ? 'เผาสถานที่จนเหลือตามเกณฑ์ที่กำหนด หรือเผาสถานที่พิเศษหลังเปิดเผยในวันที่ 5' : 'เนรเทศหมาป่าทั้งหมด หรือรักษาสถานที่ให้เหลือมากกว่าเกณฑ์ที่กำหนดจนจบคืนสุดท้าย'}</p></div>
          {isWolf && <p>เพื่อนหมาป่า: {player.teammates.length ? player.teammates.join(', ') : 'ไม่มี (คุณเป็นหมาป่าเพียงตัวเดียว)'}</p>}
        </div>
        <button type="button" onClick={() => setDetailsOpen(false)} className="mt-5 w-full rounded-lg bg-[#45534a] px-4 py-3 font-semibold hover:bg-[#526358]">ปิดรายละเอียด</button>
      </div>
    </div>}
  </section>
}
