"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { Session, Court, QueueEntry, Game, Profile } from "@/types/database"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { ShareSession } from "@/components/share-session"
import { CourtVisual } from "@/components/court-visual"
import { PlayerAvatar } from "@/components/player-avatar"
import Link from "next/link"
import {
  ChevronLeft,
  Trophy,
  LayoutGrid,
  ListOrdered,
  Clock,
  Zap,
  Timer,
  LogIn,
  LogOut,
} from "lucide-react"

const supabase = createClient()

interface PlayerDashboardProps {
  initialSession: Session
  initialCourts: Court[]
  initialQueue: QueueEntry[]
  userId: string
}

function MatchTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState("")

  useEffect(() => {
    function update() {
      const start = new Date(startedAt).getTime()
      const now = Date.now()
      const diff = Math.max(0, Math.floor((now - start) / 1000))
      const mins = Math.floor(diff / 60)
      const secs = diff % 60
      setElapsed(`${mins}:${secs.toString().padStart(2, "0")}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
      <Timer className="h-3 w-3" />
      {elapsed}
    </span>
  )
}

type PlayerStatus =
  | { type: "in_queue"; position: number; totalGroups: number }
  | { type: "next_up" }
  | { type: "playing"; court: Court; game: Game }
  | { type: "not_in_session" }

export function PlayerDashboard({
  initialSession,
  initialCourts,
  initialQueue,
  userId,
}: PlayerDashboardProps) {
  const [session] = useState<Session>(initialSession)
  const [courts, setCourts] = useState<Court[]>(initialCourts)
  const [queue, setQueue] = useState<QueueEntry[]>(initialQueue)
  const [games, setGames] = useState<Game[]>([])
  const [completedGames, setCompletedGames] = useState<Game[]>([])
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({})
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    fetchActiveGames()
    fetchCompletedGames()
    fetchProfiles()
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
      .limit(5)
    if (error) {
      console.error("Failed to fetch completed games:", error.message)
      return
    }
    if (data) setCompletedGames(data as Game[])
  }

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

  async function joinQueue() {
    setJoining(true)
    setActionError(null)
    try {
      const { error } = await supabase.from("queue_entries").insert({
        session_id: session.id,
        player_ids: [userId],
        status: "waiting",
        bucket_index: 0,
      })
      if (error) throw error
    } catch (err) {
      console.error("Error joining queue:", err instanceof Error ? err.message : "Unknown error")
      setActionError("Failed to join queue. Please try again.")
    } finally {
      setJoining(false)
    }
  }

  async function leaveQueue() {
    // Find the queue entry containing this player directly at call time
    const entry = queue.find(q => q.player_ids.includes(userId))
    if (!entry) {
      setActionError("Could not find your queue entry. Try refreshing.")
      return
    }
    setLeaving(true)
    setActionError(null)
    try {
      const { error } = await supabase
        .from("queue_entries")
        .delete()
        .eq("id", entry.id)
      if (error) throw error
    } catch (err) {
      console.error("Error leaving queue:", err instanceof Error ? err.message : "Unknown error")
      setActionError("Failed to leave queue. Please try again.")
    } finally {
      setLeaving(false)
    }
  }

  // Realtime subscriptions
  useEffect(() => {
    const courtsChannel = supabase
      .channel(`player-courts-${session.id}`)
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
      .channel(`player-queue-${session.id}`)
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
      .channel(`player-games-${session.id}`)
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
            setCompletedGames(prev => [payload.new as Game, ...prev].slice(0, 5))
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

  // Build buckets from queue (track which queue entry each player came from)
  const buckets = useMemo(() => {
    const result: { id: string; players: string[]; entryIds: string[] }[] = []
    let currentBucket: string[] = []
    let currentEntryIds: string[] = []

    queue.forEach((entry) => {
      entry.player_ids.forEach(pid => {
        if (currentBucket.length === 4) {
          result.push({ id: `bucket-${result.length}`, players: currentBucket, entryIds: [...currentEntryIds] })
          currentBucket = []
          currentEntryIds = []
        }
        currentBucket.push(pid)
        if (!currentEntryIds.includes(entry.id)) {
          currentEntryIds.push(entry.id)
        }
      })
    })
    if (currentBucket.length > 0) {
      result.push({ id: `bucket-${result.length}`, players: currentBucket, entryIds: currentEntryIds })
    }
    return result
  }, [queue])

  // Determine player status
  const playerStatus: PlayerStatus = useMemo(() => {
    // Check if currently playing
    for (const game of games) {
      if (game.team1_player_ids.includes(userId) || game.team2_player_ids.includes(userId)) {
        const court = courts.find(c => c.id === game.court_id)
        if (court) {
          return { type: "playing", court, game }
        }
      }
    }
    // Check queue position
    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i].players.includes(userId)) {
        if (i === 0 && buckets[i].players.length === 4) {
          return { type: "next_up" }
        }
        return { type: "in_queue", position: i + 1, totalGroups: buckets.length }
      }
    }
    return { type: "not_in_session" }
  }, [games, buckets, courts, userId])

  const estimatedWaitMinutes = playerStatus.type === "in_queue"
    ? playerStatus.position * 10
    : 0

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 z-10">
        <Link href="/dashboard" className="flex items-center min-h-[44px] text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="flex-1 flex items-center justify-center gap-2">
          <h1 className="text-sm font-semibold truncate">{session.name}</h1>
          {session.status === 'active' && (
            <span role="status" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" aria-hidden="true" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ShareSession shareCode={session.share_code} sessionName={session.name} />
          <ModeToggle />
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Error banner */}
        {actionError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 animate-fade-in">
            <p className="text-sm text-destructive flex-1">{actionError}</p>
            <button onClick={() => setActionError(null)} className="text-destructive/40 hover:text-destructive">
              <span className="sr-only">Dismiss</span>&times;
            </button>
          </div>
        )}

        {/* Your Status Card */}
        <section className="animate-fade-in-up">
          {/* NOT IN QUEUE — big join button */}
          {playerStatus.type === "not_in_session" && (
            <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-card p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold">Ready to play?</p>
                <p className="text-sm text-muted-foreground mt-1">Jump into the rotation and we&apos;ll match you up</p>
              </div>
              <Button
                className="w-full h-12 text-base"
                onClick={joinQueue}
                disabled={joining}
              >
                <LogIn className="mr-2 h-5 w-5" />
                {joining ? "Joining..." : "Join Queue"}
              </Button>
            </div>
          )}

          {/* IN QUEUE — position + leave button */}
          {playerStatus.type === "in_queue" && (
            <div className="rounded-2xl border bg-card p-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Your Position</p>
              <p className="text-6xl font-bold tabular-nums text-foreground animate-count-up">
                #{playerStatus.position}
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                Estimated wait: ~{estimatedWaitMinutes} min
              </p>
              <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <ListOrdered className="h-3 w-3" />
                {playerStatus.totalGroups} group{playerStatus.totalGroups !== 1 ? "s" : ""} in queue
              </div>
              <Button
                variant="outline"
                className="mt-4 h-11 px-6 text-muted-foreground"
                onClick={leaveQueue}
                disabled={leaving}
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                {leaving ? "Leaving..." : "Leave Queue"}
              </Button>
            </div>
          )}

          {/* NEXT UP — alert + leave option */}
          {playerStatus.type === "next_up" && (
            <div className="rounded-2xl border-2 border-primary bg-primary/5 dark:bg-primary/10 p-6 text-center animate-pulse-next">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary tracking-tight">YOU&apos;RE NEXT!</p>
              <p className="text-sm text-muted-foreground mt-2">Get ready — you&apos;ll be called to a court soon</p>
              <Button
                variant="ghost"
                className="mt-4 h-11 px-6 text-muted-foreground"
                onClick={leaveQueue}
                disabled={leaving}
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                {leaving ? "Leaving..." : "Leave Queue"}
              </Button>
            </div>
          )}

          {/* NOW PLAYING */}
          {playerStatus.type === "playing" && (
            <div className="rounded-2xl border-2 border-primary bg-primary/5 dark:bg-primary/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-lg font-bold text-primary">NOW PLAYING</p>
                  <p className="text-sm text-muted-foreground">{playerStatus.court.name}</p>
                </div>
                {playerStatus.game.created_at && (
                  <MatchTimer startedAt={playerStatus.game.created_at} />
                )}
              </div>
              <CourtVisual
                team1Players={playerStatus.game.team1_player_ids}
                team2Players={playerStatus.game.team2_player_ids}
                team1Score={playerStatus.game.team1_score}
                team2Score={playerStatus.game.team2_score}
                playerNames={playerNames}
              />
            </div>
          )}
        </section>

        {/* Courts Overview */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Courts</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courts.map((court) => {
              const activeGame = games.find(g => g.court_id === court.id)
              const isOpen = court.status === 'open'

              return (
                <div
                  key={court.id}
                  className={`rounded-xl border bg-card p-4 card-hover ${
                    !isOpen ? 'border-primary/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">{court.name}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isOpen
                        ? 'bg-primary/10 text-primary'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-primary' : 'bg-warning animate-pulse-soft'}`} aria-hidden="true" />
                      {isOpen ? 'Open' : 'In Use'}
                    </span>
                  </div>
                  {!isOpen && activeGame && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold tabular-nums">{activeGame.team1_score}</span>
                          <span className="text-xs text-muted-foreground">vs</span>
                          <span className="text-lg font-bold tabular-nums">{activeGame.team2_score}</span>
                        </div>
                        {activeGame.created_at && (
                          <MatchTimer startedAt={activeGame.created_at} />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[...activeGame.team1_player_ids, ...activeGame.team2_player_ids].map((pid, i) => (
                          <span key={pid} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            <PlayerAvatar name={playerNames[pid] || `P${i+1}`} size="sm" index={i} className="h-4 w-4 text-[8px]" />
                            {playerNames[pid] || `P${i+1}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {isOpen && (
                    <p className="text-xs text-muted-foreground mt-1">Ready for play</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Queue Positions */}
        {buckets.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ListOrdered className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Queue</h2>
            </div>

            <div className="space-y-2">
              {buckets.map((bucket, index) => {
                const isMyGroup = bucket.players.includes(userId)
                return (
                  <div
                    key={bucket.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                      isMyGroup
                        ? 'border-primary/40 bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/20'
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? 'bg-primary text-primary-foreground'
                          : isMyGroup
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {isMyGroup ? 'Your Group' : index === 0 ? 'Next Up' : `Group ${index + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{bucket.players.length} player{bucket.players.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {bucket.players.map((pid, i) => {
                        const name = pid === userId ? "You" : (playerNames[pid] || `P${i + 1}`)
                        return (
                          <div key={pid} className="flex items-center gap-0.5">
                            <PlayerAvatar
                              name={name}
                              size="sm"
                              index={i}
                              className="border-2 border-background"
                            />
                            <span className="text-[11px] text-muted-foreground max-w-[50px] truncate hidden sm:inline">
                              {name}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

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
                  ? new Date(game.completed_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : ""

                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold ${
                          team1Won ? "bg-primary/10 text-primary" : "text-muted-foreground"
                        }`}>
                          {team1Won && <Trophy className="h-3 w-3" />}
                          <span className="tabular-nums">{game.team1_score}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">-</span>
                        <div className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold ${
                          team2Won ? "bg-primary/10 text-primary" : "text-muted-foreground"
                        }`}>
                          {team2Won && <Trophy className="h-3 w-3" />}
                          <span className="tabular-nums">{game.team2_score}</span>
                        </div>
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
