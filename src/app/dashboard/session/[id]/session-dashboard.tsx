"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Session, Court, QueueEntry } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModeToggle } from "@/components/mode-toggle"
import Link from "next/link"
import { ChevronLeft, Users, Trophy, PlayCircle } from "lucide-react"
import { JoinQueueDialog } from "@/components/join-queue-dialog"
import { FinishMatchDialog } from "@/components/finish-match-dialog"
import { Game } from "@/types/database"

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
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchActiveGames()
  }, [])

  async function fetchActiveGames() {
    const { data } = await supabase
      .from("games")
      .select("*")
      .eq("session_id", session.id)
      .eq("status", "in_progress")
    if (data) setGames(data as Game[])
  }

  async function startMatch(courtId: string) {
    if (buckets.length === 0 || buckets[0].players.length < 4) {
      alert("Need at least 4 players in the first bucket to start a match.")
      return
    }

    setLoading(courtId)
    try {
      const players = buckets[0].players
      const team1 = [players[0], players[1]]
      const team2 = [players[2], players[3]]

      // 1. Create Game
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

      // 2. Update Court
      const { error: courtError } = await supabase
        .from("courts")
        .update({
          status: "in_use",
          current_game_id: game.id,
        })
        .eq("id", courtId)

      if (courtError) throw courtError

      // 3. Mark queue entries as playing
      // We need to find which queue_entries contributed to this bucket
      // For the prototype, we'll just mark the entries that have these players
      // Note: This logic might need refinement if players are split across entries
      const { error: queueError } = await supabase
        .from("queue_entries")
        .update({ status: "playing" })
        .in("id", queue.filter(q => q.player_ids.some(pid => players.includes(pid))).map(q => q.id))

      if (queueError) throw queueError

    } catch (error) {
      console.error("Error starting match:", error)
      alert("Failed to start match")
    } finally {
      setLoading(null)
    }
  }

  useEffect(() => {
    // Real-time subscription for courts
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

    // Real-time subscription for queue entries
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

    // Real-time subscription for games
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
  }, [session.id, supabase])

  // Helper to group queue entries into buckets of 4 players
  const buckets: { id: string; players: string[] }[] = []
  let currentBucket: string[] = []
  
  queue.forEach((entry) => {
    // This is a simplified bucket logic. 
    // In a real "paddle rack", people can join as singles, doubles, or fours.
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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </Link>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold truncate max-w-[200px] md:max-w-none mx-auto">
            {session.name}
          </h1>
        </div>
        <ModeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-6xl mx-auto w-full">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wait Time</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">~15 min</div>
              <p className="text-xs text-muted-foreground">{buckets.length} buckets waiting</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courts</CardTitle>
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courts.filter(c => c.status === 'in_use').length} / {courts.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="courts">Courts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="queue" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">The Paddle Rack</h2>
              <JoinQueueDialog sessionId={session.id} onJoined={() => {}} />
            </div>
            
            <div className="grid gap-4">
              {buckets.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground">The queue is currently empty.</p>
                </div>
              ) : (
                buckets.map((bucket, index) => (
                  <Card key={bucket.id} className={index === 0 ? "border-primary bg-primary/5" : ""}>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center justify-center h-12 w-12 rounded-full bg-muted font-bold text-lg">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-lg">Bucket {index + 1}</p>
                          <p className="text-sm text-muted-foreground">
                            {bucket.players.length} / 4 Players
                          </p>
                        </div>
                      </div>
                      <div className="flex -space-x-2">
                         {bucket.players.map((pid, i) => (
                           <div key={pid} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">P{i+1}</div>
                         ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="courts" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courts.map((court) => (
                <Card key={court.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{court.name}</CardTitle>
                        <CardDescription className={court.status === 'open' ? "text-green-500" : "text-blue-500"}>
                          {court.status === 'open' ? "Available" : "Match in Progress"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {court.status === 'open' ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <p className="text-sm text-muted-foreground mb-4">No active game on this court.</p>
                        <Button 
                          className="w-full" 
                          onClick={() => startMatch(court.id)}
                          disabled={loading === court.id || buckets.length === 0 || buckets[0].players.length < 4}
                        >
                          {loading === court.id ? "Starting..." : "Start Match"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-xs text-muted-foreground uppercase tracking-widest">In Progress</span>
                        </div>
                        <div className="flex justify-between items-center text-3xl font-black italic">
                          <span>{games.find(g => g.court_id === court.id)?.team1_score || 0}</span>
                          <span className="text-muted-foreground text-xs font-normal not-italic mx-2">VS</span>
                          <span>{games.find(g => g.court_id === court.id)?.team2_score || 0}</span>
                        </div>
                        {games.find(g => g.court_id === court.id) && (
                          <FinishMatchDialog 
                            gameId={games.find(g => g.court_id === court.id)!.id}
                            courtId={court.id}
                            team1Players={games.find(g => g.court_id === court.id)!.team1_player_ids}
                            team2Players={games.find(g => g.court_id === court.id)!.team2_player_ids}
                            onFinished={() => {}}
                          />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
