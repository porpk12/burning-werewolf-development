'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Player = {id:string;display_name:string;status:string;role:string|null}
type State = {game:{phase:string;round_number:number;room_code:string};players:Player[];sandbox:{human_mode:boolean}}
export default function SandboxPage() {
 const [count,setCount]=useState(10),[wolves,setWolves]=useState(2),[mode,setMode]=useState<'all'|'mixed'>('all'),[objectives,setObjectives]=useState(true)
 const [code,setCode]=useState(''),[data,setData]=useState<State|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function api(action:string,more:Record<string,unknown>={}) {
  setBusy(true);setMessage('')
  try {const r=await fetch('/api/sandbox',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,code,...more})});const j=await r.json();if(!r.ok)throw Error(j.error||'เกิดข้อผิดพลาด');setMessage(action==='fill'?`ส่งข้อมูลสำเร็จ ${j.filled} คน${j.errors?.length?' · ข้อผิดพลาด: '+j.errors.join('; '):''}`:'สร้างห้องทดสอบแล้ว');if(j.code)setCode(j.code);await refresh(j.code||code)}catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 async function refresh(room=code) {if(!room)return;const r=await fetch('/api/sandbox?code='+encodeURIComponent(room),{cache:'no-store'});if(r.ok)setData(await r.json())}
 useEffect(()=>{if(!code)return;const timer=setInterval(()=>{void refresh(code)},3500);return()=>clearInterval(timer)},[code])
 return <main className="min-h-screen bg-[#171915] text-[#efe3ca] p-5 md:p-10"><div className="mx-auto max-w-3xl space-y-6">
 <div className="flex items-center justify-between"><div><p className="text-xs tracking-[.3em] text-[#c6a06a]">BURNING WEREWOLF · DEVELOPMENT</p><h1 className="text-3xl font-semibold mt-2">ห้องทดสอบเกม</h1><p className="text-[#b9ae98] mt-2">สร้าง Bot และสุ่มการกระทำ โดยไม่ต้องเปิดหลายบัญชี</p></div><Link className="underline text-sm" href="/mod">กลับหน้าผู้ดูแล</Link></div>
 <section className="rounded-2xl border border-[#776044] bg-[#24271f] p-5 space-y-4">
 <h2 className="text-xl">ตั้งค่าห้องจำลอง</h2><label className="block">ผู้เล่นทั้งหมด: <strong>{count}</strong><input className="w-full accent-amber-600" type="range" min="2" max="20" value={count} onChange={e=>{const n=Number(e.target.value);setCount(n);setWolves(w=>Math.min(w,n-1))}}/></label>
 <label className="block">หมาป่า: <strong>{wolves}</strong><input className="w-full accent-amber-600" type="range" min="1" max={Math.min(4,count-1)} value={wolves} onChange={e=>setWolves(Number(e.target.value))}/></label>
 <label className="block">โหมด <select className="block mt-1 w-full rounded bg-[#353a30] p-2" value={mode} onChange={e=>setMode(e.target.value as 'all'|'mixed')}><option value="all">Bot ทั้งหมด</option><option value="mixed">ฉัน 1 คน + Bot ที่เหลือ (เข้าร่วมห้องเอง)</option></select></label>
 <label className="flex gap-2 items-center"><input type="checkbox" checked={objectives} onChange={e=>setObjectives(e.target.checked)}/>เปิดภารกิจลับ</label>
 <button disabled={busy} className="rounded-lg bg-[#a97b45] px-5 py-3 font-semibold text-[#1d1b16] disabled:opacity-50" onClick={()=>void api('create',{count,wolves,mode,objectives})}>สร้างห้องทดสอบ</button>
 </section>
 {code&&<section className="rounded-2xl border border-[#776044] bg-[#24271f] p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-[#b9ae98]">TEST ROOM</p><h2 className="text-2xl font-mono">{code}</h2><p className="text-sm">{data?.game.phase??'lobby'} · รอบ {data?.game.round_number??0}</p></div><Link className="rounded-lg bg-[#4a5143] px-4 py-2" href={`/mod/room/${code}`}>เปิด Moderator Dashboard ↗</Link></div>
 <p className="text-sm text-[#c7bda8]">เริ่มเกม / ปิดลงคะแนน / ปิดสถานที่ / เปลี่ยน Phase จาก Moderator Dashboard ตามปกติ แล้วกลับมากดสุ่มส่งที่นี่</p>
 <button disabled={busy} className="rounded-lg bg-[#a97b45] px-5 py-3 font-semibold text-[#1d1b16] disabled:opacity-50" onClick={()=>void api('fill')}>🎲 สุ่มส่งข้อมูลให้ Bot ที่ยังไม่ส่ง</button>
 <button disabled={busy} className="ml-3 rounded-lg border border-[#807059] px-4 py-3 disabled:opacity-50" onClick={()=>void refresh()}>รีเฟรชสถานะ</button>
 <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">{data?.players.map(p=><div key={p.id} className="rounded-lg bg-[#353a30] p-3 text-sm"><strong>{p.display_name}</strong><div className="text-[#c8b9a2]">{p.role??'ยังไม่แจกบทบาท'}</div><div className="text-xs text-[#b7c0ac]">{p.status}</div></div>)}</div></section>}
 {message&&<p role="status" className="rounded-lg border border-[#796348] p-3">{message}</p>}
 <p className="text-xs text-[#aaa18e]">เฉพาะ Moderator ที่เข้าสู่ระบบเท่านั้น · Bot ใช้ฐานข้อมูลจริงและระบบตรวจสอบกติกาเดิม · อย่าใช้ข้อมูลทดสอบเป็นเกมจริง</p>
 </div></main>
}
