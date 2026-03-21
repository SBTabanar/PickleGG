"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Session, Court, QueueEntry } from "@/types/database"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import Link from "next/link"
import {
  ChevronLeft,
  Users,
  PlayCircle,
  Trophy,
  Swords,
  LayoutGrid,
  ListOrdered,
  BarChart3,
  CircleCheckBig,
  CircleAlert,
  Clock,
  X,
  Shield,
  Trash2,
  Timer,
  Square,
  AlarmClock,
} from "lucide-react"
import { JoinQueueDialog } from "@/components/join-queue-dialog"
import { FinishMatchDialog } from "@/components/finish-match-dialog"
import { ShareSession } from "@/components/share-session"
import { MatchHistory } from "@/components/match-history"
import { CourtVisual } from "@/components/court-visual"
import { PlayerAvatar } from "@/components/player-avatar"
import { Game, Profile } from "@/types/database"

const supabase = createClient()

const TIMER_OPTIONS = [
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "20 min", minutes: 20 },
]

function GameCountdown({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState("")
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    function update() {
      const diff = Math.floor((endsAt - Date.now()) / 1000)
      if (diff <= 0) {
        setRemaining("0:00")
        setExpired(true)
        return
      }
      setExpired(false)
      const mins = Math.floor(diff / 60)
      const secs = diff % 60
      setRemaining(`${mins}:${secs.toString().padStart(2, "0")}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${expired ? "text-destructive animate-pulse" : "text-primary"}`}>
      <AlarmClock className="h-3 w-3" />
      {expired ? "TIME'S UP" : remaining}
    </span>
  )
}

interface ManagerDashboardProps {
  initialSession: Session
  initialCourts: Court[]
  initialQueue: QueueEntry[]
  userId: string
}

export function ManagerDashboard({
  initialSession,
  initialCourts,
  initialQueue,
  userId,
}: ManagerDashboardProps) {
  const [session] = useState<Session>(initialSession)
  const [courts, setCourts] = useState<Court[]>(initialCourts)
  const [queue, setQueue] = useState<QueueEntry[]>(initialQueue)
  const [games, setGames] = useState<Game[]>([])
  const [completedGames, setCompletedGames] = useState<Game[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({})
  const [gameTimers, setGameTimers] = useState<Record<string, number>>({})
  const [showTimerPicker, setShowTimerPicker] = useState<string | null>(null)

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
      .limit(50)
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

  function setTimerForGame(gameId: string, minutes: number) {
    const game = games.find(g => g.id === gameId)
    if (!game) return
    const startTime = new Date(game.created_at).getTime()
    const endsAt = startTime + minutes * 60 * 1000
    setGameTimers(prev => ({ ...prev, [gameId]: endsAt }))
    setShowTimerPicker(null)
  }

  function clearTimerForGame(gameId: string) {
    setGameTimers(prev => {
      const next = { ...prev }
      delete next[gameId]
      return next
    })
    setShowTimerPicker(null)
  }

  async function endGame(gameId: string, courtId: string) {
    setLoading(courtId)
    setActionError(null)
    try {
      const game = games.find(g => g.id === gameId)
      if (!game) throw new Error("Game not found")

      const { error: gameError } = await supabase
        .from("games")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", gameId)
      if (gameError) throw gameError

      const { error: courtError } = await supabase
        .from("courts")
        .update({ status: "open", current_game_id: null })
        .eq("id", courtId)
      if (courtError) throw courtError

      // Return players to queue
      const allPlayers = [...game.team1_player_ids, ...game.team2_player_ids]
      await supabase.from("queue_entries").insert({
        session_id: session.id,
        player_ids: allPlayers,
        status: "waiting",
        bucket_index: 0,
      })

      clearTimerForGame(gameId)
    } catch (err) {
      console.error("Error ending game:", err instanceof Error ? err.message : "Unknown error")
      setActionError("Failed to end game. Please try again.")
    } finally {
      setLoading(null)
    }
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
      console.error("Error starting match:", err instanceof Error ? err.message : "Unknown error")
      setActionError("Failed to start match. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  async function removeFromQueue(entryIds: string[]) {
    try {
      const { error } = await supabase
        .from("queue_entries")
        .delete()
        .in("id", entryIds)
      if (error) throw error
    } catch (err) {
      console.error("Error removing from queue:", err instanceof Error ? err.message : "Unknown error")
      setActionError("Failed to remove from queue. Please try again.")
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

  // Build buckets from queue
  const buckets: { id: string; players: string[]; entryIds: string[] }[] = []
  let currentBucket: string[] = []
  let currentEntryIds: string[] = []

  queue.forEach((entry) => {
    if (!currentEntryIds.includes(entry.id)) {
      currentEntryIds.push(entry.id)
    }
    entry.player_ids.forEach(pid => {
      if (currentBucket.length === 4) {
        buckets.push({ id: `bucket-${buckets.length}`, players: currentBucket, entryIds: [...currentEntryIds] })
        currentBucket = []
        currentEntryIds = [entry.id]
      }
      currentBucket.push(pid)
    })
  })
  if (currentBucket.length > 0) {
    buckets.push({ id: `bucket-${buckets.length}`, players: currentBucket, entryIds: currentEntryIds })
  }

  const activeCourts = courts.filter(c => c.status === 'in_use').length
  const totalPlayers = queue.reduce((sum, q) => sum + q.player_ids.length, 0)
  const playingPlayers = games.reduce((sum, g) => sum + g.team1_player_ids.length + g.team2_player_ids.length, 0)
  const totalGamesPlayed = completedGames.length

  return (
    <div className="flex min-h-screen w-full flex-col">
      {/* Header */}
      <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 md:px-6 z-10">
        <nav aria-label="Breadcrumb">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </nav>
        <div className="flex-1 flex items-center justify-center gap-2">
          <h1 className="text-sm font-semibold truncate">{session.name}</h1>
          {session.status === 'active' && (
            <span role="status" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" aria-hidden="true" />
              Live
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Shield className="h-3 w-3" />
            Manager
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShareSession shareCode={session.share_code} sessionName={session.name} />
          <ModeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-0 w-full">
        {/* Top Stats & Actions Bar */}
        <div className="border-b bg-card/50">
          <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Stats pills */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium tabular-nums animate-count-up">{totalPlayers + playingPlayers} players</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5">
                  <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium tabular-nums animate-count-up">{courts.length} courts</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium tabular-nums animate-count-up">{totalGamesPlayed} games</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <JoinQueueDialog sessionId={session.id} onJoined={() => {}} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                  {showHistory ? 'Hide History' : 'Stats & History'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col gap-6">
          {/* Action error banner */}
          {actionError && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 animate-fade-in">
              <CircleAlert className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive flex-1">{actionError}</p>
              <button
                onClick={() => setActionError(null)}
                className="text-destructive/40 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Queue Empty State / Info Banner */}
          {totalPlayers === 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <CircleAlert className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-foreground">No players in rotation. Add players to get started!</p>
            </div>
          )}

          {/* Rotation / Queue Section */}
          {buckets.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ListOrdered className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rotation</h2>
                <span className="text-xs text-muted-foreground ml-1">({totalPlayers} in queue)</span>
              </div>

              <div className="grid gap-2">
                {buckets.map((bucket, index) => (
                  <div
                    key={bucket.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 animate-fade-in card-hover ${
                      index === 0
                        ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                        : 'bg-card hover:bg-muted/30'
                    }`}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex items-center gap-3">
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
                            <span role="status" className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              <PlayCircle className="h-3 w-3" />
                              Ready
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{bucket.players.length} / 4 players</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {bucket.players.map((pid, i) => (
                          <div key={pid} className="flex items-center gap-1">
                            <PlayerAvatar
                              name={playerNames[pid] || `P${i + 1}`}
                              size="sm"
                              index={i}
                              className="border-2 border-background"
                            />
                            <span className="text-xs text-muted-foreground max-w-[70px] truncate hidden sm:inline">
                              {playerNames[pid] || `P${i + 1}`}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromQueue(bucket.entryIds)}
                        aria-label={`Remove group ${index + 1} from queue`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Courts Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Courts</h2>
              <span className="text-xs text-muted-foreground ml-1">({activeCourts} / {courts.length} active)</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {courts.map((court, courtIndex) => {
                const activeGame = games.find(g => g.court_id === court.id)
                const isOpen = court.status === 'open'

                return (
                  <div
                    key={court.id}
                    className={`rounded-2xl border bg-card overflow-hidden transition-all duration-200 animate-scale-in ${
                      !isOpen ? 'border-primary/20 ring-1 ring-primary/10 animate-glow' : ''
                    }`}
                    style={{ animationDelay: `${courtIndex * 80}ms` }}
                  >
                    {/* Court header bar */}
                    <div className={`flex items-center justify-between px-5 py-3 ${
                      isOpen ? 'bg-muted/30' : 'bg-primary/5 dark:bg-primary/10'
                    }`}>
                      <p className="text-sm font-semibold">{court.name}</p>
                      <span role="status" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                        isOpen
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-warning/30 bg-warning/10 text-warning'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-primary' : 'bg-warning animate-pulse-soft'}`} aria-hidden="true" />
                        {isOpen ? 'Available' : 'In Progress'}
                      </span>
                    </div>

                    {/* Court body */}
                    <div className="p-5">
                      {isOpen ? (
                        <div className="flex flex-col items-center gap-3 py-6">
                          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <CircleCheckBig className="h-8 w-8 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">Ready for play</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {buckets.length > 0 && buckets[0].players.length >= 4
                                ? 'Click "Start Match" to assign players'
                                : 'Add more players to the queue first'
                              }
                            </p>
                          </div>
                          <Button
                            className="w-full mt-2"
                            onClick={() => startMatch(court.id)}
                            disabled={loading === court.id || buckets.length === 0 || buckets[0].players.length < 4}
                          >
                            <Swords className="mr-2 h-4 w-4" />
                            {loading === court.id ? "Starting..." : "Start Match"}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Timer display */}
                          {activeGame && gameTimers[activeGame.id] && (
                            <div className="flex items-center justify-center">
                              <GameCountdown endsAt={gameTimers[activeGame.id]} />
                            </div>
                          )}

                          <CourtVisual
                            team1Players={activeGame?.team1_player_ids ?? []}
                            team2Players={activeGame?.team2_player_ids ?? []}
                            team1Score={activeGame?.team1_score ?? 0}
                            team2Score={activeGame?.team2_score ?? 0}
                            startedAt={activeGame?.created_at}
                            playerNames={playerNames}
                          />

                          {activeGame && (
                            <div className="space-y-2">
                              {/* Timer controls */}
                              <div className="relative">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => setShowTimerPicker(showTimerPicker === activeGame.id ? null : activeGame.id)}
                                >
                                  <Timer className="mr-1.5 h-3.5 w-3.5" />
                                  {gameTimers[activeGame.id] ? "Change Timer" : "Set Timer"}
                                </Button>
                                {showTimerPicker === activeGame.id && (
                                  <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border bg-popover p-2 shadow-md animate-fade-in">
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {TIMER_OPTIONS.map(opt => (
                                        <Button
                                          key={opt.minutes}
                                          variant="outline"
                                          size="sm"
                                          className="text-xs"
                                          onClick={() => setTimerForGame(activeGame.id, opt.minutes)}
                                        >
                                          {opt.label}
                                        </Button>
                                      ))}
                                    </div>
                                    {gameTimers[activeGame.id] && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full mt-1.5 text-xs text-muted-foreground"
                                        onClick={() => clearTimerForGame(activeGame.id)}
                                      >
                                        Clear Timer
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="grid grid-cols-2 gap-2">
                                <FinishMatchDialog
                                  sessionId={session.id}
                                  gameId={activeGame.id}
                                  courtId={court.id}
                                  team1Players={activeGame.team1_player_ids}
                                  team2Players={activeGame.team2_player_ids}
                                  onFinished={() => clearTimerForGame(activeGame.id)}
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => endGame(activeGame.id, court.id)}
                                  disabled={loading === court.id}
                                >
                                  <Square className="mr-1.5 h-3.5 w-3.5" />
                                  {loading === court.id ? "Ending..." : "End Game"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Match History (toggled via button) */}
          {showHistory && (
            <section className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Match History</h2>
                <span className="text-xs text-muted-foreground ml-1">({completedGames.length} games)</span>
              </div>
              <MatchHistory games={completedGames} />
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
