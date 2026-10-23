import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'
function dbClient(){return createClient(process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}})}
async function context(request:Request,code:string){
 if(!/^[A-Z0-9]{6}$/.test(code)) return null
 const db=dbClient();const {data:game}=await db.from('games').select('id,phase,moderator_id').eq('room_code',code).maybeSingle();if(!game)return null
 const mod=await getModerator();const isModerator=mod?.id===game.moderator_id
 if(!isModerator){const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`bwf_player_${game.id}=`))?.split('=').slice(1).join('=');if(!token)return null;const hash=createHash('sha256').update(token).digest('hex');const {data:player}=await db.from('game_players').select('id').eq('game_id',game.id).eq('session_token_hash',hash).neq('status','removed').maybeSingle();if(!player)return null}
 return {db,game,isModerator}
}
export async function GET(request:Request){
 const code=new URL(request.url).searchParams.get('code')?.trim().toUpperCase()??'';const ctx=await context(request,code)
 if(!ctx)return NextResponse.json({error:'ไม่มีสิทธิ์'},{status:403})
 const {data,error}=await ctx.db.from('bw_discussion_timers').select('*').eq('game_id',ctx.game.id).maybeSingle()
 if(error)return NextResponse.json({error:error.message},{status:500})
 return NextResponse.json({timer:data,serverNow:Date.now(),isModerator:ctx.isModerator},{headers:{'Cache-Control':'no-store'}})
}
export async function POST(request:Request){
 const body=await request.json().catch(()=>null);const code=typeof body?.code==='string'?body.code.trim().toUpperCase():'';const ctx=await context(request,code)
 if(!ctx?.isModerator)return NextResponse.json({error:'เฉพาะ Moderator'},{status:403})
 if(!['start','pause','resume','extend','end'].includes(body?.action))return NextResponse.json({error:'คำสั่งไม่ถูกต้อง'},{status:400})
 if(!['day','night','night_zero'].includes(ctx.game.phase))return NextResponse.json({error:'เกมยังไม่อยู่ในช่วงที่สนทนาได้'},{status:409})
 const {data:timer}=await ctx.db.from('bw_discussion_timers').select('*').eq('game_id',ctx.game.id).maybeSingle()
 const now=Date.now();const remaining=timer?.ends_at?Math.max(0,Math.ceil((Date.parse(timer.ends_at)-now)/1000)):(timer?.remaining_seconds??0)
 let next:Record<string,unknown>
 if(body.action==='start'){
  const seconds=Number(body.seconds);if(!Number.isInteger(seconds)||seconds<30||seconds>3600)return NextResponse.json({error:'กำหนดเวลา 30–3600 วินาที'},{status:400})
  const target=body.targetPhase;if(target!=='day'&&target!=='night')return NextResponse.json({error:'ช่วงสนทนาไม่ถูกต้อง'},{status:400})
  if(target!==(ctx.game.phase==='day'?'night':'day'))return NextResponse.json({error:'ช่วงสนทนาไม่ตรงกับ Phase ถัดไป'},{status:409})
  next={target_phase:target,duration_seconds:seconds,remaining_seconds:seconds,ends_at:new Date(now+seconds*1000).toISOString()}
 }else{
  if(!timer)return NextResponse.json({error:'ยังไม่มีนาฬิกา'},{status:409})
  if(body.action==='pause')next={remaining_seconds:remaining,ends_at:null}
  else if(body.action==='resume')next={remaining_seconds:remaining,ends_at:remaining?new Date(now+remaining*1000).toISOString():null}
  else if(body.action==='extend')next={remaining_seconds:Math.min(3600,remaining+10),ends_at:timer.ends_at?new Date(now+(remaining+10)*1000).toISOString():null}
  else next={remaining_seconds:0,ends_at:null}
 }
 // Non-start actions must UPDATE the existing row. UPSERT with a partial payload
 // tries an INSERT without target_phase and violates its NOT NULL constraint.
 const payload={...next,updated_at:new Date().toISOString()}
 const {error}=body.action==='start'
  ? await ctx.db.from('bw_discussion_timers').upsert({game_id:ctx.game.id,...payload},{onConflict:'game_id'})
  : await ctx.db.from('bw_discussion_timers').update(payload).eq('game_id',ctx.game.id)
 if(error)return NextResponse.json({error:error.message},{status:500})
 return NextResponse.json({ok:true})
}
