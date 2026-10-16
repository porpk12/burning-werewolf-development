'use client'
import {useCallback,useEffect,useState} from 'react'
const names:Record<string,string>={library:'📚 ห้องสมุด',fortress:'🏰 ป้อมปราการ',brothel:'🍷 ซ่อง',tavern:'🍺 โรงเตี๊ยม',church:'⛪ โบสถ์',market:'🛒 ตลาด'}
export function SpecialLocationPanel({code,moderator}:{code:string;moderator:boolean}){
 const [data,setData]=useState<{announced:boolean;location?:string|null}|null>(null)
 const refresh=useCallback(async()=>{try{const r=await fetch(`/api/special-location?code=${encodeURIComponent(code)}`,{cache:'no-store'});if(r.ok)setData(await r.json())}catch{}},[code])
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer)},[refresh])
 if(!data?.announced)return null
 return <section className="mt-5 rounded-xl border border-amber-600 bg-[#231a13] p-4"><h2 className="font-semibold text-amber-200">❔ สถานที่พิเศษได้ปรากฏขึ้นแล้ว</h2><p className="mt-2 text-sm">หนึ่งในสถานที่ที่ยังเหลืออยู่เป็นสถานที่พิเศษ หากหมาป่าเผาสำเร็จจะชนะทันที</p>{moderator&&<p className="mt-3 rounded border border-red-700 bg-red-950/30 p-3 font-semibold text-red-200">🔒 เฉพาะ Moderator: {names[data.location??'']??data.location??'ไม่พบข้อมูล'}</p>}</section>
}
