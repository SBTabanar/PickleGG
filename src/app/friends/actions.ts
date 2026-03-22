'use server'

import { createClient } from '@/utils/supabase/server'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function sendFriendRequestAction(addresseeId: string) {
  const { supabase, user } = await getUser()

  if (addresseeId === user.id) {
    return { error: 'You cannot add yourself as a friend' }
  }

  // Check if friendship already exists in either direction
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)

  if (existing && existing.length > 0) {
    const friendship = existing[0]
    if (friendship.status === 'accepted') return { error: 'Already friends' }
    if (friendship.status === 'pending') return { error: 'Friend request already pending' }
    if (friendship.status === 'declined') {
      // Allow re-sending after decline
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'pending', requester_id: user.id, addressee_id: addresseeId })
        .eq('id', friendship.id)
      if (error) return { error: error.message }
      return { success: true }
    }
  }

  const { error } = await supabase.from('friendships').insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: 'pending',
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function respondToFriendRequestAction(friendshipId: string, accept: boolean) {
  const { supabase, user } = await getUser()

  // Only the addressee can respond
  const { data: friendship } = await supabase
    .from('friendships')
    .select('*')
    .eq('id', friendshipId)
    .eq('addressee_id', user.id)
    .eq('status', 'pending')
    .single()

  if (!friendship) return { error: 'Friend request not found' }

  const { error } = await supabase
    .from('friendships')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', friendshipId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function removeFriendAction(friendshipId: string) {
  const { supabase, user } = await getUser()

  // Either party can remove
  const { data: friendship } = await supabase
    .from('friendships')
    .select('*')
    .eq('id', friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .single()

  if (!friendship) return { error: 'Friendship not found' }

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getFriendsAction() {
  const { supabase, user } = await getUser()

  const { data: friendships } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (!friendships) return { friends: [], pending: [] }

  // Get all related user IDs
  const userIds = new Set<string>()
  friendships.forEach(f => {
    userIds.add(f.requester_id)
    userIds.add(f.addressee_id)
  })
  userIds.delete(user.id)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', Array.from(userIds))

  const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {}
  profiles?.forEach(p => { profileMap[p.id] = p })

  const friends = friendships
    .filter(f => f.status === 'accepted')
    .map(f => {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id
      return {
        friendshipId: f.id,
        userId: friendId,
        displayName: profileMap[friendId]?.display_name || 'Unknown',
        avatarUrl: profileMap[friendId]?.avatar_url || null,
      }
    })

  const pending = friendships
    .filter(f => f.status === 'pending' && f.addressee_id === user.id)
    .map(f => ({
      friendshipId: f.id,
      userId: f.requester_id,
      displayName: profileMap[f.requester_id]?.display_name || 'Unknown',
      avatarUrl: profileMap[f.requester_id]?.avatar_url || null,
    }))

  const outgoing = friendships
    .filter(f => f.status === 'pending' && f.requester_id === user.id)
    .map(f => ({
      friendshipId: f.id,
      userId: f.addressee_id,
      displayName: profileMap[f.addressee_id]?.display_name || 'Unknown',
      avatarUrl: profileMap[f.addressee_id]?.avatar_url || null,
    }))

  return { friends, pending, outgoing, currentUserId: user.id }
}

export async function searchPlayersAction(query: string) {
  const { supabase, user } = await getUser()

  if (query.trim().length < 2) return { players: [] }

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `%${query}%`)
    .neq('id', user.id)
    .limit(10)

  return { players: data || [] }
}
