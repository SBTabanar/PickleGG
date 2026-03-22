'use server'

import { createClient } from '@/utils/supabase/server'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function createChallengeAction(
  sessionId: string,
  challengedId: string,
  challengerPartnerId?: string,
  challengedPartnerId?: string
) {
  const { supabase, user } = await getUser()

  // Validate friendship with challenged player
  const { data: friendships } = await supabase
    .from('friendships')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${challengedId}),and(requester_id.eq.${challengedId},addressee_id.eq.${user.id})`)

  if (!friendships || friendships.length === 0) {
    return { error: 'You can only challenge friends' }
  }

  // Check for existing pending challenge
  const { data: existing } = await supabase
    .from('challenges')
    .select('id')
    .eq('session_id', sessionId)
    .eq('challenger_id', user.id)
    .eq('status', 'pending')

  if (existing && existing.length > 0) {
    return { error: 'You already have a pending challenge' }
  }

  const { data: challenge, error } = await supabase
    .from('challenges')
    .insert({
      session_id: sessionId,
      challenger_id: user.id,
      challenger_partner_id: challengerPartnerId || null,
      challenged_id: challengedId,
      challenged_partner_id: challengedPartnerId || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, challenge }
}

export async function respondToChallengeAction(challengeId: string, accept: boolean) {
  const { supabase, user } = await getUser()

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('status', 'pending')
    .single()

  if (!challenge) return { error: 'Challenge not found' }

  // Only challenged player (or their partner) can respond
  if (challenge.challenged_id !== user.id && challenge.challenged_partner_id !== user.id) {
    return { error: 'Not authorized to respond to this challenge' }
  }

  if (!accept) {
    await supabase.from('challenges').update({ status: 'declined' }).eq('id', challengeId)
    return { success: true }
  }

  // Accept: update status and auto-queue all players
  await supabase.from('challenges').update({ status: 'accepted' }).eq('id', challengeId)

  const team1 = [challenge.challenger_id, challenge.challenger_partner_id].filter(Boolean) as string[]
  const team2 = [challenge.challenged_id, challenge.challenged_partner_id].filter(Boolean) as string[]
  const allPlayers = [...team1, ...team2]

  // Remove any existing queue entries for these players
  const { data: existingEntries } = await supabase
    .from('queue_entries')
    .select('id, player_ids')
    .eq('session_id', challenge.session_id)
    .in('status', ['waiting', 'resting'])

  if (existingEntries) {
    for (const entry of existingEntries) {
      const matchedPlayers = entry.player_ids.filter((pid: string) => allPlayers.includes(pid))
      if (matchedPlayers.length === 0) continue
      if (matchedPlayers.length === entry.player_ids.length) {
        await supabase.from('queue_entries').delete().eq('id', entry.id)
      } else {
        const remaining = entry.player_ids.filter((pid: string) => !allPlayers.includes(pid))
        await supabase.from('queue_entries').update({ player_ids: remaining }).eq('id', entry.id)
      }
    }
  }

  // Queue all challenge players together
  await supabase.from('queue_entries').insert({
    session_id: challenge.session_id,
    player_ids: allPlayers,
    status: 'waiting',
    bucket_index: 0,
  })

  return { success: true }
}

export async function cancelChallengeAction(challengeId: string) {
  const { supabase, user } = await getUser()

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('challenger_id', user.id)
    .eq('status', 'pending')
    .single()

  if (!challenge) return { error: 'Challenge not found' }

  await supabase.from('challenges').update({ status: 'expired' }).eq('id', challengeId)
  return { success: true }
}

export async function getSessionChallengesAction(sessionId: string) {
  const { supabase, user } = await getUser()

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('session_id', sessionId)
    .in('status', ['pending', 'accepted'])
    .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id},challenger_partner_id.eq.${user.id},challenged_partner_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return { challenges: challenges || [], currentUserId: user.id }
}
