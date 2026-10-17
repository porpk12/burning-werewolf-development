import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code')?.trim().toUpperCase() ?? ''
  if (!/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: 'รหัสไม่ถูกต้อง' }, { status: 400 })
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'ระบบไม่พร้อม' }, { status: 503 })
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await admin.from('games').select('room_name,phase,lobby_open').eq('room_code', code).maybeSingle()
  if (error || !data || data.phase !== 'lobby' || !data.lobby_open) return NextResponse.json({ error: 'ไม่พบห้องที่เปิดรับผู้เล่น' }, { status: 404 })
  return NextResponse.json({ roomName: data.room_name }, { headers: { 'Cache-Control': 'no-store' } })
}
