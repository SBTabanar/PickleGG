"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Session, Court, QueueEntry } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModeToggle } from "@/components/mode-toggle"
import Link from "next/link"
import { ChevronLeft, Users, PlayCircle, Clock, Trophy, Swords, Hash } from "lucide-react"
import { JoinQueueDialog } from "@/components/join-queue-dialog"
import { FinishMatchDialog } from "@/components/finish-match-dialog"
import { ShareSession } from "@/components/share-session"
import { MatchHistory } from "@/components/match-history"
import { CourtVisual } from "@/components/court-visual"
import { PlayerAvatar } from "@/components/player-avatar"
import { Game } from "@/types/database"

// Create the Supabase browser client once at module level so it is a stable
// reference. Placing it inside the component caused a new object on every render,
// which triggered infinite re-subscriptions in the realtime useEffect.
const supabase = createClient()

interface SessionDashboardProps {
  initialSession: Session
  initialCourts: Court[]
  initialQueue: QueueEntry[]
}

export function SessionDashboard({
  initialSession,
  initialCourts,
  initialQueue
}: SessionDashboardProps) {
  const [session] = useState<Session>(initialSession)
  const [courts, setCourts] = useState<Court[]>(initialCourts)
  const [queue, setQueue] = useState<QueueEntry[]>(initialQueue)
  const [games, setGames] = useState<Game[]>([])
  const [completedGames, setCompletedGames] = useState<Game[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    fetchActiveGames()
    fetchCompletedGames()
  }, [])

  async function fetchActiveGames() {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("session_id", session.id)
      .eq("status", "in_progress")
    if (error) {
      console.error("Failed to fetch active games:", error.message)
      return
    }
    if (data) setGames(data as Game[])
  }

  async function fetchCompletedGames() {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("session_id", session.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50)
    if (error) {
      console.error("Failed to fetch completed games:", error.message)
      return
    }
    if (data) setCompletedGames(data as Game[])
  }

  async function startMatch(courtId: string) {
    if (buckets.length === 0 || buckets[0].players.length < 4) {
      setActionError("Need at least 4 players in the first group to start a match.")
      return
    }

    setLoading(courtId)
    setActionError(null)
    try {
      const players = buckets[0].players
      const team1 = [players[0], players[1]]
      const team2 = [players[2], players[3]]

      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert({
          session_id: session.id,
          court_id: courtId,
          team1_player_ids: team1,
          team2_player_ids: team2,
          status: "in_progress",
        })
        .select()
        .single()

      if (gameError) throw gameError

      const { error: courtError } = await supabase
        .from("courts")
        .update({
          status: "in_use",
          current_game_id: game.id,
        })
        .eq("id", courtId)

      if (courtError) throw courtError

      const { error: queueError } = await supabase
        .from("queue_entries")
        .update({ status: "playing" })
        .in("id", queue.filter(q => q.player_ids.some(pid => players.includes(pid))).map(q => q.id))

      if (queueError) throw queueError

    } catch (err) {
      // Log only the error message, not the full error object which may contain DB details
      console.error("Error starting match:", err instanceof Error ? err.message : "Unknown error")
      setActionError("Failed to start match. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  useEffect(() => {
    const courtsChannel = supabase
      .channel(`courts-session-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'courts',
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

    const queueChannel = supabase
      .channel(`queue-session-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'queue_entries',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.status === 'waiting') {
            setQueue(prev => [...prev, payload.new as QueueEntry].sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()))
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status !== 'waiting') {
            setQueue(prev => prev.filter(q => q.id !== payload.new.id))
          } else {
            setQueue(prev => prev.map(q => q.id === payload.new.id ? payload.new as QueueEntry : q).sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()))
          }
        } else if (payload.eventType === 'DELETE') {
          setQueue(prev => prev.filter(q => q.id !== payload.old.id))
        }
      })
      .subscribe()

    const gamesChannel = supabase
      .channel(`games-session-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.status === 'in_progress') {
            setGames(prev => [...prev, payload.new as Game])
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status === 'completed') {
            setGames(prev => prev.filter(g => g.id !== payload.new.id))
            setCompletedGames(prev => [payload.new as Game, ...prev])
          } else {
            setGames(prev => prev.map(g => g.id === payload.new.id ? payload.new as Game : g))
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(courtsChannel)
      supabase.removeChannel(queueChannel)
      supabase.removeChannel(gamesChannel)
    }
  }, [session.id])

  const buckets: { id: string; players: string[] }[] = []
  let currentBucket: string[] = []

  queue.forEach((entry) => {
    entry.player_ids.forEach(pid => {
      if (currentBucket.length === 4) {
        buckets.push({ id: `bucket-${buckets.length}`, players: currentBucket })
        currentBucket = []
      }
      currentBucket.push(pid)
    })
  })
  if (currentBucket.length > 0) {
    buckets.push({ id: `bucket-${buckets.length}`, players: currentBucket })
  }

  const activeCourts = courts.filter(c => c.status === 'in_use').length
  const totalPlayers = queue.reduce((sum, q) => sum + q.player_ids.length, 0)
  const totalGamesPlayed = completedGames.length

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-6 z-10">
        <nav aria-label="Breadcrumb">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden sr-only">Dashboard</span>
          </Link>
        </nav>
        <div className="flex-1 flex items-center justify-center gap-2">
          <h1 className="text-sm font-semibold truncate">{session.name}</h1>
          {session.status === 'active' && (
            <span role="status" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary-text">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" aria-hidden="true" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShareSession shareCode={session.share_code} sessionName={session.name} />
          <ModeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6 md:p-10 max-w-5xl mx-auto w-full">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card px-3 py-3 sm:px-4 sm:py-3.5 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
              <Users className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] text-muted-foreground font-medium truncate">In Queue</span>
            </div>
            <p className="text-xl font-bold tracking-tight tabular-nums">{totalPlayers}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{buckets.length} group{buckets.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-xl border bg-card px-3 py-3 sm:px-4 sm:py-3.5 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
              <PlayCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] text-muted-foreground font-medium truncate">Courts</span>
            </div>
            <p className="text-xl font-bold tracking-tight tabular-nums">{activeCourts} <span className="text-xs font-normal text-muted-foreground">/ {courts.length}</span></p>
            <p className="text-[11px] text-muted-foreground mt-0.5">active</p>
          </div>
          <div className="rounded-xl border bg-card px-3 py-3 sm:px-4 sm:py-3.5 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] text-muted-foreground font-medium truncate">Est. Wait</span>
            </div>
            <p className="text-xl font-bold tracking-tight tabular-nums">~{Math.max(0, (buckets.length - courts.length) * 15)} <span className="text-xs font-normal text-muted-foreground">min</span></p>
            <p className="text-[11px] text-muted-foreground mt-0.5">for new groups</p>
          </div>
          <div className="rounded-xl border bg-card px-3 py-3 sm:px-4 sm:py-3.5 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
              <Trophy className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] text-muted-foreground font-medium truncate">Games Played</span>
            </div>
            <p className="text-xl font-bold tracking-tight tabular-nums">{totalGamesPlayed}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">this session</p>
          </div>
        </div>

        {/* Action error banner */}
        {actionError && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{actionError}</p>
            <button
              onClick={() => setActionError(null)}
              className="text-xs text-destructive/60 hover:text-destructive underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="w-full grid grid-cols-3 lg:w-[480px]">
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="courts">Courts</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Paddle Rack</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{totalPlayers} players waiting</p>
              </div>
              <JoinQueueDialog sessionId={session.id} onJoined={() => {}} />
            </div>

            <div className="grid gap-2">
              {buckets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-2xl text-center">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Queue is empty</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-5">Add players to get started.</p>
                  <JoinQueueDialog sessionId={session.id} onJoined={() => {}} />
                </div>
              ) : (
                buckets.map((bucket, index) => (
                  <div
                    key={bucket.id}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 animate-fade-in ${
                      index === 0
                        ? 'border-primary/30 bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/10'
                        : 'bg-card hover:bg-muted/30'
                    }`}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {index === 0 ? 'Next Up' : `Group ${index + 1}`}
                          </p>
                          {index === 0 && bucket.players.length === 4 && (
                            <span role="status" className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary-text">
                              Ready
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{bucket.players.length} / 4 players</p>
                      </div>
                    </div>
                    <div className="flex -space-x-2">
                      {bucket.players.map((pid, i) => (
                        <PlayerAvatar
                          key={pid}
                          name={`P${i + 1}`}
                          size="sm"
                          index={i}
                          className="border-2 border-background"
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="courts" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courts.map((court, courtIndex) => {
                const activeGame = games.find(g => g.court_id === court.id)
                const isOpen = court.status === 'open'

                return (
                  <div
                    key={court.id}
                    className={`rounded-2xl border bg-card p-5 space-y-4 transition-all duration-200 animate-scale-in ${
                      !isOpen ? 'border-primary/20 ring-1 ring-primary/10' : ''
                    }`}
                    style={{ animationDelay: `${courtIndex * 80}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isOpen ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                        }`}>
                          <Hash className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-sm font-semibold">{court.name}</p>
                      </div>
                      <span role="status" className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isOpen
                          ? 'bg-primary/10 text-primary-text'
                          : 'bg-warning/10 text-warning'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-primary' : 'bg-warning animate-pulse-soft'}`} aria-hidden="true" />
                        {isOpen ? 'Open' : 'In Progress'}
                      </span>
                    </div>

                    {isOpen ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                          <Swords className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                        <p className="text-xs text-muted-foreground">No active game</p>
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => startMatch(court.id)}
                          disabled={loading === court.id || buckets.length === 0 || buckets[0].players.length < 4}
                        >
                          {loading === court.id ? "Starting..." : "Start Match"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <CourtVisual
                          team1Players={activeGame?.team1_player_ids ?? []}
                          team2Players={activeGame?.team2_player_ids ?? []}
                          team1Score={activeGame?.team1_score ?? 0}
                          team2Score={activeGame?.team2_score ?? 0}
                        />
                        {activeGame && (
                          <FinishMatchDialog
                            sessionId={session.id}
                            gameId={activeGame.id}
                            courtId={court.id}
                            team1Players={activeGame.team1_player_ids}
                            team2Players={activeGame.team2_player_ids}
                            onFinished={() => {}}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Match History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{completedGames.length} completed games</p>
            </div>
            <MatchHistory games={completedGames} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
