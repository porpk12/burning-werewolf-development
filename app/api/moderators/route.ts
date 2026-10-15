import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'

function admin() {
  return createAdminClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: Request) {
  const actor = await getModerator()
  if (!actor) return NextResponse.json({ error: 'ต้องมีสิทธิ์ผู้ดูแล' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  if (!userId) return NextResponse.json({ error: 'ต้องระบุผู้ใช้' }, { status: 400 })
  const { data, error } = await admin().auth.admin.getUserById(userId)
  if (error || !data.user) return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 })
  const { error: updateError } = await admin().auth.admin.updateUserById(userId, { app_metadata: { ...data.user.app_metadata, role: 'moderator' } })
  if (updateError) return NextResponse.json({ error: 'มอบสิทธิ์ไม่สำเร็จ' }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const actor = await getModerator()
  if (!actor) return NextResponse.json({ error: 'ต้องมีสิทธิ์ผู้ดูแล' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  if (!userId || userId === actor.id) return NextResponse.json({ error: 'ไม่สามารถถอดสิทธิ์บัญชีนี้ได้' }, { status: 400 })
  const { data, error } = await admin().auth.admin.getUserById(userId)
  if (error || !data.user) return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 })
  const { error: updateError } = await admin().auth.admin.updateUserById(userId, { app_metadata: { ...data.user.app_metadata, role: null } })
  if (updateError) return NextResponse.json({ error: 'ถอดสิทธิ์ไม่สำเร็จ' }, { status: 400 })
  return NextResponse.json({ ok: true })
}
