import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'

function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing server credentials')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
function cookieToken(request: Request, gameId: string) {
  return request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`bwf_player_${gameId}=`))?.split('=').slice(1).join('=') ?? null
}
async function context(request: Request, code: string) {
  if (!/^[A-Z0-9]{6}$/.test(code)) return { error: 'รหัสห้องไม่ถูกต้อง', status: 400 } as const
  const db = adminClient()
  const { data: game, error } = await db.from('games').select('id, phase, round_number, moderator_id, voting_closed').eq('room_code', code).maybeSingle()
  if (error || !game) return { error: 'ไม่พบห้อง', status: 404 } as const
  const mod = await getModerator()
  const isModerator = mod?.id === game.moderator_id
  let playerId: string | null = null
  if (!isModerator) {
    const token = cookieToken(request, game.id)
    if (!token) return { error: 'กรุณาเข้าร่วมห้องก่อน', status: 401 } as const
    const hash = createHash('sha256').update(token).digest('hex')
    const { data: player } = await db.from('game_players').select('id').eq('game_id', game.id).eq('session_token_hash', hash).neq('status', 'removed').maybeSingle()
    if (!player) return { error: 'เซสชันผู้เล่นไม่ถูกต้อง', status: 401 } as const
    playerId = player.id
  }
  return { db, game, isModerator, playerId }
}
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code')?.trim().toUpperCase() ?? ''
  const ctx = await context(request, code)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { db, game, isModerator, playerId } = ctx
  if (game.phase !== 'day') return NextResponse.json({ error: 'ยังไม่ใช่ช่วงกลางวัน' }, { status: 409 })
  const { data: players, error: playerError } = await db.from('game_players').select('id, display_name, seat_number').eq('game_id', game.id).neq('status', 'removed').order('seat_number')
  if (playerError) return NextResponse.json({ error: 'โหลดรายชื่อไม่สำเร็จ' }, { status: 500 })
  const { data: rows, error: voteError } = await db.from('votes').select('voter_player_id, trust_target_player_id, distrust_target_player_id').eq('game_id', game.id).eq('round_number', game.round_number)
  if (voteError) return NextResponse.json({ error: 'โหลดคะแนนไม่สำเร็จ' }, { status: 500 })
  const { data: roles, error: rolesError } = await db.from('game_roles').select('player_id, role').eq('game_id', game.id)
  if (rolesError) return NextResponse.json({ error: 'โหลดสิทธิ์การโหวตไม่สำเร็จ' }, { status: 500 })
  const ownRole = roles?.find(r => r.player_id === playerId)?.role
  const blockedTrustIds = ownRole === 'werewolf' ? roles?.filter(r => r.role === 'werewolf').map(r => r.player_id) ?? [] : []
  const own = rows?.find(x => x.voter_player_id === playerId)
  const totals = isModerator ? (players ?? []).map(p => ({ id: p.id, name: p.display_name, trust: rows?.filter(v => v.trust_target_player_id === p.id).length ?? 0, distrust: rows?.filter(v => v.distrust_target_player_id === p.id).length ?? 0 })) : undefined
  const details = isModerator ? (rows ?? []).map(v => ({ voterId: v.voter_player_id, voterName: players?.find(p => p.id === v.voter_player_id)?.display_name ?? 'ไม่ทราบชื่อ', trust: v.trust_target_player_id, distrust: v.distrust_target_player_id })) : undefined
  const noTotals = isModerator ? { trust: rows?.filter(v => v.trust_target_player_id === null).length ?? 0, distrust: rows?.filter(v => v.distrust_target_player_id === null).length ?? 0 } : undefined
  return NextResponse.json({ votingClosed: game.voting_closed, details, noTotals, isModerator, round: game.round_number, selfId: playerId, players: players ?? [], blockedTrustIds: isModerator ? [] : blockedTrustIds, ownVote: own ? { trust: own.trust_target_player_id, distrust: own.distrust_target_player_id } : null, submittedCount: rows?.length ?? 0, totals }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  const ctx = await context(request, code)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { db, game, isModerator, playerId } = ctx
  if (game.phase !== 'day') return NextResponse.json({ error: 'ไม่อยู่ในช่วงลงคะแนน' }, { status: 409 })
  if (game.voting_closed) return NextResponse.json({ error: 'ปิดโหวตแล้ว ไม่สามารถแก้ไขคะแนนได้' }, { status: 409 })
  if (isModerator || !playerId) return NextResponse.json({ error: 'เฉพาะผู้เล่นเท่านั้นที่ลงคะแนนได้' }, { status: 403 })
  // null represents an explicit No vote; missing fields are invalid.
  const trust = body?.trust
  const distrust = body?.distrust
  if (!(trust === null || typeof trust === 'string' && trust.length > 0) ||
      !(distrust === null || typeof distrust === 'string' && distrust.length > 0)) {
    return NextResponse.json({ error: 'กรุณาเลือกผู้เล่นหรือ No ทั้งสองช่อง' }, { status: 400 })
  }
  if (trust === playerId) return NextResponse.json({ error: 'ไม่สามารถเชื่อใจตัวเองได้' }, { status: 400 })
  const ids = [...new Set([trust, distrust].filter((id): id is string => id !== null))]
  if (ids.length) {
    const { data: targets, error } = await db.from('game_players').select('id').eq('game_id', game.id).neq('status', 'removed').in('id', ids)
    if (error || targets?.length !== ids.length) return NextResponse.json({ error: 'ผู้ถูกโหวตไม่อยู่ในห้อง' }, { status: 400 })
  }
  if (trust !== null) {
    const { data: ownRole, error: ownRoleError } = await db.from('game_roles').select('role').eq('game_id', game.id).eq('player_id', playerId).maybeSingle()
    if (ownRoleError || !ownRole) return NextResponse.json({ error: 'ตรวจสอบบทบาทไม่สำเร็จ' }, { status: 500 })
    if (ownRole.role === 'werewolf') {
      const { data: targetRole, error: targetRoleError } = await db.from('game_roles').select('role').eq('game_id', game.id).eq('player_id', trust).maybeSingle()
      if (targetRoleError || !targetRole) return NextResponse.json({ error: 'ตรวจสอบบทบาทเป้าหมายไม่สำเร็จ' }, { status: 500 })
      if (targetRole.role === 'werewolf') return NextResponse.json({ error: 'หมาป่าไม่สามารถโหวตเชื่อใจหมาป่าด้วยกันได้' }, { status: 400 })
    }
  }
  const { error: saveError } = await db.rpc('submit_day_vote', { p_game_id: game.id, p_round_number: game.round_number, p_voter_player_id: playerId, p_trust_target_player_id: trust, p_distrust_target_player_id: distrust })
  if (saveError) return NextResponse.json({ error: 'บันทึกคะแนนไม่สำเร็จ' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  const ctx = await context(request, code)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { db, game, isModerator } = ctx
  if (!isModerator) return NextResponse.json({ error: 'เฉพาะ Moderator เท่านั้น' }, { status: 403 })
  if (game.phase !== 'day') return NextResponse.json({ error: 'ยังไม่ใช่ช่วงกลางวัน' }, { status: 409 })
  if (game.voting_closed) return NextResponse.json({ error: 'ปิดโหวตไปแล้ว' }, { status: 409 })
  const { data, error } = await db.from('games').update({ voting_closed: true }).eq('id', game.id).eq('phase', 'day').eq('voting_closed', false).select('id').maybeSingle()
  if (error) return NextResponse.json({ error: 'ปิดโหวตไม่สำเร็จ' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'ปิดโหวตไปแล้ว หรือสถานะเกมเปลี่ยน' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
