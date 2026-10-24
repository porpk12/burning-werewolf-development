'use client'
import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { LocationArt } from '@/components/location-art'

type Location={id:string;name:string;icon:string;description:string;capacity:number}
type Person={id:string;name:string}
type NightData={abilityResolved?:boolean;burnOutcome?:string|null;burnedLocation?:string|null;burnedLocations?:string[];hasHomeLetter?:boolean;hasExiledPlayers?:boolean;wolves?:Person[];messages?:{player_id:string;location_id:string;message:string|null;published:boolean}[];myMessage?:string|null;closed:boolean;selfId:string|null;locations:Location[];players:Person[];mine:{location:string;target:string|null;admitted:boolean|null}|null;submittedCount?:number;results?:{player_id:string;name:string;location_id:string;target:string|null;admitted:boolean}[]}
export function NightLocationPanel({code,moderator}:{code:string;moderator:boolean}){
 const [data,setData]=useState<NightData|null>(null)
 const [selected,setSelected]=useState<string|null>(null)
 const [target,setTarget]=useState('')
 const [busy,setBusy]=useState(false)
 const [burner,setBurner]=useState('')
 const [messageEdits,setMessageEdits]=useState<Record<string,string>>({})
 const [error,setError]=useState('')
 const [undoOpen,setUndoOpen]=useState(false)
 const refresh=useCallback(async()=>{try{const r=await fetch(`/api/night-locations?code=${encodeURIComponent(code)}`,{cache:'no-store'});const j=await r.json();if(!r.ok){setError(j.error??'โหลดข้อมูลไม่สำเร็จ');return}setData(j);setError('')}catch{setError('เชื่อมต่อไม่สำเร็จ')}},[code])
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),3500);return()=>clearInterval(timer)},[refresh])
 async function send(body:Record<string,unknown>){setBusy(true);setError('');try{const r=await fetch('/api/night-locations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,...body})});const j=await r.json();if(!r.ok)throw new Error(j.error??'บันทึกไม่สำเร็จ');setSelected(null);await refresh()}catch(e){setError(e instanceof Error?e.message:'เกิดข้อผิดพลาด')}finally{setBusy(false)}}
 const location=data?.locations.find(x=>x.id===selected)
 return <section className="mt-6 rounded-xl border border-[#6e4e2f] bg-[#1b1311] p-4">
  <p className="text-xs tracking-widest text-[#d4a65a]">NIGHT EXPLORATION</p>
  <h2 className="mt-2 text-xl font-semibold">🌙 สำรวจหมู่บ้านยามราตรี</h2>
  {!data?<p className="mt-3 text-sm">กำลังโหลดสถานที่…</p>:moderator?<div className="mt-4 space-y-3">
    <p className="text-sm text-[#b7aaa0]">{data.closed?'ปิดการเลือกสถานที่แล้ว':'กำลังเปิดรับการเลือกสถานที่'} · ส่งแล้ว {data.submittedCount??0} คน</p>
    {!data.closed?<button disabled={busy} onClick={()=>{if(window.confirm('ปิดรับการเลือกและคำนวณ Capacity?'))void send({action:'close'})}} className="rounded-lg bg-[#d4a65a] px-4 py-3 font-semibold text-[#170f0d] disabled:opacity-40">🔒 ปิดการเลือกและตรวจ Capacity</button>:<>
     <p className="text-sm text-amber-200">ผลการเข้าสถานที่ (เฉพาะ Moderator) — ยังไม่แจกข้อมูล</p>
     <div className="rounded-lg border border-[#6e4e2f] p-3 space-y-3">
      <h3 className="font-semibold text-amber-200">📊 สรุปผลการสำรวจกลางคืน</h3>
      <p className="text-sm text-[#b7aaa0]">ผู้ส่งคำตอบ {data.results?.length??0} คน · เข้าสำเร็จ {data.results?.filter(x=>x.admitted).length??0} คน · เข้าไม่สำเร็จ {data.results?.filter(x=>!x.admitted).length??0} คน</p>
      <div className="space-y-2">{[...data.locations.map(l=>({id:l.id,name:l.name,capacity:l.capacity})),{id:'home',name:'🏠 อยู่บ้าน',capacity:null}].map(l=>{const group=data.results?.filter(x=>x.location_id===l.id)??[];return <div key={l.id} className={`rounded border p-3 text-sm ${(data.wolves??[]).some(w=>group.some(x=>x.player_id===w.id)) ? "border-red-700 bg-red-950/20" : "border-[#4b3226]"}`}><div className="flex flex-wrap justify-between gap-2"><strong>{l.name}</strong><span className="text-[#b7aaa0]">เลือก {group.length} คน{l.capacity!==null?` / รับ ${l.capacity} คน`:''}</span></div><p className="mt-1 text-xs text-[#b7aaa0]">{group.length?group.map(x=>`${(data.wolves??[]).some(w=>w.id===x.player_id)?'🐺 ':''}${x.name} (${x.admitted?'เข้าได้':'เข้าไม่ได้'})`).join(' · '):'ไม่มีผู้เลือก'}</p>{group.length>0&&<p className={`mt-1 text-xs ${group.every(x=>x.admitted)?'text-emerald-300':'text-red-300'}`}>{group.every(x=>x.admitted)?'✓ เข้าสำเร็จทุกคน':'✕ เข้าไม่สำเร็จ'}</p>}</div>})}</div>
     </div>

    </>}
    {data.closed&&!data.abilityResolved&&<div className="rounded-lg border border-amber-700 p-3"><h3 className="font-semibold text-amber-200">🐺 เรียกหมาป่าลืมตา</h3><p className="mt-2 text-sm">หมาป่าตกลงกันเลือกผู้ลงมือเผาได้ 1 ตัว หรือไม่เผา</p><select className="mt-2 w-full rounded bg-[#2b1d18] p-3" value={burner} onChange={e=>setBurner(e.target.value)}><option value="">ไม่เผาในคืนนี้</option>{data.wolves?.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select><button disabled={busy} onClick={()=>{if(window.confirm('ยืนยันการตัดสินใจของหมาป่า?'))void send({action:'resolve',burner:burner||null})}} className="mt-3 rounded bg-[#d4a65a] px-4 py-3 font-semibold text-[#170f0d]">🔥 ตรวจผลการเผาและความสามารถ</button></div>}
    {data.abilityResolved&&<div className="space-y-3 rounded-lg border border-[#6e4e2f] p-3">
      <h3 className="font-semibold text-amber-200">📜 ผลความสามารถ (เฉพาะ Mod)</h3>
      <div role="status" className="rounded-xl border-2 border-orange-700 bg-[#3a1712] p-4"><p className="text-xs font-bold tracking-widest text-orange-300">🔥 ผลการเผาคืนนี้ · เฉพาะ Moderator</p><p className="mt-2 text-lg font-bold text-orange-100">{data.burnOutcome??'ไม่มีการเผาสำเร็จ'} {data.burnedLocation?`· ${data.locations.find(l=>l.id===data.burnedLocation)?.name??data.burnedLocation}`:''}</p></div>
      {([...data.locations,{id:'home',name:'🏠 อยู่บ้าน',icon:'',description:'',capacity:0}]).filter(loc=>(data.results??[]).some(r=>r.location_id===loc.id)||(data.messages??[]).some(m=>m.location_id===loc.id)).sort((a,b)=>a.id==='library'?-1:b.id==='library'?1:0).map(loc=>{
       const visitors=(data.results??[]).filter(r=>r.location_id===loc.id)
       const msgs=(data.messages??[]).filter(m=>m.location_id===loc.id)
       const libraryNeedsInput=loc.id==='library'&&visitors.some(v=>v.admitted)&&msgs.some(m=>!m.published)
       return <div key={loc.id} className={`rounded-lg border p-3 ${libraryNeedsInput?'border-amber-400 bg-amber-950/20':'border-[#4b3226]'}`}>
         <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-amber-100">{loc.name}</h4>{libraryNeedsInput&&<span className="rounded bg-amber-600 px-2 py-1 text-xs font-bold text-black">✍️ ต้องกรอกข้อความ</span>}</div>
         <p className="mt-1 text-xs text-[#cbbca7]">{visitors.length?visitors.map(v=>`${(data.wolves??[]).some(w=>w.id===v.player_id)?'🐺 ':''}${v.name} (${v.admitted?'เข้าได้':'เข้าไม่ได้'})`).join(' · '):'ไม่มีผู้เลือก'}</p>
         {msgs.length?msgs.map(m=><label key={m.player_id} className="mt-3 block text-sm"><span className="font-medium">{data.players.find(p=>p.id===m.player_id)?.name??'ผู้เล่น'} · {m.published?'✓ ส่งแล้ว':'รอส่ง'}</span><textarea disabled={m.published} className={`mt-2 w-full rounded border p-3 text-sm ${libraryNeedsInput?'border-amber-400 bg-[#39261a] focus:ring-2 focus:ring-amber-400':'border-[#4b3226] bg-[#2b1d18]'} disabled:opacity-70`} rows={3} value={messageEdits[m.player_id]??m.message??''} onChange={e=>setMessageEdits(v=>({...v,[m.player_id]:e.target.value}))}/></label>):<p className="mt-2 rounded border border-[#4b3226] bg-[#211916] p-3 text-sm text-[#cbbca7]">ไม่มีข้อความความสามารถสำหรับสถานที่นี้ในคืนนี้</p>}
       </div>
      })}
      {(data.messages??[]).length>0 && (data.messages??[]).every(m=>m.published)
       ? <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3"><span className="text-sm text-emerald-200">✓ ส่งผลความสามารถทั้งหมดแล้ว</span><button type="button" disabled={busy} onClick={()=>setUndoOpen(true)} className="rounded border border-amber-600 px-3 py-2 text-sm text-amber-100">↶ ย้อนกลับการส่ง</button></div>
       : <button disabled={busy} className="rounded bg-[#d4a65a] px-4 py-3 font-semibold text-[#170f0d] disabled:opacity-50" onClick={()=>{if(window.confirm('ยืนยันและส่งข้อความทั้งหมดตามที่แก้ไข?'))void send({action:'publish',messages:data.messages?.map(m=>({playerId:m.player_id,message:messageEdits[m.player_id]??m.message??''}))})}}>ยืนยันและส่งผลความสามารถทั้งหมด</button>}
      {undoOpen&&<div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4"><div role="dialog" aria-modal="true" aria-label="ยืนยันย้อนกลับ" className="w-full max-w-md rounded-xl border border-amber-600 bg-[#241915] p-5"><h3 className="text-lg font-semibold text-amber-100">ย้อนกลับการส่งผล?</h3><p className="mt-2 text-sm">ระบบจะถอนผลความสามารถและดึงจดหมายที่แจกในคืนนี้กลับคืน (เฉพาะก่อนเปลี่ยน Phase)</p><div className="mt-4 flex gap-2"><button className="rounded border border-[#74583b] px-4 py-2" onClick={()=>setUndoOpen(false)}>ยกเลิก</button><button className="rounded bg-amber-600 px-4 py-2 font-semibold text-black" onClick={()=>{setUndoOpen(false);void send({action:'unpublish'})}}>ยืนยันย้อนกลับ</button></div></div></div>}
    </div>}
   </div>:<div className="mt-4">
   {data.closed?<div className="rounded-lg border border-[#4b3226] p-4"><p>🔒 ปิดรับการเลือกสถานที่แล้ว</p>{data.mine?.location==='home' && data.myMessage && !data.hasHomeLetter && <div className="mt-3 rounded border border-[#6e4e2f] p-3 text-amber-100">🌙 คุณนอนหลับสบายเลยนะ</div>}{data.myMessage && data.mine?.location!=='home' &&<div className="mt-3 rounded border border-[#d4a65a] p-3"><p className="font-semibold text-amber-200">📜 ข้อมูลที่ได้รับ</p><p className="mt-2 whitespace-pre-wrap">{data.myMessage}</p></div>}<p className="mt-2 text-sm text-[#b7aaa0]">{data.mine?'ระบบบันทึกการเลือกของคุณแล้ว รอ Moderator ดำเนินขั้นตอนต่อไป':'คุณไม่ได้เลือกสถานที่ในคืนนี้'}</p></div>:selected===null?<>
    <p className="mb-3 text-sm text-[#b7aaa0]">แตะสถานที่เพื่ออ่านความสามารถ<br/>จำนวนตัวเลข คือ จำนวนที่รองรับได้ของสถานที่นั้นๆ</p>
    {data.mine&&<p className="mb-3 text-sm text-amber-200">เลือกไว้แล้ว : {data.mine.location==='home'?'อยู่บ้าน':data.locations.find(x=>x.id===data.mine?.location)?.name} สามารถแก้ไขได้</p>}
    <div className="grid grid-cols-2 gap-3">{data.locations.map(loc=>{const burned=data.burnedLocations?.includes(loc.id);return <button key={loc.id} type="button" disabled={burned} onClick={()=>{setSelected(loc.id);setTarget('')}} className={`relative overflow-hidden rounded-xl border p-4 text-center transition ${burned?'cursor-not-allowed border-red-900 bg-gradient-to-t from-[#4c1710] via-[#26100e] to-[#100b0b] opacity-85':'border-[#6e4e2f] bg-[#2b1d18] hover:border-[#d4a65a]'}`}><span className="relative inline-flex items-center gap-2"><LocationArt id={loc.id} name={loc.name} className={burned?'grayscale brightness-50':''}/>{burned?<span className="text-3xl" aria-label="ไฟไหม้">🔥</span>:<span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d4a65a] bg-[#49321d] text-sm font-bold text-amber-100">{loc.capacity}</span>}</span><span className="mt-2 block font-semibold">{loc.name}</span><span className={`mt-1 block text-xs ${burned?'font-semibold text-orange-300':'text-[#b7aaa0]'}`}>{burned?'🔥 ถูกเผาแล้ว · เข้าไม่ได้':'ดูรายละเอียด →'}</span></button>})}</div>
    <button type="button" onClick={()=>setSelected('home')} className="mt-3 w-full rounded-xl border border-[#6e4e2f] bg-[#2b1d18] p-4 text-left transition-colors hover:border-[#d4a65a]"><span className="flex items-center gap-3"><LocationArt id="home" name="อยู่บ้าน" className="!h-14 !w-14 !mx-0" /><span>อยู่บ้าน</span></span><span className="block text-xs text-[#b7aaa0]">ไม่ไปสถานที่ใดในคืนนี้ · ดูรายละเอียด →</span></button>
    <p className="mt-3 text-center text-xs leading-5 text-red-300">การเลือกไม่ได้เป็นการรับประกันว่าจะเข้าสถานที่นั้นได้สำเร็จ หากเกินจำนวนที่รองรับ ทุกคนที่เลือกสถานที่นั้นจะไม่มีใครได้ใช้ความสามารถ</p>

   </>:null}
   </div>}
   {data&&selected!==null&&!data.closed&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div role="dialog" aria-modal="true" aria-label="รายละเอียดสถานที่" className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#a4875b] bg-[#222a26] p-5 pt-10 text-[#eee9df] shadow-2xl">
     <button type="button" onClick={()=>setSelected(null)} aria-label="ปิดรายละเอียดสถานที่" className="absolute right-4 top-4 rounded-full border border-[#6e4e2f] p-2 text-[#d4a65a]"><X size={19}/></button>
     <div className="mt-3 flex justify-center"><LocationArt id={location?.id??'home'} name={location?.name??'อยู่บ้าน'}/></div><h3 className="mt-3 text-center text-2xl font-semibold">{location?.name??'อยู่บ้าน'}</h3>
     
     {(selected==='home'||(selected!=='fortress'&&selected!=='brothel'&&location?.description))&&<p className="mt-4 text-center text-sm leading-7">{location?.description??(data.hasExiledPlayers?'มีโอกาสได้รับจดหมายจากคนนอกหมู่บ้าน':'พักผ่อน')}</p>}
     {selected==='fortress'&&<label className="mt-4 block text-center text-sm">เลือกสถานที่ที่จะป้องกันไม่ให้ถูกเผาในคืนนี้<select className="mt-2 w-full rounded border border-[#6e4e2f] bg-[#170f0d] p-3" value={target} onChange={e=>setTarget(e.target.value)}><option value="">-- เลือกสถานที่ --</option>{data.locations.filter(x=>x.id!=='fortress'&&!data.burnedLocations?.includes(x.id)).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
     {selected==='brothel'&&<label className="mt-4 block text-center text-sm">เลือกผู้เล่นที่ต้องการตรวจสอบว่าเป็นหมาป่าหรือไม่<select className="mt-2 w-full rounded border border-[#6e4e2f] bg-[#170f0d] p-3" value={target} onChange={e=>setTarget(e.target.value)}><option value="">-- เลือกผู้เล่น --</option>{data.players.filter(x=>x.id!==data.selfId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
     <button disabled={busy||((selected==='fortress'||selected==='brothel')&&!target)} onClick={()=>void send({action:'choose',location:selected,target:target||null})} className="mt-4 w-full rounded-lg bg-[#d4a65a] px-4 py-3 font-semibold text-[#170f0d] disabled:opacity-40">{busy?'กำลังบันทึก…':`ยืนยันเลือก${location?.name??'อยู่บ้าน'}`}</button>
   </div></div>}
  {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
 </section>
}
