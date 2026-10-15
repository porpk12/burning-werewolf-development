import { LobbyView } from '@/components/lobby-view'
export default async function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <LobbyView code={code.toUpperCase()} />
}
