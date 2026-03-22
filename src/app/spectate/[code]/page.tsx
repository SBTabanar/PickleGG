import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { SpectatorView } from './spectator-view'

export default async function SpectatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const supabase = await createClient()

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("share_code", code)
    .single()

  if (!session) {
    notFound()
  }

  const { data: courts } = await supabase
    .from("courts")
    .select("*")
    .eq("session_id", session.id)
    .order("order_index", { ascending: true })

  const { data: activeGames } = await supabase
    .from("games")
    .select("*")
    .eq("session_id", session.id)
    .eq("status", "in_progress")

  const { data: completedGames } = await supabase
    .from("games")
    .select("*")
    .eq("session_id", session.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10)

  const { data: queueEntries } = await supabase
    .from("queue_entries")
    .select("*")
    .eq("session_id", session.id)
    .eq("status", "waiting")

  return (
    <SpectatorView
      session={session}
      initialCourts={courts || []}
      initialGames={activeGames || []}
      initialCompletedGames={completedGames || []}
      queueCount={queueEntries?.reduce((sum, e) => sum + e.player_ids.length, 0) || 0}
    />
  )
}
