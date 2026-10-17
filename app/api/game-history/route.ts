import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'

function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase server credentials are not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET() {
  const moderator = await getModerator()
  if (!moderator) return NextResponse.json({ error: 'เฉพาะ Moderator' }, { status: 403 })
  const admin = adminClient()
  const { data: rooms, error: roomsError } = await admin.from('games')
    .select('id,room_code,room_name,phase,round_number,created_at,started_at,finished_at,werewolf_count')
    .eq('moderator_id', moderator.id).order('created_at', { ascending: false })
  if (roomsError) return NextResponse.json({ error: 'โหลดห้องไม่สำเร็จ' }, { status: 500 })
  const ids = (rooms ?? []).map(room => room.id)
  if (!ids.length) return NextResponse.json({ rooms: [], history: [] })
  const { data: history, error: historyError } = await admin.from('game_round_history')
    .select('id,game_id,room_name,started_at,ended_at,phase_at_archive,round_number,player_count,werewolf_count,winner,win_reason')
    .in('game_id', ids).order('ended_at', { ascending: false }).limit(500)
  if (historyError) return NextResponse.json({ error: 'โหลดประวัติไม่สำเร็จ กรุณารัน SQL migration' }, { status: 500 })
  return NextResponse.json({ rooms, history })
}

export async function DELETE(request: Request) {
  const moderator = await getModerator()
  if (!moderator) return NextResponse.json({ error: 'เฉพาะ Moderator' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || !['round', 'room'].includes(body.action) || typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id))
    return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 })
  const admin = adminClient()
  if (body.action === 'round') {
    const { data: history } = await admin.from('game_round_history').select('id,game_id').eq('id', body.id).maybeSingle()
    if (!history) return NextResponse.json({ error: 'ไม่พบประวัติ' }, { status: 404 })
    const { data: room } = await admin.from('games').select('id').eq('id', history.game_id).eq('moderator_id', moderator.id).maybeSingle()
    if (!room) return NextResponse.json({ error: 'ไม่มีสิทธิ์ลบ' }, { status: 403 })
    const { error } = await admin.from('game_round_history').delete().eq('id', history.id).eq('game_id', room.id)
    if (error) return NextResponse.json({ error: 'ลบประวัติไม่สำเร็จ' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  const { data: room } = await admin.from('games').select('id,phase,room_code').eq('id', body.id).eq('moderator_id', moderator.id).maybeSingle()
  if (!room) return NextResponse.json({ error: 'ไม่พบห้องหรือไม่มีสิทธิ์ลบ' }, { status: 404 })
  if (room.phase !== 'lobby' && room.phase !== 'finished')
    return NextResponse.json({ error: 'ไม่สามารถลบห้องขณะเกมกำลังดำเนินอยู่ กรุณาจบเกมหรือ Restart ก่อน' }, { status: 409 })
  // FK ON DELETE CASCADE removes players, rounds and all associated game data.
  const { data: deleted, error } = await admin.from('games').delete()
    .eq('id', room.id).eq('moderator_id', moderator.id).in('phase', ['lobby','finished']).select('id').maybeSingle()
  if (error || !deleted) return NextResponse.json({ error: 'ลบห้องไม่สำเร็จ กรุณาตรวจสอบ foreign keys' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
