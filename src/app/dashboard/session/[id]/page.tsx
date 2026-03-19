import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { SessionDashboard } from './session-dashboard'

// UUID v4 format validation to reject malformed IDs before hitting the database
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!UUID_REGEX.test(id)) {
    notFound()
  }

  const supabase = await createClient()

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

  return (
    <SessionDashboard 
      initialSession={session} 
      initialCourts={courts || []} 
      initialQueue={queueEntries || []} 
    />
  )
}
