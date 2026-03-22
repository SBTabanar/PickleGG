import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ManagerDashboard } from './manager-dashboard'
import { PlayerDashboard } from './player-dashboard'

// UUID v4 format validation to reject malformed IDs before hitting the database
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!UUID_REGEX.test(id)) {
    notFound()
  }

  const supabase = await createClient()

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single()

  if (!session) {
    notFound()
  }

  const { data: courts } = await supabase
    .from("courts")
    .select("*")
    .eq("session_id", id)
    .order("order_index", { ascending: true })

  const { data: queueEntries } = await supabase
    .from("queue_entries")
    .select("*")
    .eq("session_id", id)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true })

  // Record this user as a session participant (upsert to avoid duplicates)
  await supabase
    .from('session_participants')
    .upsert(
      { session_id: id, user_id: user.id },
      { onConflict: 'session_id,user_id' }
    )

  // Check if user is a manager: session creator or venue staff/owner
  let isManager = user.id === session.creator_id

  if (!isManager && session.venue_id) {
    const { data: member } = await supabase
      .from('venue_members')
      .select('role')
      .eq('venue_id', session.venue_id)
      .eq('user_id', user.id)
      .single()

    if (member) isManager = true
  }

  if (isManager) {
    return (
      <ManagerDashboard
        initialSession={session}
        initialCourts={courts || []}
        initialQueue={queueEntries || []}
        userId={user.id}
      />
    )
  }

  return (
    <PlayerDashboard
      initialSession={session}
      initialCourts={courts || []}
      initialQueue={queueEntries || []}
      userId={user.id}
    />
  )
}
