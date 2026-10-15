import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isModerator } from '@/lib/supabase/auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) return NextResponse.json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!isModerator(user)) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'บัญชีนี้ยังไม่ได้รับสิทธิ์ผู้ดูแลเกม' }, { status: 403 })
  }
  return NextResponse.json({ ok: true })
}
