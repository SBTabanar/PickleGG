import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { VenueDashboard } from './venue-dashboard'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!UUID_REGEX.test(id)) {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check venue membership
  const { data: member } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', id)
    .eq('user_id', user.id)
    .single()

  if (!member) notFound()

  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single()

  if (!venue) notFound()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('venue_id', id)
    .order('created_at', { ascending: false })

  const { data: members } = await supabase
    .from('venue_members')
    .select('*')
    .eq('venue_id', id)

  const memberIds = members?.map(m => m.user_id) || []
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', memberIds.length > 0 ? memberIds : ['none'])

  const profileMap: Record<string, string> = {}
  profiles?.forEach(p => {
    if (p.display_name) profileMap[p.id] = p.display_name
  })

  return (
    <VenueDashboard
      venue={venue}
      sessions={sessions || []}
      members={(members || []).map(m => ({
        ...m,
        displayName: profileMap[m.user_id] || m.user_id.slice(0, 8),
      }))}
      currentUserRole={member.role}
      userId={user.id}
    />
  )
}
