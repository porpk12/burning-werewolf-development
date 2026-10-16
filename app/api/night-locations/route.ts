import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'
import { locationsFor } from '@/lib/night-locations'

function admin() {
 const url=process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key) throw new Error('Missing Supabase credentials')
 return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
}
async function context(request:Request,code:string) {
 if(!/^[A-Z0-9]{6}$/.test(code)) return null
 const db=admin()
 const {data:game}=await db.from('games').select('id,phase,round_number,moderator_id').eq('room_code',code).maybeSingle()
 if(!game) return null
 const mod=await getModerator(); const isModerator=mod?.id===game.moderator_id
 let selfId:string|null=null
 if(!isModerator){
  const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`bwf_player_${game.id}=`))?.split('=').slice(1).join('=')
  if(!token) return null
  const hash=createHash('sha256').update(token).digest('hex')
  const {data:player}=await db.from('game_players').select('id').eq('game_id',game.id).eq('session_token_hash',hash).neq('status','removed').maybeSingle()
  if(!player) return null
  selfId=player.id
 }
 return {db,game,isModerator,selfId}
}
export async function GET(request:Request){
 const code=new URL(request.url).searchParams.get('code')?.trim().toUpperCase()??''
 const ctx=await context(request,code)
 if(!ctx) return NextResponse.json({error:'ไม่พบห้องหรือเซสชัน'},{status:401})
 const {db,game,isModerator,selfId}=ctx
 if(game.phase!=='night') return NextResponse.json({error:'ยังไม่ใช่ช่วงกลางคืน'},{status:409})
 const {data:players}=await db.from('game_players').select('id,display_name,status').eq('game_id',game.id).neq('status','removed')
 const {data:round}=await db.from('night_location_rounds').select('closed').eq('game_id',game.id).eq('round_number',game.round_number).maybeSingle()
 const {data:choices,error}=await db.from('night_location_choices').select('player_id,location_id,target_id,admitted').eq('game_id',game.id).eq('round_number',game.round_number)
 if(error) return NextResponse.json({error:'กรุณารัน SQL สำหรับระบบสถานที่ก่อน'},{status:500})
 const active=(players??[]).filter(x=>x.status==='connected')
 const mine=choices?.find(x=>x.player_id===selfId)
 return NextResponse.json({closed:round?.closed??false,selfId,locations:locationsFor(active.length),players:active.map(x=>({id:x.id,name:x.display_name})),mine:mine?{location:mine.location_id,target:mine.target_id,admitted:round?.closed?mine.admitted:null}:null,submittedCount:isModerator?choices?.length:undefined,results:isModerator&&round?.closed?choices?.map(x=>({...x,name:players?.find(p=>p.id===x.player_id)?.display_name??'?',target:x.target_id})):undefined},{headers:{'Cache-Control':'no-store'}})
}
export async function POST(request:Request){
 const body=await request.json().catch(()=>null)
 const code=typeof body?.code==='string'?body.code.trim().toUpperCase():''
 const ctx=await context(request,code)
 if(!ctx) return NextResponse.json({error:'ไม่พบห้องหรือเซสชัน'},{status:401})
 const {db,game,isModerator,selfId}=ctx
 if(game.phase!=='night') return NextResponse.json({error:'ยังไม่ใช่ช่วงกลางคืน'},{status:409})
 if(body?.action==='close'){
  if(!isModerator) return NextResponse.json({error:'เฉพาะ Moderator'},{status:403})
  const {error}=await db.rpc('close_night_location_selection',{p_game_id:game.id})
  if(error){console.error('Close night locations:',error);return NextResponse.json({error:error.message},{status:409})}
  return NextResponse.json({ok:true})
 }
 if(body?.action!=='choose'||isModerator||!selfId) return NextResponse.json({error:'คำสั่งไม่ถูกต้อง'},{status:403})
 const {data:player}=await db.from('game_players').select('status').eq('id',selfId).eq('game_id',game.id).maybeSingle()
 if(player?.status!=='connected') return NextResponse.json({error:'ผู้ถูกเนรเทศไม่สามารถเลือกสถานที่ได้'},{status:403})
 const {count}=await db.from('game_players').select('id',{count:'exact',head:true}).eq('game_id',game.id).eq('status','connected')
 const valid=locationsFor(count??0)
 const location=body.location
 if(location!=='home'&&!valid.some(x=>x.id===location)) return NextResponse.json({error:'สถานที่ไม่ถูกต้อง'},{status:400})
 let target:string|null=null
 if(location==='fortress'){
  if(!valid.some(x=>x.id===body.target&&x.id!=='fortress')) return NextResponse.json({error:'กรุณาเลือกสถานที่ที่จะป้องกัน'},{status:400})
  target=body.target
 }else if(location==='brothel'){
  if(typeof body.target!=='string'||body.target===selfId) return NextResponse.json({error:'กรุณาเลือกผู้เล่นคนอื่น'},{status:400})
  const {data:t}=await db.from('game_players').select('id').eq('id',body.target).eq('game_id',game.id).eq('status','connected').maybeSingle()
  if(!t) return NextResponse.json({error:'เป้าหมายไม่อยู่ในหมู่บ้าน'},{status:400})
  target=t.id
 }
 // Serialize submissions against moderator closing the night using a database RPC.
 const {error}=await db.rpc('submit_night_location_choice',{p_game_id:game.id,p_player_id:selfId,p_location_id:location,p_target_id:target})
 if(error){console.error('Choose night location:',error);return NextResponse.json({error:error.message},{status:409})}
 return NextResponse.json({ok:true})
}
