"use client"

import { useEffect, useState, useRef } from "react"
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
import { startMatchAction, endGameAction, removeFromQueueAction, reorderQueueAction, forceRequeueAction } from "./actions"
import { EditGroupDialog } from "@/components/edit-group-dialog"
import { GameReactions } from "@/components/game-reactions"
import { Pencil, UserCheck, GripVertical, Coffee } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

const supabase = createClient()

const TIMER_OPTIONS = [
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "20 min", minutes: 20 },
]

function GameCountdown({ endsAt, onExpired }: { endsAt: number; onExpired?: () => void }) {
  const [remaining, setRemaining] = useState("")
  const [expired, setExpired] = useState(false)
  const expiredCalledRef = useRef(false)

  useEffect(() => {
    expiredCalledRef.current = false
  }, [endsAt])

  useEffect(() => {
    function update() {
      const diff = Math.floor((endsAt - Date.now()) / 1000)
      if (diff <= 0) {
        setRemaining("0:00")
        setExpired(true)
        if (!expiredCalledRef.current && onExpired) {
          expiredCalledRef.current = true
          onExpired()
        }
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
  }, [endsAt, onExpired])

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${expired ? "text-destructive animate-pulse" : "text-primary"}`}>
      <AlarmClock className="h-3 w-3" />
      {expired ? "TIME'S UP" : remaining}
    </span>
  )
}

interface SortableQueueItemProps {
  entry: QueueEntry
  index: number
  nextUpPlayers: string[]
  playerNames: Record<string, string>
  onEdit: (entry: { id: string; playerIds: string[] }) => void
  onRemove: (entryIds: string[]) => void
}

function SortableQueueItem({ entry, index, nextUpPlayers, playerNames, onEdit, onRemove }: SortableQueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  }

  const isFirst = index === 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${
        isDragging ? 'shadow-lg ring-2 ring-primary/30' : 'card-hover'
      } ${
        isFirst
          ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
          : 'bg-card hover:bg-muted/30'
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1 -ml-1"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder group ${index + 1}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
          isFirst
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        }`}>
          {index + 1}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              {isFirst ? 'Next Up' : `Group ${index + 1}`}
            </p>
            {isFirst && nextUpPlayers.length >= 4 && (
              <span role="status" className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <PlayCircle className="h-3 w-3" />
                Ready
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{entry.player_ids.length} player{entry.player_ids.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {entry.player_ids.map((pid, i) => (
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
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit({ id: entry.id, playerIds: entry.player_ids })}
          aria-label={`Edit group ${index + 1}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove([entry.id])}
          aria-label={`Remove group ${index + 1} from queue`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
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
  const [editingEntry, setEditingEntry] = useState<{ id: string; playerIds: string[] } | null>(null)
  const [restingEntries, setRestingEntries] = useState<QueueEntry[]>([])
  const [startingCourt, setStartingCourt] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = queue.findIndex(q => q.id === active.id)
    const newIndex = queue.findIndex(q => q.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newQueue = arrayMove(queue, oldIndex, newIndex)
    setQueue(newQueue) // optimistic update

    const result = await reorderQueueAction(session.id, newQueue.map(q => q.id))
    if (result.error) {
      setActionError(result.error)
      refetchQueue() // rollback on error
    }
  }

  useEffect(() => {
    fetchActiveGames()
    fetchCompletedGames()
    fetchProfiles()
    fetchRestingEntries()
  }, [])

  async function fetchRestingEntries() {
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("session_id", session.id)
      .eq("status", "resting")
    if (data) setRestingEntries(data as QueueEntry[])
  }

  async function handleForceRequeue(entryId: string) {
    setActionError(null)
    const result = await forceRequeueAction(session.id, entryId)
    if (result.error) setActionError(result.error)
  }

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

  function clearTimerForGame(gameId: string) {
    setGameTimers(prev => {
      const next = { ...prev }
      delete next[gameId]
      return next
    })
  }

  async function endGame(gameId: string, courtId: string) {
    setLoading(courtId)
    setActionError(null)
    const result = await endGameAction(session.id, gameId, courtId)
    if (result.error) {
      setActionError(result.error)
    } else {
      clearTimerForGame(gameId)
    }
    setLoading(null)
  }

  async function startMatch(courtId: string, timerMinutes?: number) {
    if (nextUpPlayers.length < 4) {
      setActionError("Need at least 4 players in the queue to start a match.")
      return
    }
    setLoading(courtId)
    setActionError(null)
    setStartingCourt(null)
    const result = await startMatchAction(session.id, courtId, nextUpPlayers.slice(0, 4))
    if (result.error) {
      setActionError(result.error)
    } else if (timerMinutes && result.gameId) {
      // Set timer based on creation time (now)
      const endsAt = Date.now() + timerMinutes * 60 * 1000
      setGameTimers(prev => ({ ...prev, [result.gameId!]: endsAt }))
    }
    setLoading(null)
  }

  async function autoEndGame(gameId: string, courtId: string) {
    setActionError(null)
    const result = await endGameAction(session.id, gameId, courtId)
    if (result.error) {
      setActionError(result.error)
    } else {
      clearTimerForGame(gameId)
    }
  }

  async function removeFromQueue(entryIds: string[]) {
    setActionError(null)
    // Optimistically remove from local state
    setQueue(prev => prev.filter(q => !entryIds.includes(q.id)))
    const result = await removeFromQueueAction(session.id, entryIds)
    if (result.error) {
      setActionError(result.error)
      // Re-fetch on error to restore state
      const { data } = await supabase
        .from("queue_entries")
        .select("*")
        .eq("session_id", session.id)
        .eq("status", "waiting")
        .order("joined_at", { ascending: true })
      if (data) setQueue(data as QueueEntry[])
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
          } else if (payload.new.status === 'resting') {
            setRestingEntries(prev => [...prev, payload.new as QueueEntry])
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status === 'resting') {
            setQueue(prev => prev.filter(q => q.id !== payload.new.id))
            setRestingEntries(prev => {
              const exists = prev.some(e => e.id === payload.new.id)
              return exists ? prev.map(e => e.id === payload.new.id ? payload.new as QueueEntry : e) : [...prev, payload.new as QueueEntry]
            })
          } else if (payload.new.status === 'waiting') {
            setRestingEntries(prev => prev.filter(e => e.id !== payload.new.id))
            setQueue(prev => {
              const exists = prev.some(q => q.id === payload.new.id)
              const updated = exists ? prev.map(q => q.id === payload.new.id ? payload.new as QueueEntry : q) : [...prev, payload.new as QueueEntry]
              return updated.sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
            })
          } else {
            setQueue(prev => prev.filter(q => q.id !== payload.new.id))
            setRestingEntries(prev => prev.filter(e => e.id !== payload.new.id))
          }
        } else if (payload.eventType === 'DELETE') {
          setQueue(prev => prev.filter(q => q.id !== payload.old.id))
          setRestingEntries(prev => prev.filter(e => e.id !== payload.old.id))
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

    // Poll queue as fallback (realtime DELETE events need REPLICA IDENTITY FULL)
    const pollInterval = setInterval(refetchQueue, 5000)

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(courtsChannel)
      supabase.removeChannel(queueChannel)
      supabase.removeChannel(gamesChannel)
    }
  }, [session.id])

  // Collect the first 4 players from the queue for starting a match
  const nextUpPlayers: string[] = []
  for (const entry of queue) {
    for (const pid of entry.player_ids) {
      if (nextUpPlayers.length < 4) nextUpPlayers.push(pid)
    }
    if (nextUpPlayers.length >= 4) break
  }

  // All player IDs currently in the queue
  const allQueuePlayerIds = queue.flatMap(q => q.player_ids)

  // All player IDs currently playing
  const playingPlayerIds = games.flatMap(g => [...g.team1_player_ids, ...g.team2_player_ids])

  // All active players (queue + playing, deduplicated)
  const allActivePlayerIds = [...new Set([...allQueuePlayerIds, ...playingPlayerIds])]

  const activeCourts = courts.filter(c => c.status === 'in_use').length
  const totalPlayers = allQueuePlayerIds.length
  const playingPlayers = playingPlayerIds.length
  const totalGamesPlayed = completedGames.length

  async function refetchQueue() {
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("session_id", session.id)
      .eq("status", "waiting")
      .order("joined_at", { ascending: true })
    if (data) setQueue(data as QueueEntry[])

    const { data: restData } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("session_id", session.id)
      .eq("status", "resting")
    if (restData) setRestingEntries(restData as QueueEntry[])
  }

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

          {/* Active Players */}
          {allActivePlayerIds.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Active Players</h2>
                <span className="text-xs text-muted-foreground ml-1">({allActivePlayerIds.length} total)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allActivePlayerIds.map((pid, i) => {
                  const isPlaying = playingPlayerIds.includes(pid)
                  return (
                    <div
                      key={pid}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        isPlaying
                          ? 'border-primary/30 bg-primary/5 text-primary'
                          : 'bg-card text-foreground'
                      }`}
                    >
                      <PlayerAvatar name={playerNames[pid] || `P${i+1}`} size="sm" index={i} className="h-5 w-5 text-[8px]" />
                      <span className="max-w-[80px] truncate">{playerNames[pid] || `P${i+1}`}</span>
                      {isPlaying && <span className="text-[10px] text-primary/60">playing</span>}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Queue / Rotation Section */}
          {queue.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ListOrdered className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Queue</h2>
                <span className="text-xs text-muted-foreground ml-1">({totalPlayers} waiting)</span>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={queue.map(q => q.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid gap-2">
                    {queue.map((entry, index) => (
                      <SortableQueueItem
                        key={entry.id}
                        entry={entry}
                        index={index}
                        nextUpPlayers={nextUpPlayers}
                        playerNames={playerNames}
                        onEdit={setEditingEntry}
                        onRemove={removeFromQueue}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}

          {/* Resting Players */}
          {restingEntries.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Coffee className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resting Players</h2>
                <span className="text-xs text-muted-foreground ml-1">({restingEntries.reduce((sum, e) => sum + e.player_ids.length, 0)} resting)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {restingEntries.map((entry) =>
                  entry.player_ids.map((pid, i) => (
                    <div
                      key={pid}
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 text-xs font-medium"
                    >
                      <PlayerAvatar name={playerNames[pid] || `P${i+1}`} size="sm" index={i} className="h-5 w-5 text-[8px]" />
                      <span className="max-w-[80px] truncate">{playerNames[pid] || `P${i+1}`}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] text-amber-600 dark:text-amber-400 hover:text-foreground"
                        onClick={() => handleForceRequeue(entry.id)}
                      >
                        Requeue
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Edit Group Dialog */}
          {editingEntry && (
            <EditGroupDialog
              sessionId={session.id}
              entryId={editingEntry.id}
              currentPlayerIds={editingEntry.playerIds}
              allQueuePlayerIds={allQueuePlayerIds}
              open={!!editingEntry}
              onOpenChange={(open) => { if (!open) setEditingEntry(null) }}
              onUpdated={refetchQueue}
            />
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
                              {nextUpPlayers.length >= 4
                                ? startingCourt === court.id
                                  ? 'Set a match timer or start without one'
                                  : 'Click "Start Match" to assign players'
                                : 'Add more players to the queue first'
                              }
                            </p>
                          </div>

                          {startingCourt === court.id ? (
                            <div className="w-full space-y-2 mt-2 animate-fade-in">
                              <p className="text-xs font-medium text-center text-muted-foreground">Match Timer</p>
                              <div className="grid grid-cols-3 gap-2">
                                {TIMER_OPTIONS.map(opt => (
                                  <Button
                                    key={opt.minutes}
                                    variant="outline"
                                    size="sm"
                                    disabled={loading === court.id}
                                    onClick={() => startMatch(court.id, opt.minutes)}
                                  >
                                    <AlarmClock className="mr-1 h-3 w-3" />
                                    {opt.label}
                                  </Button>
                                ))}
                              </div>
                              <Button
                                className="w-full"
                                disabled={loading === court.id}
                                onClick={() => startMatch(court.id)}
                              >
                                <Swords className="mr-2 h-4 w-4" />
                                {loading === court.id ? "Starting..." : "No Timer"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground"
                                onClick={() => setStartingCourt(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              className="w-full mt-2"
                              onClick={() => setStartingCourt(court.id)}
                              disabled={loading === court.id || nextUpPlayers.length < 4}
                            >
                              <Swords className="mr-2 h-4 w-4" />
                              Start Match
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Timer display */}
                          {activeGame && gameTimers[activeGame.id] && (
                            <div className="flex items-center justify-center">
                              <GameCountdown
                                endsAt={gameTimers[activeGame.id]}
                                onExpired={() => autoEndGame(activeGame.id, court.id)}
                              />
                            </div>
                          )}

                          <div className="relative">
                            <CourtVisual
                              team1Players={activeGame?.team1_player_ids ?? []}
                              team2Players={activeGame?.team2_player_ids ?? []}
                              team1Score={activeGame?.team1_score ?? 0}
                              team2Score={activeGame?.team2_score ?? 0}
                              startedAt={activeGame?.created_at}
                              playerNames={playerNames}
                            />
                            {activeGame && <GameReactions sessionId={session.id} gameId={activeGame.id} />}
                          </div>

                          {activeGame && (
                            <div className="space-y-2">
                              {/* Action buttons */}
                              <div className="grid grid-cols-2 gap-2">
                                <FinishMatchDialog
                                  sessionId={session.id}
                                  gameId={activeGame.id}
                                  courtId={court.id}
                                  team1Players={activeGame.team1_player_ids}
                                  team2Players={activeGame.team2_player_ids}
                                  playerNames={playerNames}
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
