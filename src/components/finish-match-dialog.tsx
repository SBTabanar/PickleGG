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
  gameId: string
  courtId: string
  team1Players: string[]
  team2Players: string[]
  onFinished: () => void
}

export function FinishMatchDialog({ 
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
  const supabase = createClient()

  async function handleFinish() {
    setLoading(true)
    const t1Score = parseInt(team1Score)
    const t2Score = parseInt(team2Score)
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

      // 3. Update Player Stats (Simplified for prototype)
      // Increment games_played, wins/losses for all 4 players
      const allPlayers = [...team1Players, ...team2Players]
      for (const pid of allPlayers) {
        const isWin = (team1Players.includes(pid) && winnerTeam === 1) || 
                      (team2Players.includes(pid) && winnerTeam === 2)
        
        // Using rpc or manual update
        const { data: profile } = await supabase.from("profiles").select("games_played, wins, losses").eq("id", pid).single()
        if (profile) {
          await supabase.from("profiles").update({
            games_played: (profile.games_played || 0) + 1,
            wins: isWin ? (profile.wins || 0) + 1 : profile.wins,
            losses: !isWin ? (profile.losses || 0) + 1 : profile.losses,
          }).eq("id", pid)
        }
      }

      // 4. Return players to queue (4 off)
      // They join as a group of 4 at the back
      await supabase.from("queue_entries").insert({
        session_id: (await supabase.from("games").select("session_id").eq("id", gameId).single()).data?.session_id,
        player_ids: allPlayers,
        status: "waiting",
      })

      setOpen(false)
      onFinished()
    } catch (error) {
      console.error("Error finishing match:", error)
      alert("Failed to finish match")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">Enter Score</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Finish Match</DialogTitle>
          <DialogDescription>
            Enter the final scores for both teams. Players will be returned to the back of the queue.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-8 py-4">
          <div className="grid gap-2 text-center">
            <Label htmlFor="team1" className="text-lg font-bold">Team 1</Label>
            <Input
              id="team1"
              type="number"
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
