'use server'

import { createClient } from '@/utils/supabase/server'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function createVenueAction(name: string, numCourts: number) {
  const { supabase, user } = await getUser()

  const trimmedName = name.trim()
  if (!trimmedName) return { error: 'Venue name is required' }
  if (trimmedName.length > 100) return { error: 'Venue name must be 100 characters or fewer' }
  if (numCourts < 1 || numCourts > 50) return { error: 'Number of courts must be between 1 and 50' }

  // Generate slug from name
  const baseSlug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .insert({
      name: trimmedName,
      slug,
      owner_id: user.id,
      num_courts: numCourts,
    })
    .select()
    .single()

  if (venueError) return { error: venueError.message }

  // Add owner as venue member
  await supabase.from('venue_members').insert({
    venue_id: venue.id,
    user_id: user.id,
    role: 'owner',
  })

  return { success: true, venue }
}

export async function getVenueAction(venueId: string) {
  const { supabase, user } = await getUser()

  // Check membership
  const { data: member } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'Not a member of this venue' }

  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single()

  if (!venue) return { error: 'Venue not found' }

  // Get sessions for this venue
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false })

  // Get venue members with profiles
  const { data: members } = await supabase
    .from('venue_members')
    .select('*')
    .eq('venue_id', venueId)

  const memberIds = members?.map(m => m.user_id) || []
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', memberIds.length > 0 ? memberIds : ['none'])

  const profileMap: Record<string, string> = {}
  profiles?.forEach(p => {
    if (p.display_name) profileMap[p.id] = p.display_name
  })

  return {
    venue,
    sessions: sessions || [],
    members: (members || []).map(m => ({
      ...m,
      displayName: profileMap[m.user_id] || m.user_id.slice(0, 8),
    })),
    currentUserRole: member.role,
  }
}

export async function inviteStaffAction(venueId: string, userId: string) {
  const { supabase, user } = await getUser()

  // Verify caller is owner
  const { data: member } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'owner') return { error: 'Only venue owners can invite staff' }

  // Check if already a member
  const { data: existing } = await supabase
    .from('venue_members')
    .select('id')
    .eq('venue_id', venueId)
    .eq('user_id', userId)
    .single()

  if (existing) return { error: 'User is already a member of this venue' }

  const { error } = await supabase.from('venue_members').insert({
    venue_id: venueId,
    user_id: userId,
    role: 'staff',
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function removeStaffAction(venueId: string, memberId: string) {
  const { supabase, user } = await getUser()

  // Verify caller is owner
  const { data: member } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'owner') return { error: 'Only venue owners can remove staff' }

  // Don't allow removing yourself as owner
  const { data: target } = await supabase
    .from('venue_members')
    .select('user_id, role')
    .eq('id', memberId)
    .single()

  if (target?.role === 'owner') return { error: 'Cannot remove the venue owner' }

  const { error } = await supabase
    .from('venue_members')
    .delete()
    .eq('id', memberId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function createVenueSessionAction(
  venueId: string,
  name: string,
  numCourts: number,
  scheduledStart?: string,
  scheduledEnd?: string,
  recurrence?: string
) {
  const { supabase, user } = await getUser()

  // Verify membership
  const { data: member } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'Not a member of this venue' }

  const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      name: name.trim(),
      creator_id: user.id,
      venue_id: venueId,
      status: 'active',
      share_code: shareCode,
      scheduled_start: scheduledStart || null,
      scheduled_end: scheduledEnd || null,
      recurrence: recurrence || null,
    })
    .select()
    .single()

  if (sessionError) return { error: sessionError.message }

  // Create courts
  const courts = Array.from({ length: numCourts }).map((_, i) => ({
    session_id: session.id,
    name: `Court ${i + 1}`,
    order_index: i,
    status: 'open',
  }))

  const { error: courtsError } = await supabase.from('courts').insert(courts)
  if (courtsError) return { error: courtsError.message }

  return { success: true, session }
}

export async function saveTemplateAction(
  venueId: string,
  templateName: string,
  numCourts: number,
  scheduledStart?: string,
  scheduledEnd?: string,
  recurrence?: string
) {
  const { supabase, user } = await getUser()
  const { data: member } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: 'Not a member of this venue' }

  const { error } = await supabase.from('session_templates').insert({
    venue_id: venueId,
    created_by: user.id,
    name: templateName.trim(),
    num_courts: numCourts,
    scheduled_start: scheduledStart || null,
    scheduled_end: scheduledEnd || null,
    recurrence: recurrence || null,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function getTemplatesAction(venueId: string) {
  const { supabase, user } = await getUser()
  const { data: member } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: 'Not a member' }

  const { data } = await supabase
    .from('session_templates')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false })
  return { templates: data || [] }
}

export async function deleteTemplateAction(venueId: string, templateId: string) {
  const { supabase, user } = await getUser()
  const { data: member } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: 'Not a member' }

  const { error } = await supabase
    .from('session_templates')
    .delete()
    .eq('id', templateId)
    .eq('venue_id', venueId)
  if (error) return { error: error.message }
  return { success: true }
}
