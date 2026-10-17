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
  try {
    const admin = adminClient()
    // Select all avoids a hard failure when an older database has not yet
    // received the optional room_name column.
    const { data: rawRooms, error: roomsError } = await admin.from('games')
      .select('*').eq('moderator_id', moderator.id)
      .order('created_at', { ascending: false })
    if (roomsError) {
      console.error('Game history: rooms query failed', roomsError)
      return NextResponse.json({ error: `โหลดห้องไม่สำเร็จ (${roomsError.code ?? 'DB'}): ${roomsError.message}` }, { status: 500 })
    }
    const rooms = (rawRooms ?? []).map(room => ({
      id: room.id, room_code: room.room_code,
      room_name: room.room_name || `ห้อง ${room.room_code}`,
      phase: room.phase, round_number: room.round_number,
      created_at: room.created_at, started_at: room.started_at,
      finished_at: room.finished_at, werewolf_count: room.werewolf_count,
    }))
    const ids = rooms.map(room => room.id)
    if (!ids.length) return NextResponse.json({ rooms: [], history: [] })
    const { data: rawHistory, error: historyError } = await admin.from('game_round_history')
      .select('*').in('game_id', ids).order('ended_at', { ascending: false }).limit(500)
    if (historyError) {
      console.error('Game history: archive query failed', historyError)
      // Room management must remain accessible if the archive migration is
      // missing. Return the rooms, and warn about unavailable round history.
      return NextResponse.json({ rooms, history: [], warning:
        `โหลดประวัติรอบเก่าไม่ได้ (${historyError.code ?? 'DB'}): ${historyError.message} — ตรวจสอบ SQL Migration ของ Game History` })
    }
    const history = (rawHistory ?? []).map(round => ({
      id: round.id, game_id: round.game_id, room_name: round.room_name,
      started_at: round.started_at, ended_at: round.ended_at,
      phase_at_archive: round.phase_at_archive, round_number: round.round_number,
      player_count: round.player_count, werewolf_count: round.werewolf_count,
      winner: round.winner, win_reason: round.win_reason,
    }))
    return NextResponse.json({ rooms, history })
  } catch (error) {
    console.error('Game history GET unexpected error', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการโหลดห้อง' }, { status: 500 })
  }
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
  // Owner-only destructive action: caller must confirm the exact room code.
  if (body.confirmCode !== room.room_code)
    return NextResponse.json({ error: 'กรุณายืนยันด้วยรหัสห้องให้ตรงกัน' }, { status: 400 })
  // Database ON DELETE CASCADE removes dependent records, including active rounds.
  const { data: deleted, error } = await admin.from('games').delete()
    .eq('id', room.id).eq('moderator_id', moderator.id).select('id').maybeSingle()
  if (error || !deleted) {
    console.error('Failed to delete room', { roomId: room.id, code: error?.code, message: error?.message })
    return NextResponse.json({ error: error?.code === '23503' ? 'ลบห้องไม่สำเร็จ: มีข้อมูลที่อ้างอิงห้องนี้อยู่และยังไม่ได้ตั้งค่า ON DELETE CASCADE' : 'ลบห้องไม่สำเร็จ กรุณาตรวจสอบ Server Logs', code: error?.code }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
