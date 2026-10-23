import { randomBytes, createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'

function db() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing server Supabase credentials')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
const pick = <T,>(items: T[]): T => items[randomBytes(4).readUInt32BE(0) % items.length]
const code = () => Array.from(randomBytes(6), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function GET(request: Request) {
  const mod = await getModerator()
  if (!mod) return fail('ต้องเข้าสู่ระบบ Moderator', 403)
  const room = new URL(request.url).searchParams.get('code')?.toUpperCase()
  if (!room) return fail('ระบุรหัสห้อง')
  const admin = db()
  const { data: game } = await admin.from('games').select('id,room_code,phase,round_number,werewolf_count,objectives_enabled,moderator_id').eq('room_code',room).eq('moderator_id',mod.id).maybeSingle()
  if (!game) return fail('ไม่พบห้องของคุณ',404)
  const { data: sandbox } = await admin.from('bw_sandbox_rooms').select('game_id, human_mode').eq('game_id',game.id).maybeSingle()
  if (!sandbox) return fail('ห้องนี้ไม่ใช่ห้องทดสอบ',403)
  const { data: players } = await admin.from('game_players').select('id,display_name,status,seat_number').eq('game_id',game.id).neq('status','removed').order('seat_number')
  const { data: roles } = await admin.from('game_roles').select('player_id,role').eq('game_id',game.id)
  return NextResponse.json({ game, sandbox, players: (players??[]).map(p=>({...p, role: roles?.find(r=>r.player_id===p.id)?.role??null})) }, {headers:{'Cache-Control':'no-store'}})
}

export async function POST(request: Request) {
  const mod = await getModerator()
  if (!mod) return fail('ต้องเข้าสู่ระบบ Moderator',403)
  const body = await request.json().catch(()=>null)
  const admin = db()
  if (body?.action === 'create') {
    const count = body.count
    const wolves = body.wolves
    if (!Number.isInteger(count) || count < 2 || count > 20 || !Number.isInteger(wolves) || wolves < 1 || wolves >= count || wolves > 4) return fail('กำหนดผู้เล่น 2–20 คน และหมาป่า 1–4 ตัว (ต้องน้อยกว่าผู้เล่น)')
    const human = body.mode === 'mixed'
    if (!['mixed','all'].includes(body.mode) || typeof body.objectives !== 'boolean') return fail('ตั้งค่าห้องไม่ถูกต้อง')
    let game: {id:string;room_code:string}|null = null
    for(let i=0;i<5;i++) {
      const {data,error}=await admin.from('games').insert({room_code:code(),room_name:'[TEST] Burning Werewolf',moderator_id:mod.id,ruleset_id:'burning-night',ruleset_version:'2.4',player_limit:null,werewolf_count:wolves,objectives_enabled:body.objectives}).select('id,room_code').single()
      if(!error) { game=data; break }
      if(error.code!=='23505') return fail(`สร้างห้องไม่สำเร็จ: ${error.message}`,500)
    }
    if(!game) return fail('สร้างรหัสห้องไม่สำเร็จ',500)
    const {error:markerError}=await admin.from('bw_sandbox_rooms').insert({game_id:game.id,moderator_id:mod.id,human_mode:human})
    if(markerError) {await admin.from('games').delete().eq('id',game.id);return fail(`บันทึกห้องทดสอบไม่สำเร็จ: ${markerError.message}`,500)}
    const botCount = human ? count-1 : count
    const rows=Array.from({length:botCount},(_,i)=>({game_id:game!.id,display_name:`Bot ${String(i+1).padStart(2,'0')}`,seat_number:i+1,session_token_hash:createHash('sha256').update(randomBytes(32)).digest('hex')}))
    const {error:botError}=await admin.from('game_players').insert(rows)
    if(botError) return fail(`สร้าง Bot ไม่สำเร็จ: ${botError.message}`,500)
    return NextResponse.json({ok:true,code:game.room_code,humanMode:human,botCount})
  }
  const room=typeof body?.code==='string'?body.code.trim().toUpperCase():''
  if(!/^[A-Z0-9]{6}$/.test(room)) return fail('รหัสห้องไม่ถูกต้อง')
  const {data:game}=await admin.from('games').select('id,phase,round_number,voting_closed,moderator_id').eq('room_code',room).eq('moderator_id',mod.id).maybeSingle()
  if(!game) return fail('ไม่พบห้องของคุณ',404)
  const {data:sandbox}=await admin.from('bw_sandbox_rooms').select('game_id').eq('game_id',game.id).maybeSingle()
  if(!sandbox) return fail('ไม่อนุญาตให้สุ่มข้อมูลในห้องเล่นจริง',403)
  if(body.action!=='fill') return fail('คำสั่งไม่ถูกต้อง')
  const {data:players,error:playerError}=await admin.from('game_players').select('id,display_name,status').eq('game_id',game.id).neq('status','removed')
  if(playerError) return fail(playerError.message,500)
  const bots=(players??[]).filter(p=>/^Bot \d+$/.test(p.display_name)&&p.status==='connected')
  const active=(players??[]).filter(p=>p.status==='connected')
  const {data:roles}=await admin.from('game_roles').select('player_id,role').eq('game_id',game.id)
  const wolfIds=new Set((roles??[]).filter(r=>r.role==='werewolf').map(r=>r.player_id))
  let filled=0
  const errors:string[]=[]
  if(game.phase==='day' && !game.voting_closed) {
    const {data:submitted}=await admin.from('votes').select('voter_player_id').eq('game_id',game.id).eq('round_number',game.round_number)
    const done=new Set((submitted??[]).map(v=>v.voter_player_id))
    for(const bot of bots.filter(b=>!done.has(b.id))) {
      const trustTargets=active.filter(p=>p.id!==bot.id&&(!wolfIds.has(bot.id)||!wolfIds.has(p.id)))
      const trust=trustTargets.length?pick([...trustTargets.map(p=>p.id),null]):null
      const distrust=pick([...active.map(p=>p.id),null])
      const {error}=await admin.rpc('submit_day_vote',{p_game_id:game.id,p_round_number:game.round_number,p_voter_player_id:bot.id,p_trust_target_player_id:trust,p_distrust_target_player_id:distrust})
      if(error) errors.push(`${bot.display_name}: ${error.message}`); else filled++
    }
  } else if(game.phase==='night') {
    const {data:closed}=await admin.from('night_location_rounds').select('closed').eq('game_id',game.id).eq('round_number',game.round_number).maybeSingle()
    if(closed?.closed) return fail('ปิดรับการเลือกสถานที่แล้ว',409)
    const {data:submitted}=await admin.from('night_location_choices').select('player_id').eq('game_id',game.id).eq('round_number',game.round_number)
    const done=new Set((submitted??[]).map(v=>v.player_id))
    const {data:burned}=await admin.from('night_burned_locations').select('location_id').eq('game_id',game.id)
    const burnedSet=new Set((burned??[]).map(b=>b.location_id))
    const total=(players??[]).length
    const locationIds=['library','fortress','brothel','tavern',...(total>=8?['church']:[]),...(total>=11?['market']:[])].filter(x=>!burnedSet.has(x))
    for(const bot of bots.filter(b=>!done.has(b.id))) {
      const location=pick(['home',...locationIds])
      let target:string|null=null
      if(location==='fortress') {const candidates=locationIds.filter(x=>x!=='fortress');if(!candidates.length) continue;target=pick(candidates)}
      if(location==='brothel') {const candidates=active.filter(p=>p.id!==bot.id);if(!candidates.length) continue;target=pick(candidates).id}
      const {error}=await admin.rpc('submit_night_location_choice',{p_game_id:game.id,p_player_id:bot.id,p_location_id:location,p_target_id:target})
      if(error) errors.push(`${bot.display_name}: ${error.message}`); else filled++
    }
  } else return fail('สุ่มส่งได้เฉพาะช่วง Day ที่ยังเปิดลงคะแนน หรือ Night ที่ยังเปิดเลือกสถานที่',409)
  return NextResponse.json({ok:errors.length===0,filled,errors})
}
