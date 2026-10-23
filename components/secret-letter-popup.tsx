'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Letter = { key: string; title: string; subtitle: string; body: string }
type NightResponse = { myMessage?: string | null; mine?: { location: string } | null; locations?: { id: string; name: string }[] }
type NeighborResponse = { letters?: { id: string; status: string; reviewed_body?: string | null; delivered_round?: number }[] }

// The API already restricts these responses to the current authenticated player.
// Never request or display moderator-only message collections here.
export function SecretLetterPopup({ code, playerId, round, phase }: { code: string; playerId: string; round: number; phase: string }) {
  const [queue, setQueue] = useState<Letter[]>([])
  const [opened, setOpened] = useState(false)
  const [history, setHistory] = useState<Letter[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const busy = useRef(false)
  const prefix = `bw_letters_v1:${code}:${playerId}:`

  const markSeen = useCallback((key: string) => {
    try { window.localStorage.setItem(prefix + key, '1') } catch { /* private browsing */ }
  }, [prefix])

  const check = useCallback(async () => {
    if (busy.current || phase === 'lobby' || phase === 'night_zero') return
    busy.current = true
    try {
      const [night, neighbor] = await Promise.all([
        fetch(`/api/night-locations?code=${encodeURIComponent(code)}`, { cache: 'no-store' }),
        fetch(`/api/neighbor-letters?code=${encodeURIComponent(code)}`, { cache: 'no-store' }),
      ])
      const items: Letter[] = []
      if (night.ok && phase === 'night') {
        const data = await night.json() as NightResponse
        if (data.myMessage && data.mine?.location && data.mine.location !== 'home') {
          const name = data.locations?.find(x => x.id === data.mine?.location)?.name ?? 'สถานที่'
          // One result per player/location/night. Edits to a published message do not cause duplicate popups.
          items.push({ key: `place:${round}:${data.mine.location}`, title: `ข่าวจาก${name}`, subtitle: `ข้อมูลสถานที่ · คืนที่ ${round}`, body: data.myMessage })
        }
      }
      if (neighbor.ok) {
        const data = await neighbor.json() as NeighborResponse
        for (const letter of data.letters ?? []) {
          if (letter.status === 'delivered' && letter.reviewed_body) {
            items.push({ key: `neighbor:${letter.id}`, title: 'จดหมายปริศนา', subtitle: `จากหมู่บ้านข้างเคียง · คืนที่ ${letter.delivered_round ?? round}`, body: letter.reviewed_body })
          }
        }
      }
      setHistory(old => {
        const map = new Map(old.map(item => [item.key, item]))
        for (const item of items) map.set(item.key, item)
        return Array.from(map.values())
      })
      const unread = items.filter(item => {
        try { return window.localStorage.getItem(prefix + item.key) !== '1' } catch { return true }
      })
      setQueue(old => {
        const map = new Map(old.map(item => [item.key, item]))
        for (const item of unread) map.set(item.key, item)
        return Array.from(map.values())
      })
    } catch { /* Retry next poll when connection returns */ }
    finally { busy.current = false }
  }, [code, phase, prefix, round])

  useEffect(() => { void check(); const timer = window.setInterval(() => void check(), 3000); return () => window.clearInterval(timer) }, [check])
  useEffect(() => { setQueue([]); setHistory([]); setOpened(false); setHistoryOpen(false) }, [code, playerId])

  const active = queue[0]
  function dismiss() {
    if (!active) return
    markSeen(active.key)
    setQueue(current => current.slice(1))
    setOpened(false)
  }

  return <>
    {history.length > 0 && <button type="button" onClick={() => setHistoryOpen(true)} className="mt-3 w-full rounded-lg border border-[#8c6642] bg-[#322016] px-3 py-2 text-sm text-amber-200">✉️ เปิดอ่านจดหมายย้อนหลัง ({history.length})</button>}
    {historyOpen && <div role="dialog" aria-modal="true" aria-label="จดหมายย้อนหลัง" className="fixed inset-0 z-[105] flex items-center justify-center bg-black/85 p-4"><div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-xl border border-amber-800 bg-[#211714] p-5"><h2 className="text-xl font-semibold text-amber-200">✉️ จดหมายที่ได้รับ</h2>{history.map(item => <details key={item.key} className="mt-3 rounded border border-amber-900 p-3"><summary className="cursor-pointer text-amber-100">{item.title} · {item.subtitle}</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{item.body}</p></details>)}<button type="button" onClick={() => setHistoryOpen(false)} className="mt-4 w-full rounded border border-amber-700 px-3 py-2">ปิด</button></div></div>}
    {active && <div role="dialog" aria-modal="true" aria-label="จดหมายใหม่" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4"><div className="w-full max-w-md rounded-2xl border border-[#a4794e] bg-[#1d1411] p-5 text-center shadow-[0_0_80px_rgba(161,93,38,0.24)]"><p className="text-xs tracking-[0.2em] text-amber-300">BURNING WEREWOLF · SECRET LETTER</p>{!opened ? <><h2 className="mt-5 text-xl font-semibold text-[#f4e4c9]">คุณได้รับจดหมายหนึ่งฉบับ</h2><p className="mt-2 text-sm text-[#c5aa8a]">{active.subtitle}</p><button type="button" onClick={() => setOpened(true)} aria-label="เปิดซองจดหมาย" className="group mx-auto mt-7 block rounded-xl p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"><svg viewBox="0 0 300 210" className="w-64 max-w-full drop-shadow-xl transition-transform duration-300 group-hover:-translate-y-2" aria-hidden="true"><rect x="20" y="20" width="260" height="165" rx="8" fill="#ceb48c" stroke="#9d7750" strokeWidth="3"/><path d="M22 25 L150 123 L278 25" fill="#e9d5b2" stroke="#a6865f" strokeWidth="3"/><path d="M22 182 L117 98 L150 125 L183 98 L278 182" fill="#dcc29a" stroke="#a6865f" strokeWidth="2"/><circle cx="150" cy="120" r="24" fill="#843c31" stroke="#b46a4e" strokeWidth="3"/><path d="M142 129 L150 108 L158 129 M145 122 L155 122" stroke="#e4b887" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg><span className="mt-2 block font-semibold text-amber-200">แตะซองจดหมายเพื่อเปิด</span></button><button type="button" onClick={dismiss} className="mt-4 text-sm text-[#c5aa8a] underline">เก็บไว้อ่านทีหลัง</button></> : <><div className="mt-5 animate-[fadeIn_.3s_ease-out] rounded-md bg-[#e8d6b5] px-5 py-7 text-[#443225] shadow-xl"><p className="text-xs text-[#806348]">{active.subtitle}</p><h2 className="mt-3 text-xl font-bold">{active.title}</h2><div className="my-4 border-t border-[#b89c72]"/><p className="whitespace-pre-wrap text-left text-sm leading-7">{active.body}</p></div><button type="button" onClick={dismiss} className="mt-5 w-full rounded-lg bg-[#a66a3c] px-4 py-3 font-semibold text-white">ปิดจดหมาย {queue.length > 1 ? `· เหลืออีก ${queue.length - 1} ฉบับ` : ''}</button></>}</div></div>}
  </>
}
