import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getModerator } from '@/lib/supabase/auth'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase server credentials are not configured')
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(6)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

function sessionHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')?.trim().toUpperCase() ?? ''
  if (!/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: 'รหัสห้องไม่ถูกต้อง' }, { status: 400 })
  const admin = getAdminClient()
  const { data: game } = await admin.from('games').select('id, room_code, room_name, phase, round_number, lobby_open, player_limit').eq('room_code', code).maybeSingle()
  if (!game) return NextResponse.json({ error: 'ไม่พบห้องนี้' }, { status: 404 })
  const token = request.headers.get('cookie')?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`bwf_player_${game.id}=`))?.split('=').slice(1).join('=')
  if (!token) return NextResponse.json({ error: 'ต้องเข้าร่วมห้องก่อน' }, { status: 401 })
  const { data: player } = await admin.from('game_players').select('id, game_id, display_name, seat_number, status').eq('game_id', game.id).eq('session_token_hash', sessionHash(token)).maybeSingle()
  if (!player || player.status === 'removed') return NextResponse.json({ error: 'คุณถูกนำออกจากห้องนี้แล้ว' }, { status: 403 })
  if (player.status === 'connected' || player.status === 'disconnected') {
    await admin.from('game_players').update({ last_seen_at: new Date().toISOString(), status: 'connected' }).eq('id', player.id).neq('status', 'removed')
  }
  return NextResponse.json({ game, player })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const action = body?.action

  if (action === 'create') {
    const moderator = await getModerator()
    if (!moderator) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบในฐานะผู้ดูแลก่อนสร้างห้อง' }, { status: 401 })
    const roomName = typeof body.roomName === 'string' ? body.roomName.trim() : ''
    if (!roomName || roomName.length > 80) return NextResponse.json({ error: 'กรุณาตั้งชื่อห้อง 1–80 ตัวอักษร' }, { status: 400 })
    const supabase = await createClient()

    const rulesetId = typeof body.rulesetId === 'string' ? body.rulesetId : 'burning-night'
    const rulesetVersion = typeof body.rulesetVersion === 'string' ? body.rulesetVersion : '2.4'
    const werewolfCount = body.werewolfCount === 1 || body.werewolfCount === 2 || body.werewolfCount === 3 || body.werewolfCount === 4 ? body.werewolfCount : 2

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await supabase.from('games').insert({
        room_code: roomCode(), room_name: roomName, moderator_id: moderator.id, ruleset_id: rulesetId, ruleset_version: rulesetVersion, player_limit: null, werewolf_count: werewolfCount,
      }).select('id, room_code, room_name, phase, player_limit, werewolf_count, lobby_open').single()
      if (!error) return NextResponse.json({ game: data }, { status: 201 })
      if (error.code !== '23505') return NextResponse.json({ error: 'สร้างห้องไม่สำเร็จ' }, { status: 400 })
    }
    return NextResponse.json({ error: 'ไม่สามารถสร้างรหัสห้องที่ไม่ซ้ำได้' }, { status: 503 })
  }

  if (action === 'join') {
    const code = typeof body.roomCode === 'string' ? body.roomCode.trim().toUpperCase() : ''
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
    if (!/^[A-Z0-9]{6}$/.test(code) || displayName.length < 1 || displayName.length > 32) return NextResponse.json({ error: 'ข้อมูลเข้าร่วมห้องไม่ถูกต้อง' }, { status: 400 })

    const { data: game } = await getAdminClient().from('games').select('id, room_name, player_limit, lobby_open, phase').eq('room_code', code).maybeSingle()
    if (!game || !game.lobby_open || game.phase !== 'lobby') return NextResponse.json({ error: 'ห้องนี้ไม่เปิดรับผู้เล่นแล้ว' }, { status: 404 })
    const { count } = await getAdminClient().from('game_players').select('id', { count: 'exact', head: true }).eq('game_id', game.id).neq('status', 'removed')

    const { data: existing } = await getAdminClient().from('game_players').select('id').eq('game_id', game.id).eq('display_name', displayName).neq('status', 'removed').maybeSingle()
    if (existing) return NextResponse.json({ error: 'ชื่อนี้ถูกใช้ในห้องแล้ว' }, { status: 409 })

    const token = randomBytes(32).toString('base64url')
    const { data: lastSeat, error: seatError } = await getAdminClient().from('game_players').select('seat_number').eq('game_id', game.id).neq('status', 'removed').order('seat_number', { ascending: false }).limit(1).maybeSingle()
    if (seatError) return NextResponse.json({ error: 'ไม่สามารถจัดลำดับผู้เล่นได้' }, { status: 500 })
    const seat = (lastSeat?.seat_number ?? 0) + 1
    const { data: player, error } = await getAdminClient().from('game_players').insert({ game_id: game.id, display_name: displayName, seat_number: seat, session_token_hash: sessionHash(token) }).select('id, game_id, display_name, seat_number, status').single()
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'ชื่อหรือหมายเลขผู้เล่นถูกใช้แล้ว กรุณาลองใหม่' : 'เข้าร่วมห้องไม่สำเร็จ' }, { status: error.code === '23505' ? 409 : 400 })

    const response = NextResponse.json({ player, roomName: game.room_name })
    response.cookies.set(`bwf_player_${game.id}`, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 })
    return response
  }

  if (action === 'leave') {
    const code = typeof body.roomCode === 'string' ? body.roomCode.trim().toUpperCase() : ''
    if (!/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: 'รหัสห้องไม่ถูกต้อง' }, { status: 400 })
    const admin = getAdminClient()
    const { data: game } = await admin.from('games').select('id').eq('room_code', code).maybeSingle()
    if (!game) return NextResponse.json({ error: 'ไม่พบห้อง' }, { status: 404 })
    const cookieName = `bwf_player_${game.id}`
    const token = request.headers.get('cookie')?.split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`))?.split('=').slice(1).join('=')
    if (!token) return NextResponse.json({ error: 'ไม่พบเซสชันของคุณ' }, { status: 401 })
    const { data: player } = await admin.from('game_players').select('id').eq('game_id', game.id).eq('session_token_hash', sessionHash(token)).neq('status', 'removed').maybeSingle()
    if (!player) return NextResponse.json({ error: 'คุณไม่ได้อยู่ในห้องนี้แล้ว' }, { status: 403 })
    const { data: left, error } = await admin.rpc('kick_player_and_reseat', { p_game_id: game.id, p_player_id: player.id })
    if (error) return NextResponse.json({ error: 'ออกจากห้องไม่สำเร็จ กรุณาตรวจสอบ SQL migration' }, { status: 500 })
    if (!left) return NextResponse.json({ error: 'คุณไม่ได้อยู่ในห้องนี้แล้ว' }, { status: 409 })
    const response = NextResponse.json({ ok: true })
    response.cookies.set(cookieName, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 })
    return response
  }

  return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 })
}
