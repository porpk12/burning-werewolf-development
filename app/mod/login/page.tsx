'use client'

import { FormEvent, useState } from 'react'
import { Flame, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ModeratorLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (event.nativeEvent instanceof SubmitEvent && (event.nativeEvent as SubmitEvent).submitter === null) return
    setBusy(true); setError('')
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const result = await response.json().catch(() => null)
    if (!response.ok) { setError(result?.error ?? 'เข้าสู่ระบบไม่สำเร็จ'); setBusy(false); return }
    router.replace('/mod'); router.refresh()
  }

  return <main className="min-h-screen bg-[#170f0d] px-6 py-12 text-[#f2e4c9]">
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="mb-8 flex items-center gap-3"><div className="brand-mark"><Flame /></div><div><p className="font-display text-lg font-semibold tracking-[0.08em]">BURNING</p><p className="text-[10px] tracking-[0.33em] text-[#d4a65a]">WEREWOLF</p></div></div>
      <section className="rounded-xl border border-[#4b3226] bg-[#211614] p-7 shadow-2xl">
        <p className="text-xs tracking-[0.18em] text-[#d4a65a]">ศูนย์บัญชาการ</p><h1 className="mt-2 font-display text-3xl font-semibold">เข้าสู่ระบบผู้ดูแล</h1><p className="mt-2 text-sm text-[#988c83]">ใช้บัญชีที่ได้รับสิทธิ์ผู้ดูแลเกมเท่านั้น</p>
        <form className="mt-7 flex flex-col gap-4" onSubmit={submit}>
          <label className="flex flex-col gap-2 text-sm">อีเมล<input className="rounded-md border border-[#5e4737] bg-[#170f0d] px-3 py-3 outline-none focus:border-[#d4a65a]" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="flex flex-col gap-2 text-sm">รหัสผ่าน<input className="rounded-md border border-[#5e4737] bg-[#170f0d] px-3 py-3 outline-none focus:border-[#d4a65a]" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <p role="alert" className="text-sm text-[#f0785d]">{error}</p>}
          <button disabled={busy} className="mt-2 flex h-11 items-center justify-center gap-2 rounded-md bg-[#b94728] font-semibold text-[#fff3dd] hover:bg-[#d05b35] disabled:opacity-60">{busy && <LoaderCircle className="size-4 animate-spin" />}เข้าสู่ศูนย์บัญชาการ</button>
        </form>
      </section>
    </div>
  </main>
}
