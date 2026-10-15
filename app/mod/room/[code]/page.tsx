import { redirect } from 'next/navigation'
import { getModerator } from '@/lib/supabase/auth'
import { LobbyView } from '@/components/lobby-view'
export default async function ModRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const moderator = await getModerator()
  if (!moderator) redirect('/mod/login')
  const { code } = await params
  return <LobbyView code={code.toUpperCase()} moderator />
}
