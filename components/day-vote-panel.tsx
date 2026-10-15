'use client'
import { useCallback, useEffect, useState } from 'react'
type Player = { id: string; display_name: string; seat_number: number }
type VoteData = { isModerator: boolean; round: number; selfId: string | null; players: Player[]; blockedTrustIds: string[]; ownVote: { trust: string | null; distrust: string | null } | null; submittedCount: number; totals?: { id: string; name: string; trust: number; distrust: number }[] }
export function DayVotePanel({ code }: { code: string }) {
  const [data, setData] = useState<VoteData | null>(null)
  const [trust, setTrust] = useState('')
  const [distrust, setDistrust] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/day-vote?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) { setError(j.error ?? 'โหลดข้อมูลไม่สำเร็จ'); return }
      setData(j); setError('')
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
  }, [code])
  useEffect(() => { void refresh(); const id = setInterval(() => void refresh(), 4000); return () => clearInterval(id) }, [refresh])
  useEffect(() => { if (data?.ownVote && !busy) { setTrust(data.ownVote.trust ?? 'NO'); setDistrust(data.ownVote.distrust ?? 'NO') } }, [data?.ownVote?.trust, data?.ownVote?.distrust, busy])
  async function submit() {
    setBusy(true)
    try {
      const r = await fetch('/api/day-vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, trust: trust === 'NO' ? null : trust, distrust: distrust === 'NO' ? null : distrust }) })
      const j = await r.json()
      if (!r.ok) setError(j.error ?? 'ลงคะแนนไม่สำเร็จ')
      else { await refresh(); window.alert('บันทึกคะแนนแล้ว') }
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  const trustChoices = data?.players.filter(p => p.id !== data.selfId && !data.blockedTrustIds?.includes(p.id)) ?? []
  const distrustChoices = data?.players ?? []
  return <section className="mt-6 rounded-lg border border-[#6e4e2f] bg-[#170f0d] p-4">
    <h2 className="text-xl font-semibold text-[#d4a65a]">Day {data?.round ?? 1} — ลงคะแนนลับ</h2>
    {data?.isModerator ? <><p className="mt-3">ส่งคะแนนแล้ว {data.submittedCount} / {data.players.length} คน</p><p className="mt-2 text-sm text-[#b7aaa0]">Moderator เห็นผลรวม ผู้เล่นไม่เห็นคะแนนคนอื่น</p><div className="mt-3 space-y-2">{data.totals?.map(t => <div key={t.id} className="rounded border border-[#4b3226] p-2">{t.name} — เชื่อใจ {t.trust} · ไม่เชื่อใจ {t.distrust}</div>)}</div></> : <>
      <p className="mt-3 text-sm text-[#b7aaa0]">เชื่อใจและไม่เชื่อใจอย่างละ 1 ตัวเลือก หรือเลือก No ได้ · ไม่เชื่อใจตัวเองได้</p>
      <label className="mt-4 block text-sm">เชื่อใจ</label><select value={trust} onChange={e => setTrust(e.target.value)} className="mt-1 w-full rounded bg-[#2b201b] p-3"><option value="">เลือกผู้เล่นหรือ No</option><option value="NO">No — ไม่โหวตใคร</option>{trustChoices.map(p => <option key={p.id} value={p.id}>{p.seat_number}. {p.display_name}</option>)}</select>
      <label className="mt-4 block text-sm">ไม่เชื่อใจ</label><select value={distrust} onChange={e => setDistrust(e.target.value)} className="mt-1 w-full rounded bg-[#2b201b] p-3"><option value="">เลือกผู้เล่นหรือ No</option><option value="NO">No — ไม่โหวตใคร</option>{distrustChoices.map(p => <option key={p.id} value={p.id}>{p.seat_number}. {p.display_name}</option>)}</select>
      <button type="button" disabled={busy || !trust || !distrust || (trust === distrust && trust !== 'NO')} onClick={() => void submit()} className="mt-4 rounded bg-[#d4a65a] px-5 py-3 font-semibold text-[#170f0d] disabled:opacity-50">{busy ? 'กำลังบันทึก…' : data?.ownVote ? 'แก้ไขคะแนน' : 'ยืนยันคะแนน'}</button>
      {data?.ownVote && <p className="mt-2 text-sm text-[#d4a65a]">คุณลงคะแนนแล้ว สามารถเปลี่ยนได้ระหว่าง Day นี้</p>}
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </section>
}
