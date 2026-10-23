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
  const { data: game, error: gameError } = await admin.from('games').select('id, room_code, room_name, phase, round_number, voting_closed, player_limit, werewolf_count, lobby_open, moderator_id, winner, win_reason, objectives_enabled, started_at').eq('room_code', code).maybeSingle()
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
  // Tutorial progress is public within this room, but contains no secret game information.
  const { data: tutorialRows, error: tutorialError } = await admin.from('bw_tutorial_progress')
    .select('player_id, step, started, completed').eq('game_id', game.id)
  if (tutorialError) return NextResponse.json({ error: 'โหลดสถานะ Tutorial ไม่สำเร็จ กรุณารัน SQL Migration Tutorial v2' }, { status: 500 })
  const tutorialProgress = Object.fromEntries((tutorialRows ?? []).map(row => [row.player_id, { step: row.step, started: row.started, completed: row.completed }]))
  // An exile is resolved at vote close, but only announced on entering the next Night.
  // Mask only *today's* new exiles while in Day; earlier exiles remain visible.
  const { data: exileEvents, error: exileError } = await admin.from('bw_exile_events')
    .select('player_id, day_number').eq('game_id', game.id)
  if (exileError) return NextResponse.json({ error: 'โหลดข้อมูลการประกาศเนรเทศไม่สำเร็จ กรุณารัน SQL migration ล่าสุด' }, { status: 500 })
  const hiddenIds = new Set(game.phase === 'day' && !isOwner
    ? (exileEvents ?? []).filter(e => e.day_number === game.round_number).map(e => e.player_id)
    : [])
  const visiblePlayers = (players ?? []).map(p => hiddenIds.has(p.id) ? { ...p, status: 'connected' } : p)
  const latestExiles = game.phase === 'night' && !isOwner
    ? (exileEvents ?? []).filter(e => e.day_number === game.round_number).map(e => e.player_id)
    : []
  const latestExileNames = (players ?? []).filter(p => latestExiles.includes(p.id)).map(p => p.display_name)
  // Only the room moderator receives all roles; regular players receive only their own.
  let moderatorRoles: Record<string, string> | undefined
  if (isOwner && game.phase !== 'lobby') {
    const { data: roles, error: rolesError } = await admin.from('game_roles').select('player_id, role').eq('game_id', game.id)
    if (rolesError) return NextResponse.json({ error: 'โหลดบทบาทผู้เล่นไม่สำเร็จ' }, { status: 500 })
    moderatorRoles = Object.fromEntries((roles ?? []).map(r => [r.player_id, r.role]))
  }
  // Only the authenticated player may receive their own secret role.
  let ownRole: 'werewolf' | 'villager' | null = null
  let teammates: string[] = []
  if (!isOwner && selfId && game.phase !== 'lobby') {
    const { data: roleRow, error: roleError } = await admin.from('game_roles').select('role').eq('game_id', game.id).eq('player_id', selfId).maybeSingle()
    if (roleError) return NextResponse.json({ error: 'อ่านบทบาทของคุณไม่สำเร็จ' }, { status: 500 })
    if (roleRow?.role === 'werewolf' || roleRow?.role === 'villager') ownRole = roleRow.role
    if (ownRole === 'werewolf') {
      const { data: wolves, error: wolvesError } = await admin.from('game_roles').select('player_id').eq('game_id', game.id).eq('role', 'werewolf')
      if (wolvesError) return NextResponse.json({ error: 'อ่านข้อมูลทีมไม่สำเร็จ' }, { status: 500 })
      const wolfIds = (wolves ?? []).map(wolf => wolf.player_id).filter(id => id !== selfId)
      teammates = (players ?? []).filter(player => wolfIds.includes(player.id)).map(player => player.display_name)
    }
  }
  const { count: burnedCount, error: burnedError } = await admin.from('night_burned_locations')
    .select('location_id', { count: 'exact', head: true }).eq('game_id', game.id)
  const { data: objectives, error: objectiveError } = game.objectives_enabled && game.phase !== 'lobby'
    ? await admin.rpc('bw_objective_status', { p_game_id: game.id }) : { data: [], error: null }
  if (objectiveError) return NextResponse.json({ error: 'โหลดเป้าหมายลับไม่สำเร็จ กรุณาตรวจสอบ SQL Migration' }, { status: 500 })
  const visibleObjectives = isOwner ? (objectives ?? []) : (objectives ?? []).filter((o: {player_id:string}) => o.player_id === selfId)
  let submissionStatus: { submitted: string[]; pending: string[]; phase: string } | undefined
  if (isOwner && (game.phase === 'day' || game.phase === 'night')) {
    const table = game.phase === 'day' ? 'votes' : 'night_location_choices'
    const column = game.phase === 'day' ? 'voter_player_id' : 'player_id'
    const { data: submissions, error: submissionsError } = await admin.from(table)
      .select(column).eq('game_id', game.id).eq('round_number', game.round_number)
    if (submissionsError) return NextResponse.json({ error: 'โหลดสถานะการส่งไม่สำเร็จ' }, { status: 500 })
    const ids = new Set((submissions ?? []).map(row => String((row as Record<string, unknown>)[column])))
    const active = (players ?? []).filter(player => player.status === 'connected')
    submissionStatus = { phase: game.phase, submitted: active.filter(player => ids.has(player.id)).map(player => player.display_name), pending: active.filter(player => !ids.has(player.id)).map(player => player.display_name) }
  }
  return NextResponse.json({ submissionStatus, objectives: visibleObjectives, game: { room_code: game.room_code, room_name: game.room_name, phase: game.phase, round_number: game.round_number, voting_closed: game.voting_closed, player_limit: game.player_limit, werewolf_count: game.werewolf_count, lobby_open: game.lobby_open, winner: game.winner, win_reason: game.win_reason, objectives_enabled: game.objectives_enabled, started_at: game.started_at }, players: isOwner ? (players ?? []) : visiblePlayers, tutorialProgress, latestExileNames: isOwner ? undefined : latestExileNames, burnedCount: burnedError ? 0 : (burnedCount ?? 0), isModerator: isOwner, selfId, ...(isOwner ? { moderatorRoles } : { ownRole, teammates }) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const moderator = await getModerator()
  if (!moderator) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบ Moderator' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (!['start', 'restart', 'settings', 'kick'].includes(body?.action) || !/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 })
  const admin = adminClient()
  const { data: game } = await admin.from('games').select('id, phase, player_limit, werewolf_count, moderator_id').eq('room_code', code).eq('moderator_id', moderator.id).maybeSingle()
  if (!game) return NextResponse.json({ error: 'ไม่พบห้องของผู้ดูแล' }, { status: 404 })
  if (body.action === 'kick') {
    const playerId = typeof body.playerId === 'string' ? body.playerId : ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId)) {
      return NextResponse.json({ error: 'รหัสผู้เล่นไม่ถูกต้อง' }, { status: 400 })
    }
    // One database transaction kicks and compacts lobby seats safely.
    const { data: kicked, error: kickError } = await admin.rpc('kick_player_and_reseat', {
      p_game_id: game.id, p_player_id: playerId,
    })
    if (kickError) {
      console.error('Kick player failed:', kickError)
      return NextResponse.json({ error: 'เตะผู้เล่นไม่สำเร็จ กรุณารัน SQL migration สำหรับจัดลำดับที่นั่ง' }, { status: 500 })
    }
    if (!kicked) return NextResponse.json({ error: 'ไม่พบผู้เล่นที่ยังอยู่ในห้อง' }, { status: 404 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === 'settings') {
    if (game.phase !== 'lobby') return NextResponse.json({ error: 'ตั้งค่าเกมได้เฉพาะตอนอยู่ Lobby' }, { status: 409 })
    const count = body.werewolfCount
    if (typeof body.objectivesEnabled !== 'boolean') return NextResponse.json({ error: 'สถานะ Secret Objectives ไม่ถูกต้อง' }, { status: 400 })
    if (!Number.isSafeInteger(count) || count < 1 || count > 1000) return NextResponse.json({ error: 'จำนวนหมาป่าต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 1000' }, { status: 400 })
    const { data: updated, error: updateError } = await admin.from('games')
      .update({ werewolf_count: count, objectives_enabled: body.objectivesEnabled }).eq('id', game.id).eq('phase', 'lobby').select('id').maybeSingle()
    if (updateError || !updated) return NextResponse.json({ error: 'บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 409 })
    return NextResponse.json({ ok: true, werewolfCount: count, objectivesEnabled: body.objectivesEnabled })
  }
  if (body.action === 'restart') {
    if (game.phase === 'lobby') return NextResponse.json({ error: 'ห้องอยู่ใน Lobby อยู่แล้ว' }, { status: 409 })
    // Preserve the previous round before the reset clears game data.
    const { error: archiveError } = await admin.rpc('archive_game_round', { p_game_id: game.id })
    if (archiveError) {
      console.error('Archive before restart failed:', archiveError)
      return NextResponse.json({ error: 'บันทึกประวัติเกมไม่สำเร็จ กรุณารัน SQL migration ก่อน Restart' }, { status: 500 })
    }
    // Atomic reset in PostgreSQL. Only the authenticated room moderator can reach this branch.
    const { error: resetError } = await admin.rpc('restart_game_in_same_room', { p_game_id: game.id })
    if (resetError) {
      console.error('Restart game failed:', resetError)
      return NextResponse.json({ error: 'รีเซ็ตเกมไม่สำเร็จ กรุณาตรวจสอบว่าได้รัน SQL migration แล้ว' }, { status: 500 })
    }
    // A restarted room always defaults to enabled; moderator can change it in the Lobby.
    const { error: objectivesResetError } = await admin.from('games').update({ objectives_enabled: true }).eq('id', game.id).eq('phase', 'lobby')
    if (objectivesResetError) {
      console.error('Reset Secret Objectives default failed:', objectivesResetError)
      return NextResponse.json({ error: 'กลับสู่ Lobby แล้ว แต่รีเซ็ตค่า Secret Objectives ไม่สำเร็จ' }, { status: 500 })
    }
    await admin.from('bw_discussion_timers').delete().eq('game_id', game.id)
    return NextResponse.json({ ok: true, phase: 'lobby' })
  }
  if (game.phase !== 'lobby') return NextResponse.json({ error: 'ห้องนี้เริ่มเกมแล้ว' }, { status: 409 })
  const { data: players, error: playerError } = await admin.from('game_players').select('id').eq('game_id', game.id).neq('status', 'removed')
  if (playerError || !players) return NextResponse.json({ error: 'อ่านรายชื่อผู้เล่นไม่สำเร็จ' }, { status: 500 })
  if (players.length < 2 || players.length > 20) return NextResponse.json({ error: 'รองรับผู้เล่น 2–20 คน' }, { status: 409 })
  if (game.werewolf_count < 1 || game.werewolf_count >= players.length) return NextResponse.json({ error: `จำนวนผู้เล่นต้องมากกว่าจำนวนหมาป่า (${game.werewolf_count} คน)` }, { status: 400 })
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
