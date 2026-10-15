import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'

function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase server credentials missing')
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code')?.trim().toUpperCase() ?? ''
  if (!/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: 'รหัสห้องไม่ถูกต้อง' }, { status: 400 })
  const admin = adminClient()
  const { data: game, error: gameError } = await admin.from('games').select('id, room_code, phase, player_limit, werewolf_count, lobby_open, moderator_id').eq('room_code', code).maybeSingle()
  if (gameError || !game) return NextResponse.json({ error: 'ไม่พบห้อง' }, { status: 404 })
  const moderator = await getModerator()
  const isOwner = moderator?.id === game.moderator_id
  let selfId: string | null = null
  if (!isOwner) {
    const token = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`bwf_player_${game.id}=`))?.split('=').slice(1).join('=')
    if (!token) return NextResponse.json({ error: 'ต้องเข้าร่วมห้องก่อน' }, { status: 401 })
    const hash = createHash('sha256').update(token).digest('hex')
    const { data: player } = await admin.from('game_players').select('id').eq('game_id', game.id).eq('session_token_hash', hash).neq('status', 'removed').maybeSingle()
    if (!player) return NextResponse.json({ error: 'ไม่พบเซสชันผู้เล่น กรุณาเข้าร่วมใหม่' }, { status: 401 })
    selfId = player.id
  }
  const { data: players, error } = await admin.from('game_players').select('id, display_name, seat_number, status').eq('game_id', game.id).neq('status', 'removed').order('seat_number')
  if (error) return NextResponse.json({ error: 'โหลดรายชื่อผู้เล่นไม่สำเร็จ' }, { status: 500 })
  return NextResponse.json({ game: { room_code: game.room_code, phase: game.phase, player_limit: game.player_limit, lobby_open: game.lobby_open }, players: players ?? [], isModerator: isOwner, selfId }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const moderator = await getModerator()
  if (!moderator) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบ Moderator' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (body?.action !== 'start' || !/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 })
  const admin = adminClient()
  const { data: game } = await admin.from('games').select('id, phase, player_limit, werewolf_count, moderator_id').eq('room_code', code).eq('moderator_id', moderator.id).maybeSingle()
  if (!game) return NextResponse.json({ error: 'ไม่พบห้องของผู้ดูแล' }, { status: 404 })
  if (game.phase !== 'lobby') return NextResponse.json({ error: 'ห้องนี้เริ่มเกมแล้ว' }, { status: 409 })
  const { data: players, error: playerError } = await admin.from('game_players').select('id').eq('game_id', game.id).neq('status', 'removed')
  if (playerError || !players) return NextResponse.json({ error: 'อ่านรายชื่อผู้เล่นไม่สำเร็จ' }, { status: 500 })
  if (players.length !== game.player_limit) return NextResponse.json({ error: `ต้องมีผู้เล่นครบ ${game.player_limit} คนก่อนเริ่มเกม (ขณะนี้ ${players.length} คน)` }, { status: 409 })
  if (game.werewolf_count >= players.length) return NextResponse.json({ error: 'จำนวนหมาป่าไม่ถูกต้อง' }, { status: 400 })
  // Claim the start transition first so repeated requests cannot assign roles twice.
  const { data: claimed, error: claimError } = await admin.from('games').update({ phase: 'night_zero', lobby_open: false, started_at: new Date().toISOString() }).eq('id', game.id).eq('phase', 'lobby').select('id').maybeSingle()
  if (claimError || !claimed) return NextResponse.json({ error: 'ห้องกำลังเริ่มเกมหรือเริ่มแล้ว' }, { status: 409 })
  const shuffled = [...players]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomBytes(4).readUInt32BE(0) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const { error: roleError } = await admin.from('game_roles').insert(shuffled.map((p, i) => ({ game_id: game.id, player_id: p.id, role: i < game.werewolf_count ? 'werewolf' : 'villager' })))
  if (roleError) {
    // Do not return to lobby automatically after a partial role-write failure.
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดระหว่างแจกบทบาท กรุณาหยุดและตรวจฐานข้อมูลก่อนเริ่มใหม่' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, phase: 'night_zero' })
}
