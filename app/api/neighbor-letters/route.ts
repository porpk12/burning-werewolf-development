import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'
function dbClient(){const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Missing Supabase configuration');return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})}
async function auth(request:Request,code:string){
 if(!/^[A-Z0-9]{6}$/.test(code))return null
 const db=dbClient();const {data:game}=await db.from('games').select('id,phase,round_number,moderator_id').eq('room_code',code).maybeSingle();if(!game)return null
 const mod=await getModerator();const isMod=mod?.id===game.moderator_id
 let selfId:string|null=null
 if(!isMod){const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`bwf_player_${game.id}=`))?.split('=').slice(1).join('=');if(!token)return null;const hash=createHash('sha256').update(token).digest('hex');const {data:p}=await db.from('game_players').select('id').eq('game_id',game.id).eq('session_token_hash',hash).neq('status','removed').maybeSingle();if(!p)return null;selfId=p.id}
 return {db,game,isMod,selfId}
}
export async function GET(request:Request){
 const code=new URL(request.url).searchParams.get('code')?.toUpperCase()??'';const c=await auth(request,code);if(!c)return NextResponse.json({error:'ไม่มีสิทธิ์เข้าถึง'},{status:401});const {db,game,isMod,selfId}=c
 const {data:players}=await db.from('game_players').select('id,display_name,status').eq('game_id',game.id).neq('status','removed')
 const {data:letters,error}=await db.from('bw_neighbor_letters').select('id,author_id,round_number,body,reviewed_body,status,rejection_reason,recipient_id,delivered_round,created_at').eq('game_id',game.id).order('created_at')
 if(error)return NextResponse.json({error:error.message},{status:500})
 const relevant=isMod?letters:(letters??[]).filter(x=>x.author_id===selfId||x.recipient_id===selfId&&x.status==='delivered')
 return NextResponse.json({round:game.round_number,phase:game.phase,players:isMod?players:undefined,letters:relevant?.map(x=>isMod||x.author_id===selfId?x:{id:x.id,round_number:x.round_number,reviewed_body:x.reviewed_body??x.body,status:x.status,delivered_round:x.delivered_round})},{headers:{'Cache-Control':'no-store'}})
}
export async function POST(request:Request){
 const body=await request.json().catch(()=>null);const code=typeof body?.code==='string'?body.code.trim().toUpperCase():'';const c=await auth(request,code);if(!c)return NextResponse.json({error:'ไม่มีสิทธิ์เข้าถึง'},{status:401});const {db,game,isMod,selfId}=c
 if(body?.action==='write'){
  if(isMod||!selfId||game.phase!=='night')return NextResponse.json({error:'เขียนจดหมายได้เฉพาะผู้ถูกเนรเทศในช่วงกลางคืน'},{status:403})
  const {data:p}=await db.from('game_players').select('status').eq('id',selfId).eq('game_id',game.id).maybeSingle();if(p?.status!=='eliminated')return NextResponse.json({error:'เฉพาะผู้ถูกเนรเทศ'},{status:403})
  const content=typeof body.text==='string'?body.text.trim():'';if(!content||content.length>1000)return NextResponse.json({error:'จดหมายต้องยาว 1–1000 ตัวอักษร'},{status:400})
  const {data:existing}=await db.from('bw_neighbor_letters').select('id,status').eq('game_id',game.id).eq('author_id',selfId).eq('round_number',game.round_number).maybeSingle()
  if(existing&&existing.status!=='rejected')return NextResponse.json({error:'คืนนี้ส่งจดหมายไปแล้ว กรุณารอ Moderator'},{status:409})
  const values={game_id:game.id,author_id:selfId,round_number:game.round_number,body:content,status:'pending',reviewed_body:null,rejection_reason:null}
  const result=existing?await db.from('bw_neighbor_letters').update(values).eq('id',existing.id).eq('status','rejected'):await db.from('bw_neighbor_letters').insert(values)
  if(result.error)return NextResponse.json({error:result.error.message},{status:409});return NextResponse.json({ok:true})
 }
 if(!isMod)return NextResponse.json({error:'เฉพาะ Moderator'},{status:403})
 if(body?.action==='review'){
  if(typeof body.id!=='string'||!['approved','rejected'].includes(body.status))return NextResponse.json({error:'ข้อมูลไม่ถูกต้อง'},{status:400})
  const reviewed=typeof body.text==='string'?body.text.trim():'';const reason=typeof body.reason==='string'?body.reason.trim():''
  if(body.status==='approved'&&(!reviewed||reviewed.length>1000))return NextResponse.json({error:'กรุณากรอกข้อความที่อนุมัติ'},{status:400})
  if(body.status==='rejected'&&!reason)return NextResponse.json({error:'กรุณาระบุเหตุผลที่ส่งกลับ'},{status:400})
  const {error}=await db.from('bw_neighbor_letters').update({status:body.status,reviewed_body:body.status==='approved'?reviewed:null,rejection_reason:body.status==='rejected'?reason:null}).eq('id',body.id).eq('game_id',game.id).in('status',['pending','rejected','approved']);if(error)return NextResponse.json({error:error.message},{status:409});return NextResponse.json({ok:true})
 }
 if(body?.action==='deliver'){
  if(game.phase!=='night')return NextResponse.json({error:'ส่งจดหมายได้เฉพาะช่วงกลางคืน'},{status:409})
  const {data:choices,error:choiceError}=await db.from('night_location_choices').select('player_id').eq('game_id',game.id).eq('round_number',game.round_number).eq('location_id','home')
  if(choiceError)return NextResponse.json({error:choiceError.message},{status:409})
  const {data:round}=await db.from('night_location_rounds').select('closed').eq('game_id',game.id).eq('round_number',game.round_number).maybeSingle()
  if(!round?.closed)return NextResponse.json({error:'ต้องปิดการเลือกสถานที่ก่อนส่งจดหมาย'},{status:409})
  const {data:sent}=await db.from('bw_neighbor_letters').select('recipient_id').eq('game_id',game.id).eq('delivered_round',game.round_number).eq('status','delivered')
  const used=new Set((sent??[]).map(x=>x.recipient_id));const homes=[...new Set((choices??[]).map(x=>x.player_id))].filter(x=>!used.has(x))
  const {data:queue}=await db.from('bw_neighbor_letters').select('id').eq('game_id',game.id).eq('status','approved').order('created_at')
  let delivered=0
  for(const item of queue??[]){if(!homes.length)break;const index=Math.floor(Math.random()*homes.length);const recipient=homes.splice(index,1)[0];const {error}=await db.from('bw_neighbor_letters').update({status:'delivered',recipient_id:recipient,delivered_round:game.round_number}).eq('id',item.id).eq('status','approved');if(error)return NextResponse.json({error:error.message},{status:409});delivered++}
  return NextResponse.json({ok:true,delivered,queued:(queue?.length??0)-delivered})
 }
 return NextResponse.json({error:'คำสั่งไม่ถูกต้อง'},{status:400})
}
