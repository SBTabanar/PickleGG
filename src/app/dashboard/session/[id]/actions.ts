'use server'

import { createClient } from '@/utils/supabase/server'

async function verifyManager(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: session } = await supabase
    .from('sessions')
    .select('creator_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.creator_id !== user.id) {
    throw new Error('Not authorized — only the session manager can perform this action')
  }

  return { supabase, userId: user.id }
}

export async function startMatchAction(sessionId: string, courtId: string, playerIds: string[]) {
  const { supabase } = await verifyManager(sessionId)

  if (playerIds.length !== 4) {
    return { error: 'Exactly 4 players required to start a match' }
  }

  const team1 = [playerIds[0], playerIds[1]]
  const team2 = [playerIds[2], playerIds[3]]

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      session_id: sessionId,
      court_id: courtId,
      team1_player_ids: team1,
      team2_player_ids: team2,
      status: 'in_progress',
    })
    .select()
    .single()

  if (gameError) return { error: gameError.message }

  const { error: courtError } = await supabase
    .from('courts')
    .update({ status: 'in_use', current_game_id: game.id })
    .eq('id', courtId)

  if (courtError) return { error: courtError.message }

  // Handle queue entries for the players going into the match
  const { data: entries } = await supabase
    .from('queue_entries')
    .select('id, player_ids')
    .eq('session_id', sessionId)
    .eq('status', 'waiting')

  if (entries) {
    for (const entry of entries) {
      const matchedPlayers = entry.player_ids.filter((pid: string) => playerIds.includes(pid))
      if (matchedPlayers.length === 0) continue

      if (matchedPlayers.length === entry.player_ids.length) {
        // All players in this entry are in the match — delete the entry
        await supabase.from('queue_entries').delete().eq('id', entry.id)
      } else {
        // Only some players taken — remove them from the entry
        const remaining = entry.player_ids.filter((pid: string) => !playerIds.includes(pid))
        await supabase.from('queue_entries').update({ player_ids: remaining }).eq('id', entry.id)
      }
    }
  }

  return { success: true, gameId: game.id }
}

export async function endGameAction(sessionId: string, gameId: string, courtId: string) {
  const { supabase } = await verifyManager(sessionId)

  const { data: game } = await supabase
    .from('games')
    .select('team1_player_ids, team2_player_ids')
    .eq('id', gameId)
    .single()

  if (!game) return { error: 'Game not found' }

  const { error: gameError } = await supabase
    .from('games')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', gameId)

  if (gameError) return { error: gameError.message }

  const { error: courtError } = await supabase
    .from('courts')
    .update({ status: 'open', current_game_id: null })
    .eq('id', courtId)

  if (courtError) return { error: courtError.message }

  // Clean up old 'playing' queue entries for these players
  const allPlayers = [...game.team1_player_ids, ...game.team2_player_ids]
  const { data: playingEntries } = await supabase
    .from('queue_entries')
    .select('id, player_ids')
    .eq('session_id', sessionId)
    .eq('status', 'playing')

  if (playingEntries) {
    const entriesToDelete = playingEntries
      .filter(e => e.player_ids.some((pid: string) => allPlayers.includes(pid)))
      .map(e => e.id)
    if (entriesToDelete.length > 0) {
      await supabase.from('queue_entries').delete().in('id', entriesToDelete)
    }
  }

  // Return players to queue
  await supabase.from('queue_entries').insert({
    session_id: sessionId,
    player_ids: allPlayers,
    status: 'waiting',
    bucket_index: 0,
  })

  return { success: true }
}

export async function removeFromQueueAction(sessionId: string, entryIds: string[]) {
  const { supabase } = await verifyManager(sessionId)

  const { error } = await supabase
    .from('queue_entries')
    .delete()
    .in('id', entryIds)

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateQueueEntryAction(sessionId: string, entryId: string, playerIds: string[]) {
  const { supabase } = await verifyManager(sessionId)

  if (playerIds.length === 0) {
    // If no players left, delete the entry
    const { error } = await supabase
      .from('queue_entries')
      .delete()
      .eq('id', entryId)
    if (error) return { error: error.message }
    return { success: true, deleted: true }
  }

  if (playerIds.length > 4) {
    return { error: 'A group can have at most 4 players' }
  }

  // Check for duplicates — make sure none of the new players are already in another queue entry
  const { data: allEntries } = await supabase
    .from('queue_entries')
    .select('id, player_ids')
    .eq('session_id', sessionId)
    .eq('status', 'waiting')

  if (allEntries) {
    for (const pid of playerIds) {
      const existsInOther = allEntries.some(e => e.id !== entryId && e.player_ids.includes(pid))
      if (existsInOther) {
        return { error: 'One or more players are already in another group' }
      }
    }
  }

  const { error } = await supabase
    .from('queue_entries')
    .update({ player_ids: playerIds })
    .eq('id', entryId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function joinQueueAction(sessionId: string, friendIds?: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const playerIds = [user.id, ...(friendIds || [])]

  // Validate: no more than 4 players
  if (playerIds.length > 4) {
    return { error: 'A group can have at most 4 players' }
  }

  // Validate friends are actually accepted friends
  if (friendIds && friendIds.length > 0) {
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    const acceptedFriendIds = new Set<string>()
    friendships?.forEach(f => {
      if (f.requester_id === user.id) acceptedFriendIds.add(f.addressee_id)
      else acceptedFriendIds.add(f.requester_id)
    })

    for (const fid of friendIds) {
      if (!acceptedFriendIds.has(fid)) {
        return { error: 'One or more selected players are not your friends' }
      }
    }
  }

  // Check if any player is already in the queue
  const { data: existing } = await supabase
    .from('queue_entries')
    .select('id, player_ids')
    .eq('session_id', sessionId)
    .in('status', ['waiting', 'playing'])

  for (const pid of playerIds) {
    if (existing?.some(e => e.player_ids.includes(pid))) {
      return { error: 'One or more players are already in the queue' }
    }
  }

  // Check if any player is in an active game
  const { data: activeGames } = await supabase
    .from('games')
    .select('id, team1_player_ids, team2_player_ids')
    .eq('session_id', sessionId)
    .eq('status', 'in_progress')

  for (const pid of playerIds) {
    if (activeGames?.some(g => g.team1_player_ids.includes(pid) || g.team2_player_ids.includes(pid))) {
      return { error: 'One or more players are currently in a game' }
    }
  }

  const { error } = await supabase.from('queue_entries').insert({
    session_id: sessionId,
    player_ids: playerIds,
    status: 'waiting',
    bucket_index: 0,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function leaveQueueAction(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Find the queue entry containing this player
  const { data: entries } = await supabase
    .from('queue_entries')
    .select('id, player_ids')
    .eq('session_id', sessionId)
    .eq('status', 'waiting')

  const entry = entries?.find(e => e.player_ids.includes(user.id))
  if (!entry) return { error: 'Could not find your queue entry' }

  const { error } = await supabase
    .from('queue_entries')
    .delete()
    .eq('id', entry.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function restPlayerAction(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Find the user's waiting queue entry
  const { data: entries } = await supabase
    .from('queue_entries')
    .select('id, player_ids')
    .eq('session_id', sessionId)
    .eq('status', 'waiting')

  const entry = entries?.find(e => e.player_ids.includes(user.id))
  if (!entry) return { error: 'You are not in the queue' }

  // If group entry, remove user from it; create a separate resting entry for the user
  if (entry.player_ids.length > 1) {
    const remaining = entry.player_ids.filter((pid: string) => pid !== user.id)
    await supabase.from('queue_entries').update({ player_ids: remaining }).eq('id', entry.id)
    await supabase.from('queue_entries').insert({
      session_id: sessionId,
      player_ids: [user.id],
      status: 'resting',
      bucket_index: 0,
    })
  } else {
    await supabase.from('queue_entries').update({ status: 'resting' }).eq('id', entry.id)
  }

  return { success: true }
}

export async function rejoinFromRestAction(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: entries } = await supabase
    .from('queue_entries')
    .select('id, player_ids')
    .eq('session_id', sessionId)
    .eq('status', 'resting')

  const entry = entries?.find(e => e.player_ids.includes(user.id))
  if (!entry) return { error: 'You are not resting' }

  await supabase.from('queue_entries')
    .update({ status: 'waiting', joined_at: new Date().toISOString() })
    .eq('id', entry.id)

  return { success: true }
}

export async function forceRequeueAction(sessionId: string, entryId: string) {
  const { supabase } = await verifyManager(sessionId)

  const { error } = await supabase.from('queue_entries')
    .update({ status: 'waiting', joined_at: new Date().toISOString() })
    .eq('id', entryId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function rematchAction(
  sessionId: string,
  courtId: string,
  team1PlayerIds: string[],
  team2PlayerIds: string[]
) {
  const { supabase } = await verifyManager(sessionId)

  const allPlayers = [...team1PlayerIds, ...team2PlayerIds]

  // Create new game with same teams
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      session_id: sessionId,
      court_id: courtId,
      team1_player_ids: team1PlayerIds,
      team2_player_ids: team2PlayerIds,
      status: 'in_progress',
    })
    .select()
    .single()

  if (gameError) return { error: gameError.message }

  // Update court
  const { error: courtError } = await supabase
    .from('courts')
    .update({ status: 'in_use', current_game_id: game.id })
    .eq('id', courtId)

  if (courtError) return { error: courtError.message }

  // Remove any waiting queue entries for these players
  const { data: entries } = await supabase
    .from('queue_entries')
    .select('id, player_ids')
    .eq('session_id', sessionId)
    .eq('status', 'waiting')

  if (entries) {
    for (const entry of entries) {
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

  return { success: true }
}

export async function shuffleRematchAction(
  sessionId: string,
  courtId: string,
  playerIds: string[]
) {
  if (playerIds.length !== 4) return { error: 'Need exactly 4 players' }

  // Shuffle and split into two teams
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5)
  const team1 = [shuffled[0], shuffled[1]]
  const team2 = [shuffled[2], shuffled[3]]

  return rematchAction(sessionId, courtId, team1, team2)
}

export async function reorderQueueAction(sessionId: string, orderedEntryIds: string[]) {
  const { supabase } = await verifyManager(sessionId)

  // Assign new joined_at timestamps in order, spaced 1 second apart
  const baseTime = new Date('2000-01-01T00:00:00Z')
  for (let i = 0; i < orderedEntryIds.length; i++) {
    const newTime = new Date(baseTime.getTime() + i * 1000).toISOString()
    const { error } = await supabase
      .from('queue_entries')
      .update({ joined_at: newTime })
      .eq('id', orderedEntryIds[i])
    if (error) return { error: error.message }
  }

  return { success: true }
}
