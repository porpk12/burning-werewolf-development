import { ModCreateRoom } from '@/components/mod-create-room'
import { redirect } from 'next/navigation'
import { getModerator } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'

export default async function ModeratorPage() {
  const moderator = await getModerator()
  if (!moderator) redirect('/mod/login')
  const supabase = await createClient()
  const { data: games } = await supabase.from('games').select('id, room_code, phase, player_limit, lobby_open, created_at').eq('moderator_id', moderator.id).order('created_at', { ascending: false }).limit(20)
  return <main className="min-h-screen bg-[#170f0d] px-6 py-10 text-[#f2e4c9]"><div className="mx-auto max-w-5xl"><div className="flex items-center justify-between gap-4"><div><p className="text-xs tracking-[0.18em] text-[#d4a65a]">ศูนย์บัญชาการ</p><h1 className="mt-2 font-display text-3xl font-semibold">ห้องของผู้ดูแล</h1><p className="mt-2 text-sm text-[#988c83]">{moderator.email}</p></div><form action="/api/auth/logout" method="post"><button className="rounded-md border border-[#5e4737] px-4 py-2 text-sm text-[#d4a65a]">ออกจากระบบ</button></form></div><ModCreateRoom /><section className="mt-8 rounded-xl border border-[#4b3226] bg-[#211614] p-6"><h2 className="font-display text-xl">เกมล่าสุด</h2><div className="mt-4 flex flex-col gap-3">{games?.length ? games.map((game) => <div className="flex items-center justify-between rounded-md border border-[#3b2923] px-4 py-3" key={game.id}><div><p className="font-semibold">ห้อง #{game.room_code}</p><p className="text-xs text-[#988c83]">สถานะ {game.phase} · ผู้เล่น {game.player_limit} คน</p></div><span className="text-xs text-[#d4a65a]">{game.lobby_open ? 'เปิดรับผู้เล่น' : 'ปิดห้อง'}</span></div>) : <p className="text-sm text-[#988c83]">ยังไม่มีห้องเกม</p>}</div></section></div></main>
}
