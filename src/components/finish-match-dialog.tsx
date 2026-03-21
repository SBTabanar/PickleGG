"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FinishMatchDialogProps {
  sessionId: string
  gameId: string
  courtId: string
  team1Players: string[]
  team2Players: string[]
  onFinished: () => void
}

export function FinishMatchDialog({ 
  sessionId,
  gameId, 
  courtId, 
  team1Players, 
  team2Players, 
  onFinished 
}: FinishMatchDialogProps) {
  const [team1Score, setTeam1Score] = useState("0")
  const [team2Score, setTeam2Score] = useState("0")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      setTeam1Score("0")
      setTeam2Score("0")
      setError(null)
    }
  }

  function isValidScore(value: string): boolean {
    const num = parseInt(value, 10)
    return !isNaN(num) && num >= 0 && num <= 99 && String(num) === value.trim()
  }

  async function handleFinish() {
    if (!isValidScore(team1Score) || !isValidScore(team2Score)) {
      setError("Scores must be whole numbers between 0 and 99.")
      return
    }
    const t1Score = parseInt(team1Score, 10)
    const t2Score = parseInt(team2Score, 10)
    if (t1Score === t2Score) {
      setError("Scores cannot be tied. One team must win.")
      return
    }
    setLoading(true)
    setError(null)
    const winnerTeam = t1Score > t2Score ? 1 : 2

    try {
      // 1. Update Game
      const { error: gameError } = await supabase
        .from("games")
        .update({
          team1_score: t1Score,
          team2_score: t2Score,
          status: "completed",
          winner_team: winnerTeam,
          completed_at: new Date().toISOString(),
        })
        .eq("id", gameId)

      if (gameError) throw gameError

      // 2. Update Court
      const { error: courtError } = await supabase
        .from("courts")
        .update({
          status: "open",
          current_game_id: null,
        })
        .eq("id", courtId)

      if (courtError) throw courtError

      // 3. Update Player Stats
      // TODO: PRODUCTION — Replace with a Supabase RPC (Postgres function) that performs
      // atomic increments to eliminate the race condition in concurrent match finishes:
      //   CREATE FUNCTION increment_player_stats(p_id UUID, p_is_win BOOLEAN)
      //   RETURNS VOID AS $$
      //     UPDATE profiles SET
      //       games_played = games_played + 1,
      //       wins = wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      //       losses = losses + CASE WHEN NOT p_is_win THEN 1 ELSE 0 END
      //     WHERE id = p_id;
      //   $$ LANGUAGE sql;
      // Then call: supabase.rpc('increment_player_stats', { p_id: pid, p_is_win: isWin })
      //
      // The current read-then-write pattern is a race condition if two matches
      // finish simultaneously for the same player. Running updates in parallel
      // minimizes the window but does NOT eliminate it.
      const allPlayers = [...team1Players, ...team2Players]
      const updatePromises = allPlayers.map(async (pid) => {
        const isWin = (team1Players.includes(pid) && winnerTeam === 1) ||
                      (team2Players.includes(pid) && winnerTeam === 2)

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("games_played, wins, losses")
          .eq("id", pid)
          .single()

        if (profileError) {
          console.error(`Failed to fetch profile for player ${pid}:`, profileError.message)
          return
        }

        if (profile) {
          const { error: updateError } = await supabase.from("profiles").update({
            games_played: (profile.games_played || 0) + 1,
            wins: isWin ? (profile.wins || 0) + 1 : (profile.wins || 0),
            losses: !isWin ? (profile.losses || 0) + 1 : (profile.losses || 0),
          }).eq("id", pid)

          if (updateError) {
            console.error(`Failed to update stats for player ${pid}:`, updateError.message)
          }
        }
      })
      await Promise.all(updatePromises)

      // 4. Return players to queue (4 off)
      // They join as a group of 4 at the back
      await supabase.from("queue_entries").insert({
        session_id: sessionId,
        player_ids: allPlayers,
        status: "waiting",
        bucket_index: 0,
      })

      setOpen(false)
      onFinished()
    } catch (err) {
      // Log minimal info; do not expose database details to the user
      console.error("Error finishing match:", err instanceof Error ? err.message : "Unknown error")
      setError("Failed to finish match. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" className="w-full">Enter Score</Button>} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Finish Match</DialogTitle>
          <DialogDescription>
            Enter the final scores for both teams. Players will be returned to the back of the queue.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-8 py-4">
          <div className="grid gap-2 text-center">
            <Label htmlFor="team1" className="text-lg font-bold">Team 1</Label>
            <Input
              id="team1"
              type="number"
              min={0}
              max={99}
              className="text-center text-3xl h-16"
              value={team1Score}
              onChange={(e) => setTeam1Score(e.target.value)}
            />
          </div>
          <div className="grid gap-2 text-center">
            <Label htmlFor="team2" className="text-lg font-bold">Team 2</Label>
            <Input
              id="team2"
              type="number"
              min={0}
              max={99}
              className="text-center text-3xl h-16"
              value={team2Score}
              onChange={(e) => setTeam2Score(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleFinish} disabled={loading} className="w-full h-12 text-lg">
            {loading ? "Recording..." : "Finalize Match"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
