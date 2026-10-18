import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'

export async function POST(request: Request) {
  const moderator = await getModerator()
  if (!moderator) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบ Moderator' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (!/^[A-Z0-9]{6}$/.test(code) || !['back', 'forward'].includes(body?.direction)) return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 })
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า Supabase ฝั่งเซิร์ฟเวอร์' }, { status: 500 })
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: game, error: lookupError } = await admin.from('games').select('id').eq('room_code', code).eq('moderator_id', moderator.id).maybeSingle()
  if (lookupError || !game) return NextResponse.json({ error: 'ไม่พบห้องของ Moderator' }, { status: 404 })
  const { data, error } = await admin.rpc('navigate_game_phase', { p_game_id: game.id, p_direction: body.direction })
  if (error) {
    console.error('Navigate phase failed', error)
    return NextResponse.json({ error: error.message.includes('Voting must be closed') ? 'ต้องปิดโหวตก่อนเปลี่ยนไปกลางคืน' : 'เปลี่ยน Phase ไม่สำเร็จ กรุณาตรวจสอบ SQL และสถานะเกม' }, { status: 409 })
  }
  // A discussion belongs to the previous phase and must not leak into the next one.
  await admin.from('bw_discussion_timers').delete().eq('game_id', game.id)
  return NextResponse.json({ ok: true, result: data })
}
