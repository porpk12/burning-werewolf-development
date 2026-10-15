import { createClient } from '@/lib/supabase/server'

export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export function isModerator(user: { app_metadata?: Record<string, unknown> } | null) {
  return user?.app_metadata?.role === 'moderator'
}

export async function getModerator() {
  const user = await getAuthenticatedUser()
  return isModerator(user) ? user : null
}
