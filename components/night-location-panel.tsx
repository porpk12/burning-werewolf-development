'use client'
import { useCallback, useEffect, useState } from 'react'

type Location={id:string;name:string;icon:string;description:string;capacity:number}
type Person={id:string;name:string}
type NightData={closed:boolean;selfId:string|null;locations:Location[];players:Person[];mine:{location:string;target:string|null;admitted:boolean|null}|null;submittedCount?:number;results?:{player_id:string;name:string;location_id:string;target:string|null;admitted:boolean}[]}
export function NightLocationPanel({code,moderator}:{code:string;moderator:boolean}){
 const [data,setData]=useState<NightData|null>(null)
 const [selected,setSelected]=useState<string|null>(null)
 const [target,setTarget]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const refresh=useCallback(async()=>{try{const r=await fetch(`/api/night-locations?code=${encodeURIComponent(code)}`,{cache:'no-store'});const j=await r.json();if(!r.ok){setError(j.error??'โหลดข้อมูลไม่สำเร็จ');return}setData(j);setError('')}catch{setError('เชื่อมต่อไม่สำเร็จ')}},[code])
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),3500);return()=>clearInterval(timer)},[refresh])
 async function send(body:Record<string,unknown>){setBusy(true);setError('');try{const r=await fetch('/api/night-locations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,...body})});const j=await r.json();if(!r.ok)throw new Error(j.error??'บันทึกไม่สำเร็จ');setSelected(null);await refresh()}catch(e){setError(e instanceof Error?e.message:'เกิดข้อผิดพลาด')}finally{setBusy(false)}}
 const location=data?.locations.find(x=>x.id===selected)
 return <section className="mt-6 rounded-xl border border-[#6e4e2f] bg-[#1b1311] p-4">
  <p className="text-xs tracking-widest text-[#d4a65a]">NIGHT EXPLORATION</p>
  <h2 className="mt-2 text-xl font-semibold">🌙 สำรวจหมู่บ้านยามค่ำคืน</h2>
  {!data?<p className="mt-3 text-sm">กำลังโหลดสถานที่…</p>:moderator?<div className="mt-4 space-y-3">
    <p className="text-sm text-[#b7aaa0]">{data.closed?'ปิดการเลือกสถานที่แล้ว':'กำลังเปิดรับการเลือกสถานที่'} · ส่งแล้ว {data.submittedCount??0} คน</p>
    {!data.closed?<button disabled={busy} onClick={()=>{if(window.confirm('ปิดรับการเลือกและคำนวณ Capacity?'))void send({action:'close'})}} className="rounded-lg bg-[#d4a65a] px-4 py-3 font-semibold text-[#170f0d] disabled:opacity-40">🔒 ปิดการเลือกและตรวจ Capacity</button>:<>
     <p className="text-sm text-amber-200">ผลการเข้าสถานที่ (เฉพาะ Moderator) — ยังไม่แจกข้อมูล</p>
     <div className="space-y-2">{data.results?.map(x=><div key={x.player_id} className="rounded-lg border border-[#4b3226] p-3 text-sm"><strong>{x.name}</strong> · {x.location_id==='home'?'🏠 อยู่บ้าน':data.locations.find(l=>l.id===x.location_id)?.name??x.location_id} · <span className={x.admitted?'text-emerald-300':'text-red-300'}>{x.admitted?'เข้าสำเร็จ':'เข้าไม่สำเร็จ'}</span>{x.target&&<p className="mt-1 text-xs text-[#b7aaa0]">เป้าหมาย: {data.players.find(p=>p.id===x.target)?.name??data.locations.find(l=>l.id===x.target)?.name??x.target}</p>}</div>)}</div>
    </>}
   </div>:<div className="mt-4">
   {data.closed?<div className="rounded-lg border border-[#4b3226] p-4"><p>🔒 ปิดรับการเลือกสถานที่แล้ว</p><p className="mt-2 text-sm text-[#b7aaa0]">{data.mine?'ระบบบันทึกการเลือกของคุณแล้ว รอ Moderator ดำเนินขั้นตอนต่อไป':'คุณไม่ได้เลือกสถานที่ในคืนนี้'}</p></div>:selected===null?<>
    <p className="mb-3 text-sm text-[#b7aaa0]">แตะสถานที่เพื่ออ่านความสามารถ แล้วจึงยืนยันการเลือก · จำนวนที่แสดงคือ Capacity ไม่ใช่จำนวนคนที่เลือก</p>
    <div className="grid grid-cols-2 gap-3">{data.locations.map(loc=><button key={loc.id} type="button" onClick={()=>{setSelected(loc.id);setTarget('')}} className="rounded-xl border border-[#6e4e2f] bg-[#2b1d18] p-4 text-center transition hover:border-[#d4a65a]"><span className="block text-4xl">{loc.icon}</span><span className="mt-2 block font-semibold">{loc.name}</span><span className="mt-1 block text-xs text-[#b7aaa0]">รับ {loc.capacity} คน · ดูรายละเอียด →</span></button>)}</div>
    <button type="button" onClick={()=>setSelected('home')} className="mt-3 w-full rounded-xl border border-[#6e4e2f] p-4 text-left">🏠 อยู่บ้าน <span className="block text-xs text-[#b7aaa0]">ไม่ไปสถานที่ใดในคืนนี้ · ดูรายละเอียด →</span></button>
    {data.mine&&<p className="mt-3 text-sm text-amber-200">เลือกไว้แล้ว: {data.mine.location==='home'?'อยู่บ้าน':data.locations.find(x=>x.id===data.mine?.location)?.name} (เปลี่ยนได้ก่อน Mod ปิดรับ)</p>}
   </>:<div className="rounded-xl border border-[#6e4e2f] bg-[#2b1d18] p-4">
     <button onClick={()=>setSelected(null)} className="text-sm text-[#d4a65a]">← กลับไปแผนที่</button>
     <div className="mt-3 text-center text-5xl">{location?.icon??'🏠'}</div><h3 className="mt-3 text-center text-2xl font-semibold">{location?.name??'อยู่บ้าน'}</h3>
     {location&&<p className="mt-1 text-center text-sm text-[#b7aaa0]">Capacity {location.capacity} คน</p>}
     <p className="mt-4 text-sm leading-7">{location?.description??'พักอยู่บ้านในคืนนี้ และอาจได้รับจดหมายปริศนาหลัง Moderator ตรวจสอบ'}</p>
     {selected==='fortress'&&<label className="mt-4 block text-sm">เลือกสถานที่ที่จะป้องกัน<select className="mt-2 w-full rounded border border-[#6e4e2f] bg-[#170f0d] p-3" value={target} onChange={e=>setTarget(e.target.value)}><option value="">-- เลือกสถานที่ --</option>{data.locations.filter(x=>x.id!=='fortress').map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
     {selected==='brothel'&&<label className="mt-4 block text-sm">เลือกผู้เล่นที่ต้องการตรวจสอบ<select className="mt-2 w-full rounded border border-[#6e4e2f] bg-[#170f0d] p-3" value={target} onChange={e=>setTarget(e.target.value)}><option value="">-- เลือกผู้เล่น --</option>{data.players.filter(x=>x.id!==data.selfId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
     <p className="mt-4 text-xs text-[#b7aaa0]">การเลือกไม่ได้รับประกันว่าจะเข้าสถานที่สำเร็จ หากเกิน Capacity ทุกคนที่เลือกสถานที่นั้นจะเข้าไม่สำเร็จ</p>
     <button disabled={busy||((selected==='fortress'||selected==='brothel')&&!target)} onClick={()=>void send({action:'choose',location:selected,target:target||null})} className="mt-4 w-full rounded-lg bg-[#d4a65a] px-4 py-3 font-semibold text-[#170f0d] disabled:opacity-40">{busy?'กำลังบันทึก…':`ยืนยันเลือก${location?.name??'อยู่บ้าน'}`}</button>
    </div>}
   </div>}
  {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
 </section>
}
