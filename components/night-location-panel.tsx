'use client'
import { useCallback, useEffect, useState } from 'react'

type Location={id:string;name:string;icon:string;description:string;capacity:number}
type Person={id:string;name:string}
type NightData={abilityResolved?:boolean;burnOutcome?:string|null;burnedLocation?:string|null;burnedLocations?:string[];wolves?:Person[];messages?:{player_id:string;location_id:string;message:string|null;published:boolean}[];myMessage?:string|null;closed:boolean;selfId:string|null;locations:Location[];players:Person[];mine:{location:string;target:string|null;admitted:boolean|null}|null;submittedCount?:number;results?:{player_id:string;name:string;location_id:string;target:string|null;admitted:boolean}[]}
export function NightLocationPanel({code,moderator}:{code:string;moderator:boolean}){
 const [data,setData]=useState<NightData|null>(null)
 const [selected,setSelected]=useState<string|null>(null)
 const [target,setTarget]=useState('')
 const [busy,setBusy]=useState(false)
 const [burner,setBurner]=useState('')
 const [messageEdits,setMessageEdits]=useState<Record<string,string>>({})
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
     <div className="rounded-lg border border-[#6e4e2f] p-3 space-y-3">
      <h3 className="font-semibold text-amber-200">📊 สรุปผลการสำรวจกลางคืน</h3>
      <p className="text-sm text-[#b7aaa0]">ผู้ส่งคำตอบ {data.results?.length??0} คน · เข้าสำเร็จ {data.results?.filter(x=>x.admitted).length??0} คน · เข้าไม่สำเร็จ {data.results?.filter(x=>!x.admitted).length??0} คน</p>
      <div className="space-y-2">{[...data.locations.map(l=>({id:l.id,name:l.name,capacity:l.capacity})),{id:'home',name:'🏠 อยู่บ้าน',capacity:null}].map(l=>{const group=data.results?.filter(x=>x.location_id===l.id)??[];return <div key={l.id} className="rounded border border-[#4b3226] p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{l.name}</strong><span className="text-[#b7aaa0]">เลือก {group.length} คน{l.capacity!==null?` / รับ ${l.capacity} คน`:''}</span></div><p className="mt-1 text-xs text-[#b7aaa0]">{group.length?group.map(x=>x.name).join(', '):'ไม่มีผู้เลือก'}</p>{group.length>0&&<p className={`mt-1 text-xs ${group.every(x=>x.admitted)?'text-emerald-300':'text-red-300'}`}>{group.every(x=>x.admitted)?'✓ เข้าสำเร็จทุกคน':'✕ เข้าไม่สำเร็จ'}</p>}</div>})}</div>
     </div>
     <h3 className="text-sm font-semibold text-amber-200">รายละเอียดรายผู้เล่น</h3>
     <div className="space-y-2">{data.results?.map(x=><div key={x.player_id} className="rounded-lg border border-[#4b3226] p-3 text-sm"><strong>{x.name}</strong> · {x.location_id==='home'?'🏠 อยู่บ้าน':data.locations.find(l=>l.id===x.location_id)?.name??x.location_id} · <span className={x.admitted?'text-emerald-300':'text-red-300'}>{x.admitted?'เข้าสำเร็จ':'เข้าไม่สำเร็จ'}</span>{x.target&&<p className="mt-1 text-xs text-[#b7aaa0]">เป้าหมาย: {data.players.find(p=>p.id===x.target)?.name??data.locations.find(l=>l.id===x.target)?.name??x.target}</p>}</div>)}</div>
    </>}
    {data.closed&&!data.abilityResolved&&<div className="rounded-lg border border-amber-700 p-3"><h3 className="font-semibold text-amber-200">🐺 เรียกหมาป่าลืมตา</h3><p className="mt-2 text-sm">หมาป่าตกลงกันเลือกผู้ลงมือเผาได้ 1 ตัว หรือไม่เผา</p><select className="mt-2 w-full rounded bg-[#2b1d18] p-3" value={burner} onChange={e=>setBurner(e.target.value)}><option value="">ไม่เผาในคืนนี้</option>{data.wolves?.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select><button disabled={busy} onClick={()=>{if(window.confirm('ยืนยันการตัดสินใจของหมาป่า?'))void send({action:'resolve',burner:burner||null})}} className="mt-3 rounded bg-[#d4a65a] px-4 py-3 font-semibold text-[#170f0d]">🔥 ตรวจผลการเผาและความสามารถ</button></div>}
    {data.abilityResolved&&<div className="space-y-3 rounded-lg border border-[#6e4e2f] p-3"><h3 className="font-semibold text-amber-200">📜 ผลความสามารถ (เฉพาะ Mod)</h3><p className="text-sm">ผลเผา: {data.burnOutcome??'ไม่มี'} {data.burnedLocation?`· ${data.burnedLocation}`:''}</p>{data.messages?.map(m=><div key={m.player_id} className="rounded border border-[#4b3226] p-3"><p className="text-sm font-semibold">{data.players.find(p=>p.id===m.player_id)?.name??'ผู้เล่น'} · {data.locations.find(l=>l.id===m.location_id)?.name??m.location_id} {m.published?'✓ ส่งแล้ว':'รอส่ง'}</p><textarea className="mt-2 w-full rounded bg-[#2b1d18] p-2 text-sm" rows={3} value={messageEdits[m.player_id]??m.message??''} onChange={e=>setMessageEdits(v=>({...v,[m.player_id]:e.target.value}))}/><button disabled={busy} className="mt-2 rounded border border-[#d4a65a] px-3 py-2 text-sm" onClick={()=>void send({action:'message',playerId:m.player_id,message:messageEdits[m.player_id]??m.message??'',published:true})}>บันทึกและส่งให้คนนี้</button></div>)}<button disabled={busy} className="rounded bg-[#d4a65a] px-4 py-3 font-semibold text-[#170f0d]" onClick={()=>{if(window.confirm('ส่งข้อมูลที่ยังไม่ได้แก้ไขให้ผู้เล่นทั้งหมด?'))void send({action:'publish'})}}>ส่งข้อมูลทั้งหมด</button></div>}
   </div>:<div className="mt-4">
   {data.closed?<div className="rounded-lg border border-[#4b3226] p-4"><p>🔒 ปิดรับการเลือกสถานที่แล้ว</p>{data.myMessage&&<div className="mt-3 rounded border border-[#d4a65a] p-3"><p className="font-semibold text-amber-200">📜 ข้อมูลที่ได้รับ</p><p className="mt-2 whitespace-pre-wrap">{data.myMessage}</p></div>}<p className="mt-2 text-sm text-[#b7aaa0]">{data.mine?'ระบบบันทึกการเลือกของคุณแล้ว รอ Moderator ดำเนินขั้นตอนต่อไป':'คุณไม่ได้เลือกสถานที่ในคืนนี้'}</p></div>:selected===null?<>
    <p className="mb-3 text-sm text-[#b7aaa0]">แตะสถานที่เพื่ออ่านความสามารถ แล้วจึงยืนยันการเลือก · จำนวนที่แสดงคือ Capacity ไม่ใช่จำนวนคนที่เลือก</p>
    <div className="grid grid-cols-2 gap-3">{data.locations.filter(loc=>!data.burnedLocations?.includes(loc.id)).map(loc=><button key={loc.id} type="button" onClick={()=>{setSelected(loc.id);setTarget('')}} className="rounded-xl border border-[#6e4e2f] bg-[#2b1d18] p-4 text-center transition hover:border-[#d4a65a]"><span className="block text-4xl">{loc.icon}</span><span className="mt-2 block font-semibold">{loc.name}</span><span className="mt-1 block text-xs text-[#b7aaa0]">รับ {loc.capacity} คน · ดูรายละเอียด →</span></button>)}</div>
    <button type="button" onClick={()=>setSelected('home')} className="mt-3 w-full rounded-xl border border-[#6e4e2f] p-4 text-left">🏠 อยู่บ้าน <span className="block text-xs text-[#b7aaa0]">ไม่ไปสถานที่ใดในคืนนี้ · ดูรายละเอียด →</span></button>
    {data.mine&&<p className="mt-3 text-sm text-amber-200">เลือกไว้แล้ว: {data.mine.location==='home'?'อยู่บ้าน':data.locations.find(x=>x.id===data.mine?.location)?.name} (เปลี่ยนได้ก่อน Mod ปิดรับ)</p>}
   </>:<div className="rounded-xl border border-[#6e4e2f] bg-[#2b1d18] p-4">
     <button onClick={()=>setSelected(null)} className="text-sm text-[#d4a65a]">← กลับไปแผนที่</button>
     <div className="mt-3 text-center text-5xl">{location?.icon??'🏠'}</div><h3 className="mt-3 text-center text-2xl font-semibold">{location?.name??'อยู่บ้าน'}</h3>
     {location&&<p className="mt-1 text-center text-sm text-[#b7aaa0]">Capacity {location.capacity} คน</p>}
     <p className="mt-4 text-sm leading-7">{location?.description??'พักอยู่บ้านในคืนนี้ และอาจได้รับจดหมายปริศนาหลัง Moderator ตรวจสอบ'}</p>
     {selected==='fortress'&&<label className="mt-4 block text-sm">เลือกสถานที่ที่จะป้องกัน<select className="mt-2 w-full rounded border border-[#6e4e2f] bg-[#170f0d] p-3" value={target} onChange={e=>setTarget(e.target.value)}><option value="">-- เลือกสถานที่ --</option>{data.locations.filter(x=>x.id!=='fortress'&&!data.burnedLocations?.includes(x.id)).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
     {selected==='brothel'&&<label className="mt-4 block text-sm">เลือกผู้เล่นที่ต้องการตรวจสอบ<select className="mt-2 w-full rounded border border-[#6e4e2f] bg-[#170f0d] p-3" value={target} onChange={e=>setTarget(e.target.value)}><option value="">-- เลือกผู้เล่น --</option>{data.players.filter(x=>x.id!==data.selfId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
     <p className="mt-4 text-xs text-[#b7aaa0]">การเลือกไม่ได้รับประกันว่าจะเข้าสถานที่สำเร็จ หากเกิน Capacity ทุกคนที่เลือกสถานที่นั้นจะเข้าไม่สำเร็จ</p>
     <button disabled={busy||((selected==='fortress'||selected==='brothel')&&!target)} onClick={()=>void send({action:'choose',location:selected,target:target||null})} className="mt-4 w-full rounded-lg bg-[#d4a65a] px-4 py-3 font-semibold text-[#170f0d] disabled:opacity-40">{busy?'กำลังบันทึก…':`ยืนยันเลือก${location?.name??'อยู่บ้าน'}`}</button>
    </div>}
   </div>}
  {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
 </section>
}
