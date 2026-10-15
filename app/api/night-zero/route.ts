import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'

function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase server credentials missing')
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function roomCode(request: Request) {
  return new URL(request.url).searchParams.get('code')?.trim().toUpperCase() ?? ''
}

function playerToken(request: Request, gameId: string) {
  const cookieName = `bwf_player_${gameId}=`
  return request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName))?.slice(cookieName.length) ?? null
}

export async function GET(request: Request) {
  const code = roomCode(request)
  if (!/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: 'รหัสห้องไม่ถูกต้อง' }, { status: 400 })
  const admin = adminClient()
  const { data: game, error: gameError } = await admin.from('games').select('id, phase, moderator_id, round_number').eq('room_code', code).maybeSingle()
  if (gameError || !game) return NextResponse.json({ error: 'ไม่พบห้อง' }, { status: 404 })
  if (game.phase !== 'night_zero' && game.phase !== 'day') return NextResponse.json({ error: 'ยังไม่อยู่ในช่วงเปิดเผยบทบาท' }, { status: 409 })

  const moderator = await getModerator()
  if (moderator?.id === game.moderator_id) {
    const { count, error: countError } = await admin.from('game_players').select('id', { count: 'exact', head: true }).eq('game_id', game.id).neq('status', 'removed')
    const { count: roleCount, error: roleError } = await admin.from('game_roles').select('player_id', { count: 'exact', head: true }).eq('game_id', game.id)
    if (countError || roleError) return NextResponse.json({ error: 'อ่านสถานะบทบาทไม่สำเร็จ' }, { status: 500 })
    return NextResponse.json({ isModerator: true, phase: game.phase, playerCount: count ?? 0, roleCount: roleCount ?? 0 }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const token = playerToken(request, game.id)
  if (!token) return NextResponse.json({ error: 'กรุณาเข้าร่วมห้องก่อน' }, { status: 401 })
  const hash = createHash('sha256').update(token).digest('hex')
  const { data: player } = await admin.from('game_players').select('id').eq('game_id', game.id).eq('session_token_hash', hash).neq('status', 'removed').maybeSingle()
  if (!player) return NextResponse.json({ error: 'เซสชันผู้เล่นไม่ถูกต้อง' }, { status: 401 })
  const { data: ownRole, error: ownError } = await admin.from('game_roles').select('role').eq('game_id', game.id).eq('player_id', player.id).maybeSingle()
  if (ownError || !ownRole) return NextResponse.json({ error: 'ยังไม่ได้รับบทบาท กรุณาแจ้ง Moderator' }, { status: 409 })
  let teammates: string[] = []
  if (ownRole.role === 'werewolf') {
    const { data: wolves, error: wolvesError } = await admin.from('game_roles').select('player_id').eq('game_id', game.id).eq('role', 'werewolf')
    if (wolvesError) return NextResponse.json({ error: 'อ่านข้อมูลทีมไม่สำเร็จ' }, { status: 500 })
    const otherIds = (wolves ?? []).map(x => x.player_id).filter(id => id !== player.id)
    if (otherIds.length) {
      const { data: otherPlayers, error: namesError } = await admin.from('game_players').select('id, display_name').eq('game_id', game.id).in('id', otherIds)
      if (namesError) return NextResponse.json({ error: 'อ่านรายชื่อทีมไม่สำเร็จ' }, { status: 500 })
      teammates = (otherPlayers ?? []).map(x => x.display_name)
    }
  }
  return NextResponse.json({ isModerator: false, phase: game.phase, role: ownRole.role, teammates }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const moderator = await getModerator()
  if (!moderator) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบ Moderator' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (body?.action !== 'start_day' || !/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 })
  const admin = adminClient()
  const { data: game } = await admin.from('games').select('id, phase').eq('room_code', code).eq('moderator_id', moderator.id).maybeSingle()
  if (!game) return NextResponse.json({ error: 'ไม่พบห้องของผู้ดูแล' }, { status: 404 })
  if (game.phase !== 'night_zero') return NextResponse.json({ error: 'ห้องนี้ไม่ได้อยู่ใน Night 0' }, { status: 409 })
  const { count: players, error: playersError } = await admin.from('game_players').select('id', { count: 'exact', head: true }).eq('game_id', game.id).neq('status', 'removed')
  const { count: roles, error: rolesError } = await admin.from('game_roles').select('player_id', { count: 'exact', head: true }).eq('game_id', game.id)
  if (playersError || rolesError || !players || roles !== players) return NextResponse.json({ error: 'จำนวนบทบาทไม่ตรงกับจำนวนผู้เล่น กรุณาตรวจสอบก่อน' }, { status: 409 })
  const { data: updated, error } = await admin.from('games').update({ phase: 'day', round_number: 1 }).eq('id', game.id).eq('phase', 'night_zero').select('id').maybeSingle()
  if (error || !updated) return NextResponse.json({ error: 'เปลี่ยนเป็น Day 1 ไม่สำเร็จ' }, { status: 409 })
  return NextResponse.json({ ok: true, phase: 'day', round_number: 1 })
}
