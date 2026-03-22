"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Session, Court, Game, Profile } from "@/types/database"
import { CourtVisual } from "@/components/court-visual"
import { Trophy, Users, Eye, Clock, LayoutGrid } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { GameReactions } from "@/components/game-reactions"

const supabase = createClient()

interface SpectatorViewProps {
  session: Session
  initialCourts: Court[]
  initialGames: Game[]
  initialCompletedGames: Game[]
  queueCount: number
}

export function SpectatorView({
  session,
  initialCourts,
  initialGames,
  initialCompletedGames,
  queueCount: initialQueueCount,
}: SpectatorViewProps) {
  const [courts, setCourts] = useState<Court[]>(initialCourts)
  const [games, setGames] = useState<Game[]>(initialGames)
  const [completedGames, setCompletedGames] = useState<Game[]>(initialCompletedGames)
  const [queueCount, setQueueCount] = useState(initialQueueCount)
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

  async function refetchQueueCount() {
    const { data } = await supabase
      .from("queue_entries")
      .select("player_ids")
      .eq("session_id", session.id)
      .eq("status", "waiting")
    if (data) {
      setQueueCount(data.reduce((sum, e) => sum + (e.player_ids as string[]).length, 0))
    }
  }

  useEffect(() => {
    const courtsChannel = supabase
      .channel(`spectate-courts-${session.id}`)
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
      .channel(`spectate-games-${session.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'games',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.status === 'in_progress') {
            setGames(prev => [...prev, payload.new as Game])
          }
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
      .channel(`spectate-queue-${session.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'queue_entries',
        filter: `session_id=eq.${session.id}`
      }, () => {
        refetchQueueCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(courtsChannel)
      supabase.removeChannel(gamesChannel)
      supabase.removeChannel(queueChannel)
    }
  }, [session.id])

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 z-10">
        <div className="flex-1 flex items-center justify-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold truncate">{session.name}</h1>
          {session.status === 'active' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
              Live
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Spectating
          </span>
        </div>
        <ModeToggle />
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 space-y-6">
        {/* Stats */}
        <div className="flex items-center justify-center gap-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">{queueCount} in queue</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5">
            <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">{courts.filter(c => c.status === 'in_use').length} / {courts.length} courts active</span>
          </div>
        </div>

        {/* Courts */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Courts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courts.map((court) => {
              const activeGame = games.find(g => g.court_id === court.id)
              const isOpen = court.status === 'open'

              return (
                <div
                  key={court.id}
                  className={`rounded-2xl border bg-card overflow-hidden ${!isOpen ? 'border-primary/20' : ''}`}
                >
                  <div className={`flex items-center justify-between px-5 py-3 ${isOpen ? 'bg-muted/30' : 'bg-primary/5 dark:bg-primary/10'}`}>
                    <p className="text-sm font-semibold">{court.name}</p>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                      isOpen ? 'border-primary/30 bg-primary/10 text-primary' : 'border-warning/30 bg-warning/10 text-warning'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-primary' : 'bg-warning animate-pulse-soft'}`} />
                      {isOpen ? 'Available' : 'In Progress'}
                    </span>
                  </div>
                  <div className="p-5">
                    {activeGame ? (
                      <div className="relative">
                        <CourtVisual
                          team1Players={activeGame.team1_player_ids}
                          team2Players={activeGame.team2_player_ids}
                          team1Score={activeGame.team1_score}
                          team2Score={activeGame.team2_score}
                          startedAt={activeGame.created_at}
                          playerNames={playerNames}
                        />
                        <GameReactions sessionId={session.id} gameId={activeGame.id} canReact={false} />
                      </div>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground py-6">Ready for play</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Recent Results */}
        {completedGames.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Results</h2>
            </div>

            <div className="space-y-2">
              {completedGames.map((game) => {
                const team1Won = game.winner_team === 1
                const team2Won = game.winner_team === 2
                const completedAt = game.completed_at
                  ? new Date(game.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                  : ""

                return (
                  <div key={game.id} className="flex items-center justify-between px-4 py-3 rounded-xl border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold ${team1Won ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                          {team1Won && <Trophy className="h-3 w-3" />}
                          <span className="tabular-nums">{game.team1_score}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">-</span>
                        <div className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold ${team2Won ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                          {team2Won && <Trophy className="h-3 w-3" />}
                          <span className="tabular-nums">{game.team2_score}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[...game.team1_player_ids, ...game.team2_player_ids].map((pid, i) => (
                          <span key={pid} className="text-[10px] text-muted-foreground">
                            {playerNames[pid] || `P${i+1}`}{i < 3 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{completedAt}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
