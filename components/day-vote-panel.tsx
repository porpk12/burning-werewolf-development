'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
type Player = { id: string; display_name: string; seat_number: number; status: string }
type VoteData = { votingClosed: boolean; noTotals?: { trust: number; distrust: number }; details?: { voterId: string; voterName: string; trust: string | null; distrust: string | null }[]; isModerator: boolean; round: number; selfId: string | null; players: Player[]; blockedTrustIds: string[]; ownVote: { trust: string | null; distrust: string | null } | null; submittedCount: number; marketBonus?: {target:string|null;used:boolean}|null; marketBonuses?: {player_id:string;target_player_id:string|null;used:boolean}[]; exileResult?: { playerId: string | null; playerName: string | null; reason: string }; totals?: { id: string; name: string; trust: number; distrust: number; shielded?: boolean }[] }
export function DayVotePanel({ code, navigation }: { code: string; navigation?: ReactNode }) {
  const [data, setData] = useState<VoteData | null>(null)
  const [trust, setTrust] = useState('')
  const [distrust, setDistrust] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [detailTab, setDetailTab] = useState<'individual' | 'totals'>('individual')
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
    if ((trust !== 'NO' && !trustChoices.some(p => p.id === trust)) || (distrust !== 'NO' && !distrustChoices.some(p => p.id === distrust))) { setError('ตัวเลือกไม่ถูกต้อง กรุณาเลือกใหม่'); return }
    setBusy(true)
    try {
      const r = await fetch('/api/day-vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, trust: trust === 'NO' ? null : trust, distrust: distrust === 'NO' ? null : distrust }) })
      const j = await r.json()
      if (!r.ok) setError(j.error ?? 'ลงคะแนนไม่สำเร็จ')
      else { await refresh(); window.alert('บันทึกคะแนนแล้ว') }
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  async function submitMarket(target:string){
    setBusy(true);setError('')
    try{const r=await fetch('/api/day-vote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,action:'market',target})});const j=await r.json();if(!r.ok)throw new Error(j.error??'บันทึกไม่ได้');await refresh()}catch(e){setError(e instanceof Error?e.message:'บันทึกไม่ได้')}finally{setBusy(false)}
  }
  async function closeVote() {
    if (!window.confirm('ยืนยันปิดลงคะแนน? ผู้เล่นจะไม่สามารถแก้คะแนนได้อีก')) return
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/day-vote', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) })
      const j = await r.json()
      if (!r.ok) setError(j.error ?? 'ปิดลงคะแนนไม่สำเร็จ')
      else await refresh()
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  const displayName = (id: string | null) => id === null ? 'ไม่มี' : data?.players.find(p => p.id === id)?.display_name ?? 'ไม่ทราบชื่อ'
  const trustChoices = data?.players.filter(p => p.status === 'connected' && p.id !== data.selfId && !data.blockedTrustIds?.includes(p.id)) ?? []
  const distrustChoices = data?.players.filter(p => p.status === 'connected') ?? []
  useEffect(() => {
    if (!data || data.isModerator) return
    if (trust && trust !== 'NO' && !data.players.some(p => p.id === trust && p.status === 'connected' && p.id !== data.selfId && !data.blockedTrustIds.includes(p.id))) setTrust('')
    if (distrust && distrust !== 'NO' && !data.players.some(p => p.id === distrust && p.status === 'connected')) setDistrust('')
  }, [data, trust, distrust])
  // Summarize only real players; the "ไม่มี" abstention is not a player.
  const voteTotals = data?.totals ?? []
  const maxTrust = voteTotals.length ? Math.max(...voteTotals.map(p => p.trust)) : 0
  const mostTrusted = voteTotals.filter(p => p.trust === maxTrust).map(p => p.name).join(', ')
  const maxDistrust = voteTotals.length ? Math.max(...voteTotals.map(p => p.distrust)) : 0
  const mostDistrusted = voteTotals.filter(p => p.distrust === maxDistrust).map(p => p.name).join(', ')
  const topDistrusted = voteTotals.filter(p => p.distrust === maxDistrust)
  const playerOrder = new Map((data?.players ?? []).map((p, i) => [p.id, p.seat_number ?? i]))
  const orderedDetails = [...(data?.details ?? [])].sort((a, b) => (playerOrder.get(a.voterId) ?? Infinity) - (playerOrder.get(b.voterId) ?? Infinity))
  const orderedTotals = [...voteTotals].sort((a, b) => (playerOrder.get(a.id) ?? Infinity) - (playerOrder.get(b.id) ?? Infinity))
  // Day 1 is safe; on later days all tied top-distrust players with zero trust are exiled.
  const exiledNames = data?.round === 1 || maxDistrust === 0
    ? [] : topDistrusted.filter(p => p.trust === 0 && !p.shielded).map(p => p.name)
  const exileExplanation = data?.round === 1
    ? 'วันนี้เป็นวันแรกของเกม จึงไม่มีการเนรเทศ'
    : maxDistrust === 0
      ? 'ไม่มีใครได้รับคะแนนไม่เชื่อใจ'
      : exiledNames.length ? '' : topDistrusted.map(p => p.trust > 0
          ? `${p.name} โดนลงคะแนนไม่เชื่อใจมากที่สุด แต่ยังมีคนเชื่อใจ`
          : p.shielded ? `${p.name} ได้รับการคุ้มครองจากโบสถ์ จึงไม่ถูกเนรเทศ` : '').filter(Boolean).join(' · ')
  return <section className="mt-6 rounded-lg border border-[#6e4e2f] bg-[#170f0d] p-4">
    <h2 className="text-xl font-semibold text-[#d4a65a]">Day {data?.round ?? 1} — ลงคะแนนลับ</h2>
    {data?.isModerator ? <>
      <p className="mt-3">ส่งคะแนนแล้ว {data.submittedCount} / {data.players.length} คน</p>
      <p className="mt-2 text-sm text-[#b7aaa0]">สถานะ: {data.votingClosed ? 'ปิดลงคะแนนแล้ว' : 'เปิดลงคะแนนอยู่'} · เฉพาะ Moderator เห็นผล</p>
      {!data.votingClosed && <button type="button" disabled={busy} onClick={() => void closeVote()} className="mt-3 rounded bg-[#d4a65a] px-5 py-3 font-semibold text-[#170f0d] disabled:opacity-50">{busy ? 'กำลังปิด…' : 'ปิดลงคะแนน'}</button>}
      {navigation}
      {data.marketBonuses?.length ? <p className="mt-3 text-sm text-[#d4a65a]">🛒 คะแนนตลาด (เฉพาะ Mod): {data.marketBonuses.map(b=>`${displayName(b.player_id)} → ${b.used?displayName(b.target_player_id):'ยังไม่ใช้'}`).join(' · ')}</p>:null}
      {data.votingClosed && <div className="mt-4 rounded border border-[#d4a65a] p-3" role="status">
        <h3 className="font-semibold text-[#d4a65a]">สรุปผลการลงคะแนน — Day {data.round}</h3>
        <p className="mt-3">ไม่เชื่อใจมากที่สุด: <strong>{maxDistrust > 0 ? mostDistrusted : 'ไม่มี'} ({maxDistrust} คะแนน)</strong></p>
        <p className="mt-2">เชื่อใจมากที่สุด: <strong>{maxTrust > 0 ? mostTrusted : 'ไม่มี'} ({maxTrust} คะแนน)</strong></p>
        <p className="mt-3 font-bold text-[#f0c477]">{exiledNames.length ? `☠ ถูกเนรเทศ: ${exiledNames.join(', ')}` : 'ไม่มีใครถูกเนรเทศ'}</p>
        {!exiledNames.length && <p className="mt-1 text-sm text-[#b7aaa0]">{exileExplanation}</p>}
        <button type="button" aria-expanded={showDetails} onClick={() => setShowDetails(value => !value)} className="mt-4 flex w-full items-center justify-between rounded border border-[#6e4e2f] px-3 py-3 text-left font-semibold">
          <span>รายละเอียดการลงคะแนน (เฉพาะ Moderator)</span><span aria-hidden="true">{showDetails ? '▲' : '▼'}</span>
        </button>
        {showDetails && <div className="mt-3">
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="ประเภทรายละเอียดการลงคะแนน">
            <button type="button" role="tab" aria-selected={detailTab === 'individual'} onClick={() => setDetailTab('individual')} className={`rounded border px-2 py-3 text-sm ${detailTab === 'individual' ? 'border-[#d4a65a] bg-[#392719] text-[#f0c477]' : 'border-[#6e4e2f] text-[#b7aaa0]'}`}>รายละเอียดรายบุคคล</button>
            <button type="button" role="tab" aria-selected={detailTab === 'totals'} onClick={() => setDetailTab('totals')} className={`rounded border px-2 py-3 text-sm ${detailTab === 'totals' ? 'border-[#d4a65a] bg-[#392719] text-[#f0c477]' : 'border-[#6e4e2f] text-[#b7aaa0]'}`}>ผลรวมรายบุคคล</button>
          </div>
          {detailTab === 'individual' ? <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-[#6e4e2f] text-[#d4a65a]"><th className="p-2">ผู้เล่น</th><th className="p-2">ไม่เชื่อใจ</th><th className="p-2">เชื่อใจ</th></tr></thead>
              <tbody>{orderedDetails.map(d => <tr key={d.voterId} className="border-b border-[#4b3226]"><td className="p-2">{d.voterName}</td><td className="p-2">{displayName(d.distrust)}</td><td className="p-2">{displayName(d.trust)}</td></tr>)}</tbody>
            </table>
            {!data.details?.length && <p className="mt-2 text-sm text-[#b7aaa0]">ไม่มีข้อมูลการลงคะแนน</p>}
          </div> : <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-[#6e4e2f] text-[#d4a65a]"><th className="p-2">ผู้เล่น</th><th className="p-2">ไม่เชื่อใจ</th><th className="p-2">เชื่อใจ</th></tr></thead>
              <tbody>{orderedTotals.map(t => <tr key={t.id} className="border-b border-[#4b3226]"><td className="p-2">{t.name}</td><td className="p-2">{t.distrust}</td><td className="p-2">{t.trust}</td></tr>)}</tbody>
            </table>
            {!data.totals?.length && <p className="mt-2 text-sm text-[#b7aaa0]">ไม่มีข้อมูลคะแนน</p>}
          </div>}
        </div>}
      </div>}
    </> : data?.votingClosed ? <p className="mt-4 text-[#d4a65a]">ปิดลงคะแนนแล้ว · ผลคะแนนแสดงเฉพาะ Moderator</p> : <>
      <p className="mt-3 text-sm text-[#b7aaa0]">เชื่อใจและไม่เชื่อใจอย่างละ 1 ตัวเลือก หรือเลือกไม่มีได้ · ไม่เชื่อใจตัวเองได้</p>
      <label className="mt-4 block text-sm">ไม่เชื่อใจ</label><select value={distrust} onChange={e => setDistrust(e.target.value)} className="mt-1 w-full rounded bg-[#2b201b] p-3"><option value="">เลือกผู้เล่นหรือไม่มี</option><option value="NO">ไม่มี</option>{distrustChoices.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
      <label className="mt-4 block text-sm">เชื่อใจ</label><select value={trust} onChange={e => setTrust(e.target.value)} className="mt-1 w-full rounded bg-[#2b201b] p-3"><option value="">เลือกผู้เล่นหรือไม่มี</option><option value="NO">ไม่มี</option>{trustChoices.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select>
      <button type="button" disabled={busy || !trust || !distrust} onClick={() => void submit()} className="mt-4 rounded bg-[#d4a65a] px-5 py-3 font-semibold text-[#170f0d] disabled:opacity-50">{busy ? 'กำลังบันทึก…' : data?.ownVote ? 'แก้ไขคะแนน' : 'ยืนยันคะแนน'}</button>
      {data?.marketBonus && <div className="mt-4 rounded border border-[#d4a65a] p-3"><p className="font-semibold">🛒 สิทธิ์ตลาด: ไม่เชื่อใจเพิ่มอีก 1 เสียง</p><p className="mt-1 text-xs text-[#b7aaa0]">เลือกคนเดิมซ้ำหรือคนอื่นก็ได้ · ข้อมูลนี้เป็นความลับ</p><select disabled={busy} defaultValue={data.marketBonus.target??''} key={data.marketBonus.target??'unset'} onChange={e=>{if(e.target.value)void submitMarket(e.target.value)}} className="mt-2 w-full rounded bg-[#2b201b] p-3"><option value="">-- เลือกผู้รับคะแนนพิเศษ --</option>{distrustChoices.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></div>}
      {data?.ownVote && <p className="mt-2 text-sm text-[#d4a65a]">คุณลงคะแนนแล้ว สามารถเปลี่ยนได้ระหว่าง Day นี้</p>}
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </section>
}
