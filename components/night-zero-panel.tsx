'use client'

import { useCallback, useEffect, useState } from 'react'

type NightData =
  | { isModerator: true; phase: string; playerCount: number; roleCount: number }
  | { isModerator: false; phase: string; role: 'villager' | 'werewolf'; teammates: string[] }

export function NightZeroPanel({ code, moderator, phase }: { code: string; moderator: boolean; phase: string }) {
  const [data, setData] = useState<NightData | null>(null)
  const [revealed, setRevealed] = useState(false)
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

  if (phase === 'day') return <section className="mt-6 rounded-lg border border-[#6e4e2f] p-4"><h2 className="text-xl font-semibold">Day 1</h2><p className="mt-2 text-sm text-[#b7aaa0]">เข้าสู่ Day 1 แล้ว · ระบบโหวตจะพัฒนาในขั้นถัดไป</p></section>
  return <section className="mt-6 rounded-lg border border-[#6e4e2f] bg-[#170f0d] p-4">
    <h2 className="text-xl font-semibold text-[#d4a65a]">Night 0 — คืนเปิดเผยตัวตน</h2>
    {moderator ? <>
      <p className="mt-3 text-sm">แจกบทบาทแล้ว {data?.isModerator ? data.roleCount : '…'} / {data?.isModerator ? data.playerCount : '…'} คน</p>
      <p className="mt-2 text-sm text-[#b7aaa0]">ให้ผู้เล่นแต่ละคนกดเปิดดูบทบาทบนอุปกรณ์ของตัวเอง จากนั้น Moderator จึงเข้าสู่ Day 1</p>
      <button type="button" disabled={busy || !data?.isModerator || data.roleCount !== data.playerCount || data.playerCount < 2} onClick={() => void startDay()} className="mt-4 rounded-md bg-[#d4a65a] px-5 py-3 font-semibold text-[#170f0d] disabled:opacity-50">{busy ? 'กำลังเปลี่ยนเฟส…' : 'เข้าสู่ Day 1'}</button>
    </> : <>
      {!revealed ? <button type="button" disabled={!data || data.isModerator} onClick={() => setRevealed(true)} className="mt-4 rounded-md bg-[#d4a65a] px-5 py-3 font-semibold text-[#170f0d] disabled:opacity-50">เปิดดูบทบาทลับ</button> :
        data && !data.isModerator ? <div className="mt-4 rounded-lg border border-[#6e4e2f] p-4">
          <p className="text-sm text-[#b7aaa0]">บทบาทของคุณ</p>
          <p className="mt-2 text-2xl font-bold text-[#d4a65a]">{data.role === 'werewolf' ? 'มนุษย์หมาป่า' : 'ชาวบ้าน'}</p>
          <p className="mt-3 text-sm text-[#d4a65a]">{data.role === 'werewolf' ? 'เงื่อนไขชัยชนะ: เผาสถานที่จนถึงเกณฑ์ของจำนวนผู้เล่น (5–7 คน: เหลือ 2 แห่งใน 5 คืน / 8–10 คน: เหลือ 3 แห่งใน 6 คืน / 11–14 คน: เหลือ 3 แห่งใน 7 คืน โดยไม่นับ Night 0)' : 'เงื่อนไขชัยชนะ: เนรเทศหมาป่าทั้งหมด หรือปกป้องหมู่บ้านให้เหลือสถานที่มากกว่าเกณฑ์จนจบคืนสุดท้าย (5–7 คน: มากกว่า 2 แห่งใน 5 คืน / 8–10 คน: มากกว่า 3 แห่งใน 6 คืน / 11–14 คน: มากกว่า 3 แห่งใน 7 คืน)'}</p>{data.role === 'werewolf' && <p className="mt-3 text-sm">{data.teammates.length ? `เพื่อนหมาป่า: ${data.teammates.join(', ')}` : 'คุณเป็นหมาป่าเพียงตัวเดียวในห้อง'}</p>}
          <button type="button" onClick={() => setRevealed(false)} className="mt-4 rounded border border-[#6e4e2f] px-4 py-2 text-sm">ซ่อนบทบาท</button>
        </div> : null}
    </>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
  </section>
}
