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
 const {data:abilityRound}=await db.from('night_ability_rounds').select('resolved,burn_outcome,burned_location').eq('game_id',game.id).eq('round_number',game.round_number).maybeSingle()
 const {data:burnedRows}=await db.from('night_burned_locations').select('location_id').eq('game_id',game.id)
 const {data:messages}=await db.from('night_ability_messages').select('player_id,location_id,message,published').eq('game_id',game.id).eq('round_number',game.round_number)
 const {data:homeLetters}=selfId ? await db.from('bw_neighbor_letters').select('id').eq('game_id',game.id).eq('recipient_id',selfId).eq('delivered_round',game.round_number).eq('status','delivered').limit(1) : {data:[] as {id:string}[]}
 const {data:choices,error}=await db.from('night_location_choices').select('player_id,location_id,target_id,admitted').eq('game_id',game.id).eq('round_number',game.round_number)
 if(error) return NextResponse.json({error:'กรุณารัน SQL สำหรับระบบสถานที่ก่อน'},{status:500})
 const active=(players??[]).filter(x=>x.status==='connected')
 const mine=choices?.find(x=>x.player_id===selfId)
 return NextResponse.json({closed:round?.closed??false,selfId,abilityResolved:abilityRound?.resolved??false,burnOutcome:isModerator?abilityRound?.burn_outcome:null,burnedLocation:isModerator?abilityRound?.burned_location:null,burnedLocations:(isModerator||!abilityRound?.resolved?burnedRows??[]:(burnedRows??[]).filter(x=>x.location_id!==abilityRound?.burned_location)).map(x=>x.location_id),hasHomeLetter:Boolean(homeLetters?.length),hasExiledPlayers:(players??[]).some(x=>x.status==='eliminated'),messages:isModerator?messages:undefined,myMessage:messages?.find(x=>x.player_id===selfId&&x.published)?.message??null,wolves:isModerator?(await db.from('game_roles').select('player_id').eq('game_id',game.id).eq('role','werewolf')).data?.filter(r=>active.some(a=>a.id===r.player_id)).map(r=>({id:r.player_id,name:active.find(a=>a.id===r.player_id)?.display_name??'?'})):undefined,locations:locationsFor((players??[]).length),players:active.map(x=>({id:x.id,name:x.display_name})),mine:mine?{location:mine.location_id,target:mine.target_id,admitted:round?.closed?mine.admitted:null}:null,submittedCount:isModerator?choices?.length:undefined,results:isModerator&&round?.closed?choices?.map(x=>({...x,name:players?.find(p=>p.id===x.player_id)?.display_name??'?',target:x.target_id})):undefined},{headers:{'Cache-Control':'no-store'}})
}
export async function POST(request:Request){
 const body=await request.json().catch(()=>null)
 const code=typeof body?.code==='string'?body.code.trim().toUpperCase():''
 const ctx=await context(request,code)
 if(!ctx) return NextResponse.json({error:'ไม่พบห้องหรือเซสชัน'},{status:401})
 const {db,game,isModerator,selfId}=ctx
 if(game.phase!=='night') return NextResponse.json({error:'ยังไม่ใช่ช่วงกลางคืน'},{status:409})
 if(body?.action==='resolve'){
  if(!isModerator) return NextResponse.json({error:'เฉพาะ Moderator'},{status:403})
  if(body.burner!==null && typeof body.burner!=='string') return NextResponse.json({error:'ผู้เผาไม่ถูกต้อง'},{status:400})
  const {data,error}=await db.rpc('resolve_night_abilities',{p_game_id:game.id,p_burner:body.burner??null})
  if(error) return NextResponse.json({error:error.message},{status:409})
  return NextResponse.json({ok:true,result:data})
 }
 if(body?.action==='message'){
  if(!isModerator) return NextResponse.json({error:'เฉพาะ Moderator'},{status:403})
  if(typeof body.playerId!=='string'||typeof body.message!=='string'||body.message.length>2000) return NextResponse.json({error:'ข้อมูลไม่ถูกต้อง'},{status:400})
  const {data:round}=await db.from('night_ability_rounds').select('resolved').eq('game_id',game.id).eq('round_number',game.round_number).maybeSingle()
  if(!round?.resolved) return NextResponse.json({error:'ต้องตัดสินใจเรื่องการเผาก่อน'},{status:409})
  if(body.published&&body.message.trim()==='รอ Moderator ระบุเบาะแสลับ') return NextResponse.json({error:'กรุณาใส่เบาะแสห้องสมุดก่อนส่ง'},{status:400})
  const {error}=await db.from('night_ability_messages').update({message:body.message,published:Boolean(body.published)}).eq('game_id',game.id).eq('round_number',game.round_number).eq('player_id',body.playerId)
  if(error) return NextResponse.json({error:error.message},{status:409})
  return NextResponse.json({ok:true})
 }
 if(body?.action==='unpublish'){
  if(!isModerator) return NextResponse.json({error:'เฉพาะ Moderator'},{status:403})
  const {error}=await db.rpc('bw_undo_night_publication',{p_game_id:game.id,p_round:game.round_number})
  if(error) return NextResponse.json({error:error.message},{status:409})
  return NextResponse.json({ok:true})
 }
 if(body?.action==='publish'){
  if(!isModerator) return NextResponse.json({error:'เฉพาะ Moderator'},{status:403})
  if(!Array.isArray(body.messages)||body.messages.some((m:unknown)=>!m||typeof m!=='object'||typeof (m as {playerId?:unknown}).playerId!=='string'||typeof (m as {message?:unknown}).message!=='string'||(m as {message:string}).message.length>2000)) return NextResponse.json({error:'ข้อมูลผลความสามารถไม่ถูกต้อง'},{status:400})
  const {error}=await db.rpc('publish_night_ability_messages',{p_game_id:game.id,p_messages:body.messages.map((m:{playerId:string;message:string})=>({player_id:m.playerId,message:m.message}))})
  if(error) return NextResponse.json({error:error.message},{status:409})
  return NextResponse.json({ok:true})
 }
 if(body?.action==='close'){
  if(!isModerator) return NextResponse.json({error:'เฉพาะ Moderator'},{status:403})
  const {error}=await db.rpc('close_night_location_selection',{p_game_id:game.id})
  if(error){console.error('Close night locations:',error);return NextResponse.json({error:error.message},{status:409})}
  return NextResponse.json({ok:true})
 }
 if(body?.action!=='choose'||isModerator||!selfId) return NextResponse.json({error:'คำสั่งไม่ถูกต้อง'},{status:403})
 const {data:player}=await db.from('game_players').select('status').eq('id',selfId).eq('game_id',game.id).maybeSingle()
 if(player?.status!=='connected') return NextResponse.json({error:'ผู้ถูกเนรเทศไม่สามารถเลือกสถานที่ได้'},{status:403})
 const {count}=await db.from('game_players').select('id',{count:'exact',head:true}).eq('game_id',game.id).neq('status','removed')
 const valid=locationsFor(count??0)
 const {data:burned}=await db.from('night_burned_locations').select('location_id').eq('game_id',game.id)
 const location=body.location
 if(location!=='home'&&((burned??[]).some(x=>x.location_id===location)||!valid.some(x=>x.id===location))) return NextResponse.json({error:'สถานที่ไม่ถูกต้อง'},{status:400})
 let target:string|null=null
 if(location==='fortress'){
  if(!valid.some(x=>x.id===body.target&&x.id!=='fortress')||(burned??[]).some(x=>x.location_id===body.target)) return NextResponse.json({error:'กรุณาเลือกสถานที่ที่จะป้องกัน'},{status:400})
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
