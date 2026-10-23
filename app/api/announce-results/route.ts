import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'
export async function POST(request:Request){
 const {code}=await request.json().catch(()=>({code:null}))
 if(typeof code!=='string'||!/^[A-Z0-9]{6}$/.test(code))return NextResponse.json({error:'รหัสห้องไม่ถูกต้อง'},{status:400})
 const mod=await getModerator();if(!mod)return NextResponse.json({error:'ไม่มีสิทธิ์'},{status:403})
 const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return NextResponse.json({error:'Missing server configuration'},{status:500})
 const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
 const {data,error}=await db.from('games').update({results_announced:true}).eq('room_code',code).eq('moderator_id',mod.id).eq('phase','finished').not('winner','is',null).select('id').maybeSingle()
 if(error)return NextResponse.json({error:error.message},{status:500})
 if(!data)return NextResponse.json({error:'เกมยังไม่สิ้นสุด หรือไม่มีสิทธิ์ประกาศผล'},{status:409})
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}})
}
