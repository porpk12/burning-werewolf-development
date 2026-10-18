import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase configuration')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  const step = body?.step
  const completed = body?.completed
  const started = body?.started
  if (!/^[A-Z0-9]{6}$/.test(code) || !Number.isInteger(step) || step < 0 || step > 6 || typeof started !== 'boolean' || typeof completed !== 'boolean') return NextResponse.json({ error: 'ข้อมูลบทเรียนไม่ถูกต้อง' }, { status: 400 })
  const admin = db()
  const { data: game } = await admin.from('games').select('id, phase').eq('room_code', code).maybeSingle()
  if (!game) return NextResponse.json({ error: 'ไม่พบห้อง' }, { status: 404 })
  if (game.phase !== 'lobby') return NextResponse.json({ error: 'เกมเริ่มแล้ว ไม่สามารถเรียนต่อได้', phase: game.phase }, { status: 409 })
  const token = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`bwf_player_${game.id}=`))?.split('=').slice(1).join('=')
  if (!token) return NextResponse.json({ error: 'ต้องเข้าร่วมห้องก่อน' }, { status: 401 })
  const hash = createHash('sha256').update(token).digest('hex')
  const { data: player } = await admin.from('game_players').select('id').eq('game_id', game.id).eq('session_token_hash', hash).neq('status', 'removed').maybeSingle()
  if (!player) return NextResponse.json({ error: 'ไม่พบผู้เล่น' }, { status: 401 })
  const { data: saved, error } = await admin.from('bw_tutorial_progress').upsert({ game_id: game.id, player_id: player.id, step, started, completed, updated_at: new Date().toISOString() }, { onConflict: 'player_id' }).select('step, started, completed').single()
  if (error) return NextResponse.json({ error: 'บันทึกความคืบหน้าไม่สำเร็จ กรุณาติดตั้ง SQL Migration' }, { status: 500 })
  return NextResponse.json({ progress: saved }, { headers: { 'Cache-Control': 'no-store' } })
}
