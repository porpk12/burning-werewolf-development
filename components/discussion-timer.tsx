'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'
type Timer = { target_phase:'day'|'night'; duration_seconds:number; remaining_seconds:number; ends_at:string|null }
export function DiscussionTimer({code,moderator,phase}:{code:string;moderator:boolean;phase:string}){
 const [timer,setTimer]=useState<Timer|null>(null)
 const [now,setNow]=useState(Date.now())
 const [seconds,setSeconds]=useState(180)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [expiredNotice,setExpiredNotice]=useState(false)
 const notifiedRef=useRef<string|null>(null)
 const load=useCallback(async()=>{try{const r=await fetch(`/api/discussion-timer?code=${encodeURIComponent(code)}`,{cache:'no-store'});const x=await r.json();if(r.ok)setTimer(x.timer)}catch{}},[code])
 useEffect(() => {
  void load()

  // อัปเดตเวลาบนหน้าจอทุก 1 วินาที
  const clockId = setInterval(() => {
    setNow(Date.now())
  }, 1000)

  // ดึงข้อมูลจาก Server ทุก 3 วินาทีเหมือนเดิม
  const syncId = setInterval(() => {
    void load()
  }, 3000)

  return () => {
    clearInterval(clockId)
    clearInterval(syncId)
  }
}, [load])
 const target=phase==='day'?'night':'day'
 const active=timer?.target_phase===target
 const left=active?(timer?.ends_at?Math.max(0,Math.ceil((new Date(timer.ends_at).getTime()-now)/1000)):timer?.remaining_seconds??0):0
 const duration = active ? Math.max(1, timer?.duration_seconds ?? 180) : 180
 const progress = active ? Math.min(100, Math.max(0, (left / duration) * 100)) : 0
 const clock=`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`
 const expiryKey=active&&timer?.ends_at?`${code}:${target}:${timer.ends_at}`:null
 useEffect(()=>{
  if(!expiryKey || left>0)return
  if(notifiedRef.current===expiryKey)return
  notifiedRef.current=expiryKey
  setExpiredNotice(true)
 },[expiryKey,left])
 useEffect(()=>{setExpiredNotice(false)},[code,phase])
 async function control(action:string){if(action==='start'||action==='extend'||action==='end')setExpiredNotice(false);setBusy(true);setError('');try{const r=await fetch('/api/discussion-timer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,action,seconds,targetPhase:target})});const x=await r.json();if(!r.ok)setError(x.error??'บันทึกไม่สำเร็จ');else await load()}catch{setError('เชื่อมต่อไม่ได้')}finally{setBusy(false)}}
 if(!['day','night','night_zero'].includes(phase))return null
 return <section className="bw-discussion-strip" aria-label="ช่วงสนทนา">
  <div className="bw-discussion-top"><h2><Clock3 size={18} aria-hidden="true"/> เวลาพูดคุย</h2><strong role="timer" className="bw-discussion-time">{active?clock:'--:--'}</strong></div>
  <div className="bw-discussion-track" role="progressbar" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={active?left:0} aria-label="เวลาสนทนาที่เหลือ"><div className="bw-discussion-fill" style={{width:`${progress}%`}}/></div>
  <p className="bw-discussion-status">{!active?'รอ Moderator เริ่มช่วงสนทนา':left===0?'หมดเวลาแล้ว · รอ Moderator เปลี่ยน Phase':timer?.ends_at?'กำลังนับถอยหลัง':'หยุดชั่วคราว'}</p>
  {moderator&&<div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><label>เวลา <select value={seconds} onChange={e=>setSeconds(Number(e.target.value))} className="rounded bg-[#170f0d] p-2"><option value={120}>2 นาที</option><option value={180}>3 นาที</option><option value={300}>5 นาที</option><option value={600}>10 นาที</option></select></label><button disabled={busy} onClick={()=>void control('start')} className="rounded border border-amber-500 p-2">เริ่มใหม่</button><button disabled={busy||!active||!timer?.ends_at} onClick={()=>void control('pause')} className="rounded border border-amber-500 p-2 disabled:opacity-40">หยุด</button><button disabled={busy||!active||!!timer?.ends_at||left===0} onClick={()=>void control('resume')} className="rounded border border-amber-500 p-2 disabled:opacity-40">ต่อ</button><button disabled={busy||!active} onClick={()=>void control('extend')} className="rounded border border-amber-500 p-2 disabled:opacity-40">+1 นาที</button><button disabled={busy||!active} onClick={()=>void control('end')} className="rounded border border-amber-500 p-2 disabled:opacity-40">จบสนทนา</button></div>}
  {moderator&&<p className="mt-2 text-xs text-[#b7aaa0]">เวลาหมดไม่เปลี่ยน Phase อัตโนมัติ · Moderator เป็นผู้กดเปลี่ยนเอง</p>}
  {expiredNotice&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="bw-timer-expired-title" aria-describedby="bw-timer-expired-description" className="w-full max-w-sm rounded-2xl border border-[#79613f] bg-[#222824] p-6 text-center text-[#f3e6cb] shadow-2xl"><div className="mb-3 text-4xl" aria-hidden="true">⌛</div><h2 id="bw-timer-expired-title" className="text-xl font-bold">หมดเวลาสนทนาแล้ว</h2><p id="bw-timer-expired-description" className="mt-3 text-sm text-[#c9c5b8]">{moderator?'คุณสามารถต่อเวลา หรือจบสนทนาได้จากแผงควบคุม':'รอ Moderator ดำเนินเกมต่อ'}</p><button autoFocus onClick={()=>setExpiredNotice(false)} className="mt-5 w-full rounded-lg bg-[#b89459] px-4 py-3 font-semibold text-[#171b19] hover:bg-[#d1ab69]">รับทราบ</button></div></div>}
  {error&&<p role="alert" className="mt-2 text-red-300">{error}</p>}
 </section>
}
