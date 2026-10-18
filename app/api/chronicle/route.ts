import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code')?.trim().toUpperCase() ?? ''
  if (!/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: 'รหัสห้องไม่ถูกต้อง' }, { status: 400 })
  const db = createClient(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: game } = await db.from('games').select('id,moderator_id,phase,winner,win_reason').eq('room_code',code).maybeSingle()
  if (!game) return NextResponse.json({ error: 'ไม่พบห้อง' }, { status: 404 })
  const mod = await getModerator()
  if (mod?.id !== game.moderator_id) {
    const token = request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`bwf_player_${game.id}=`))?.split('=').slice(1).join('=')
    if (!token) return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 })
    const hash = createHash('sha256').update(token).digest('hex')
    const { data: player } = await db.from('game_players').select('id').eq('game_id',game.id).eq('session_token_hash',hash).neq('status','removed').maybeSingle()
    if (!player) return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 })
  }
  if (game.phase !== 'finished') return NextResponse.json({ error: 'เปิดบันทึกได้เมื่อเกมจบแล้วเท่านั้น' }, { status: 409 })
  const [players, votes, exiles, choices, abilities, burns] = await Promise.all([
    db.from('game_players').select('id,display_name').eq('game_id',game.id),
    db.from('votes').select('round_number,voter_player_id,trust_target_player_id,distrust_target_player_id').eq('game_id',game.id),
    db.from('bw_exile_events').select('day_number,player_id').eq('game_id',game.id),
    db.from('night_location_choices').select('round_number,player_id,location_id,admitted').eq('game_id',game.id),
    db.from('night_ability_rounds').select('round_number,burn_outcome,burned_location').eq('game_id',game.id),
    db.from('night_burned_locations').select('round_number,location_id').eq('game_id',game.id),
  ])
  const failure = [players,votes,exiles,choices,abilities,burns].find(r=>r.error)
  if (failure?.error) return NextResponse.json({ error: failure.error.message }, { status: 500 })
  const names = new Map((players.data ?? []).map(p=>[p.id,p.display_name]))
  const rounds = [...new Set([...(votes.data ?? []).map(v=>v.round_number),...(choices.data ?? []).map(c=>c.round_number),...(abilities.data ?? []).map(a=>a.round_number)])].sort((a,b)=>a-b)
  const timeline = rounds.flatMap(round=>{
    const dayVotes=(votes.data??[]).filter(v=>v.round_number===round)
    const dayExiles=(exiles.data??[]).filter(e=>e.day_number===round)
    const nightChoices=(choices.data??[]).filter(c=>c.round_number===round)
    const nightAbility=(abilities.data??[]).find(a=>a.round_number===round)
    const nightBurns=(burns.data??[]).filter(b=>b.round_number===round)
    return [
      { title:`Day ${round}`, type:'day', votes:dayVotes.map(v=>({player:names.get(v.voter_player_id)??'?',trust:v.trust_target_player_id?names.get(v.trust_target_player_id):'ไม่มี',distrust:v.distrust_target_player_id?names.get(v.distrust_target_player_id):'ไม่มี'})), exiles:dayExiles.map(e=>names.get(e.player_id)??'?') },
      { title:`Night ${round}`, type:'night', choices:nightChoices.map(c=>({player:names.get(c.player_id)??'?',location:c.location_id,admitted:c.admitted})), burnOutcome:nightAbility?.burn_outcome??null, burnedLocations:nightBurns.map(b=>b.location_id) },
    ]
  })
  return NextResponse.json({ timeline, winner:game.winner, winReason:game.win_reason }, { headers: { 'Cache-Control':'no-store' } })
}
