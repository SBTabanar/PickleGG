"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Session, Court, Game, QueueEntry, Profile } from "@/types/database"
import { Trophy } from "lucide-react"

const supabase = createClient()

interface LobbyTVViewProps {
  session: Session
  initialCourts: Court[]
  initialGames: Game[]
  initialCompletedGames: Game[]
  initialQueue: QueueEntry[]
}

export function LobbyTVView({
  session,
  initialCourts,
  initialGames,
  initialCompletedGames,
  initialQueue,
}: LobbyTVViewProps) {
  const [courts, setCourts] = useState<Court[]>(initialCourts)
  const [games, setGames] = useState<Game[]>(initialGames)
  const [completedGames, setCompletedGames] = useState<Game[]>(initialCompletedGames)
  const [queue, setQueue] = useState<QueueEntry[]>(initialQueue)
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchProfiles()
  }, [])

  async function fetchProfiles() {
    const { data } = await supabase.from("profiles").select("id, display_name")
    if (data) {
      const names: Record<string, string> = {}
      data.forEach((p: Pick<Profile, "id" | "display_name">) => {
        if (p.display_name) names[p.id] = p.display_name
      })
      setPlayerNames(names)
    }
  }

  async function refetchQueue() {
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("session_id", session.id)
      .eq("status", "waiting")
      .order("joined_at", { ascending: true })
    if (data) setQueue(data as QueueEntry[])
  }

  useEffect(() => {
    const courtsChannel = supabase
      .channel(`tv-courts-${session.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'courts',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setCourts(prev => [...prev, payload.new as Court].sort((a, b) => a.order_index - b.order_index))
        } else if (payload.eventType === 'UPDATE') {
          setCourts(prev => prev.map(c => c.id === payload.new.id ? payload.new as Court : c))
        } else if (payload.eventType === 'DELETE') {
          setCourts(prev => prev.filter(c => c.id !== payload.old.id))
        }
      })
      .subscribe()

    const gamesChannel = supabase
      .channel(`tv-games-${session.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'games',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.status === 'in_progress') {
            setGames(prev => [...prev, payload.new as Game])
          }
          fetchProfiles()
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status === 'completed') {
            setGames(prev => prev.filter(g => g.id !== payload.new.id))
            setCompletedGames(prev => [payload.new as Game, ...prev].slice(0, 10))
          } else {
            setGames(prev => prev.map(g => g.id === payload.new.id ? payload.new as Game : g))
          }
        }
      })
      .subscribe()

    const queueChannel = supabase
      .channel(`tv-queue-${session.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'queue_entries',
        filter: `session_id=eq.${session.id}`
      }, () => {
        refetchQueue()
        fetchProfiles()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(courtsChannel)
      supabase.removeChannel(gamesChannel)
      supabase.removeChannel(queueChannel)
    }
  }, [session.id])

  const getName = (id: string) => playerNames[id] || id.slice(0, 6)

  const queuePlayers = queue.flatMap(e => e.player_ids)
  const activeCourts = courts.filter(c => c.status === 'in_use')
  const openCourts = courts.filter(c => c.status === 'open')

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">P</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{session.name}</h1>
            <p className="text-lg text-white/50">
              {activeCourts.length} of {courts.length} courts active
              {' · '}
              {queuePlayers.length} in queue
            </p>
          </div>
        </div>
        {session.status === 'active' && (
          <div className="flex items-center gap-2 bg-primary/20 border border-primary/40 rounded-full px-5 py-2">
            <span className="h-3 w-3 rounded-full bg-primary animate-pulse-soft" />
            <span className="text-lg font-semibold text-primary">LIVE</span>
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6">
        {/* Courts — left 2 columns */}
        <div className="col-span-2 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-2">Courts</h2>
          <div className="grid grid-cols-2 gap-4">
            {courts.map((court) => {
              const activeGame = games.find(g => g.court_id === court.id)
              const isOpen = court.status === 'open'

              return (
                <div
                  key={court.id}
                  className={`rounded-2xl border-2 p-5 ${
                    isOpen
                      ? 'border-white/10 bg-white/5'
                      : 'border-primary/40 bg-primary/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{court.name}</h3>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                      isOpen ? 'bg-white/10 text-white/60' : 'bg-primary/20 text-primary'
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-white/40' : 'bg-primary animate-pulse-soft'}`} />
                      {isOpen ? 'Open' : 'In Play'}
                    </span>
                  </div>

                  {activeGame ? (
                    <div className="space-y-3">
                      {/* Team 1 */}
                      <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                        activeGame.team1_score > activeGame.team2_score ? 'bg-primary/15' : 'bg-white/5'
                      }`}>
                        <div className="flex items-center gap-2">
                          {activeGame.team1_player_ids.map(pid => (
                            <span key={pid} className="text-lg font-medium">{getName(pid)}</span>
                          )).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, <span key={`sep-${i}`} className="text-white/30 mx-1">&</span>, curr], [] as React.ReactNode[])}
                        </div>
                        <span className="text-3xl font-bold tabular-nums">{activeGame.team1_score}</span>
                      </div>
                      <div className="text-center text-sm font-semibold text-white/30">VS</div>
                      {/* Team 2 */}
                      <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                        activeGame.team2_score > activeGame.team1_score ? 'bg-primary/15' : 'bg-white/5'
                      }`}>
                        <div className="flex items-center gap-2">
                          {activeGame.team2_player_ids.map(pid => (
                            <span key={pid} className="text-lg font-medium">{getName(pid)}</span>
                          )).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, <span key={`sep-${i}`} className="text-white/30 mx-1">&</span>, curr], [] as React.ReactNode[])}
                        </div>
                        <span className="text-3xl font-bold tabular-nums">{activeGame.team2_score}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-xl text-white/20 font-medium">Ready for play</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right sidebar — Queue + Recent Results */}
        <div className="space-y-6">
          {/* Queue */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-3">
              Up Next ({queuePlayers.length})
            </h2>
            <div className="space-y-2">
              {queuePlayers.length === 0 ? (
                <p className="text-lg text-white/20 py-4">No players in queue</p>
              ) : (
                queue.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                      i === 0 ? 'bg-primary/15 border border-primary/30' : 'bg-white/5'
                    }`}
                  >
                    <span className={`text-lg font-bold tabular-nums w-8 ${
                      i === 0 ? 'text-primary' : 'text-white/30'
                    }`}>
                      #{i + 1}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {entry.player_ids.map((pid, j) => (
                        <span key={pid} className="text-base font-medium">
                          {getName(pid)}{j < entry.player_ids.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Results */}
          {completedGames.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-3">
                Recent Results
              </h2>
              <div className="space-y-2">
                {completedGames.slice(0, 5).map((game) => {
                  const team1Won = game.winner_team === 1
                  const team2Won = game.winner_team === 2
                  return (
                    <div key={game.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-lg font-bold tabular-nums ${
                          team1Won ? 'bg-primary/15 text-primary' : 'text-white/50'
                        }`}>
                          {team1Won && <Trophy className="h-4 w-4" />}
                          {game.team1_score}
                        </div>
                        <span className="text-white/20">-</span>
                        <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-lg font-bold tabular-nums ${
                          team2Won ? 'bg-primary/15 text-primary' : 'text-white/50'
                        }`}>
                          {team2Won && <Trophy className="h-4 w-4" />}
                          {game.team2_score}
                        </div>
                      </div>
                      {game.completed_at && (
                        <span className="text-sm text-white/30">
                          {new Date(game.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-sm text-white/20">
        <span>Join: {session.share_code}</span>
        <span>PickleGG</span>
      </div>
    </div>
  )
}
