import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { SessionDashboard } from './session-dashboard'

export default async function SessionPage({ params }: { params: { id: string } }) {
  const { id } = await params
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
