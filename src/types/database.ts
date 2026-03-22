export type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  games_played: number
  wins: number
  losses: number
  updated_at: string
}

export type Venue = {
  id: string
  name: string
  slug: string
  owner_id: string
  num_courts: number
  created_at: string
}

export type VenueMember = {
  id: string
  venue_id: string
  user_id: string
  role: 'owner' | 'staff'
  created_at: string
}

export type Session = {
  id: string
  creator_id: string
  venue_id: string | null
  name: string
  status: 'active' | 'completed'
  created_at: string
  share_code: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  recurrence: string | null
}

export type Court = {
  id: string
  session_id: string
  name: string
  status: 'open' | 'in_use'
  current_game_id: string | null
  order_index: number
}

export type QueueEntry = {
  id: string
  session_id: string
  player_ids: string[]
  status: 'waiting' | 'playing' | 'resting'
  joined_at: string
  bucket_index: number
}

export type Friendship = {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export type Challenge = {
  id: string
  session_id: string
  challenger_id: string
  challenger_partner_id: string | null
  challenged_id: string
  challenged_partner_id: string | null
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'in_game' | 'completed'
  game_id: string | null
  created_at: string
}

export type Game = {
  id: string
  session_id: string
  court_id: string
  team1_player_ids: string[]
  team2_player_ids: string[]
  team1_score: number
  team2_score: number
  status: 'in_progress' | 'completed'
  winner_team: 1 | 2 | null
  created_at: string
  completed_at: string | null
}
