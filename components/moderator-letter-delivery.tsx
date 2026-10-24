'use client'
import {useCallback,useEffect,useState} from 'react'
export function ModeratorLetterDelivery({code}:{code:string}){
 const [eligible,setEligible]=useState(false)
 const [queued,setQueued]=useState(0)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const load=useCallback(async()=>{try{const r=await fetch(`/api/neighbor-letters?code=${encodeURIComponent(code)}`,{cache:'no-store'});if(!r.ok)return;const j=await r.json();setEligible(j.phase==='night'&&j.locationClosed&&j.homeRecipients>0);setQueued((j.letters??[]).filter((l:{status:string})=>l.status==='approved').length)}catch{}},[code])
 useEffect(()=>{void load();const t=setInterval(()=>void load(),5000);return()=>clearInterval(t)},[load])
 async function deliver(){if(!window.confirm('ส่งจดหมายที่อนุมัติแล้วให้ผู้ที่เลือกอยู่บ้าน?'))return;setBusy(true);setMessage('');try{const r=await fetch('/api/neighbor-letters',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,action:'deliver'})});const j=await r.json();if(!r.ok)throw Error(j.error??'แจกจดหมายไม่สำเร็จ');setMessage(`ส่งจดหมายแล้ว ${j.delivered} ฉบับ · รอส่ง ${j.queued} ฉบับ`);await load()}catch(e){setMessage(e instanceof Error?e.message:'แจกจดหมายไม่สำเร็จ')}finally{setBusy(false)}}
 if(!eligible||queued===0)return null
 return <div className="mt-3 rounded-lg border border-amber-700/50 bg-[#2b211a] p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-amber-200">✉️ ส่งจดหมายให้ผู้ที่อยู่บ้าน</h3><p className="mt-1 text-xs text-[#c9b9a3]">ปิดรับการเลือกแล้ว · มีจดหมายที่อนุมัติ {queued} ฉบับ</p></div><button type="button" disabled={busy} onClick={()=>void deliver()} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">{busy?'กำลังส่ง…':'แจกจดหมาย'}</button></div>{message&&<p role="status" className="mt-2 text-xs text-amber-100">{message}</p>}</div>
}
