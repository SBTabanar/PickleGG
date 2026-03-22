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
import { rematchAction, shuffleRematchAction, playerSubmitScoreAction } from "@/app/dashboard/session/[id]/actions"
import { Trophy, Repeat, Shuffle, ArrowRight } from "lucide-react"

interface FinishMatchDialogProps {
  sessionId: string
  gameId: string
  courtId: string
  team1Players: string[]
  team2Players: string[]
  playerNames?: Record<string, string>
  onFinished: () => void
  isPlayer?: boolean
  userId?: string
}

type Phase = "score_entry" | "post_game"

export function FinishMatchDialog({
  sessionId,
  gameId,
  courtId,
  team1Players,
  team2Players,
  playerNames = {},
  onFinished,
  isPlayer = false,
  userId,
}: FinishMatchDialogProps) {
  const [team1Score, setTeam1Score] = useState("0")
  const [team2Score, setTeam2Score] = useState("0")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>("score_entry")
  const [finalScores, setFinalScores] = useState<{ t1: number; t2: number; winner: 1 | 2 } | null>(null)
  const [rematchLoading, setRematchLoading] = useState(false)
  const supabase = createClient()

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      setTeam1Score("0")
      setTeam2Score("0")
      setError(null)
      setPhase("score_entry")
      setFinalScores(null)
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
      if (isPlayer) {
        // Player submits score via server action
        const result = await playerSubmitScoreAction(sessionId, gameId, courtId, t1Score, t2Score)
        if (result.error) {
          setError(result.error)
          return
        }
      } else {
        // Manager submits score via direct Supabase calls
        const { error: gameError } = await supabase
          .from("games")
          .update({
            team1_score: t1Score,
            team2_score: t2Score,
            status: "completed",
            winner_team: winnerTeam,
            completed_at: new Date().toISOString(),
            scored_by: userId || null,
          })
          .eq("id", gameId)

        if (gameError) throw gameError

        const { error: courtError } = await supabase
          .from("courts")
          .update({
            status: "open",
            current_game_id: null,
          })
          .eq("id", courtId)

        if (courtError) throw courtError

        const allPlayers = [...team1Players, ...team2Players]
        const updatePromises = allPlayers.map(async (pid) => {
          const isWin = (team1Players.includes(pid) && winnerTeam === 1) ||
                        (team2Players.includes(pid) && winnerTeam === 2)

          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("games_played, wins, losses")
            .eq("id", pid)
            .single()

          if (profileError) return

          if (profile) {
            await supabase.from("profiles").update({
              games_played: (profile.games_played || 0) + 1,
              wins: isWin ? (profile.wins || 0) + 1 : (profile.wins || 0),
              losses: !isWin ? (profile.losses || 0) + 1 : (profile.losses || 0),
            }).eq("id", pid)
          }
        })
        await Promise.all(updatePromises)

        await supabase.from("queue_entries").insert({
          session_id: sessionId,
          player_ids: allPlayers,
          status: "waiting",
          bucket_index: 0,
        })
      }

      setFinalScores({ t1: t1Score, t2: t2Score, winner: winnerTeam as 1 | 2 })
      setPhase("post_game")
      onFinished()
    } catch (err) {
      console.error("Error finishing match:", err instanceof Error ? err.message : "Unknown error")
      setError("Failed to finish match. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRematch() {
    setRematchLoading(true)
    setError(null)
    const result = await rematchAction(sessionId, courtId, team1Players, team2Players)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
    }
    setRematchLoading(false)
  }

  async function handleShuffle() {
    setRematchLoading(true)
    setError(null)
    const allPlayers = [...team1Players, ...team2Players]
    const result = await shuffleRematchAction(sessionId, courtId, allPlayers)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
    }
    setRematchLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" className="w-full">Enter Score</Button>} />
      <DialogContent className="sm:max-w-[425px]">
        {phase === "score_entry" && (
          <>
            <DialogHeader>
              <DialogTitle>Finish Match</DialogTitle>
              <DialogDescription>
                Enter the final scores for both teams.
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
          </>
        )}

        {phase === "post_game" && finalScores && (
          <>
            <DialogHeader>
              <DialogTitle>Match Complete!</DialogTitle>
              <DialogDescription>
                Players have been returned to the queue. What&apos;s next?
              </DialogDescription>
            </DialogHeader>

            {/* Score summary */}
            <div className="flex items-center justify-center gap-4 py-4">
              <div className={`text-center px-4 py-2 rounded-lg ${finalScores.winner === 1 ? 'bg-primary/10' : ''}`}>
                <p className="text-xs text-muted-foreground mb-1">Team 1</p>
                <p className="text-3xl font-bold tabular-nums">{finalScores.t1}</p>
                {finalScores.winner === 1 && <Trophy className="h-4 w-4 text-primary mx-auto mt-1" />}
              </div>
              <span className="text-muted-foreground font-medium">vs</span>
              <div className={`text-center px-4 py-2 rounded-lg ${finalScores.winner === 2 ? 'bg-primary/10' : ''}`}>
                <p className="text-xs text-muted-foreground mb-1">Team 2</p>
                <p className="text-3xl font-bold tabular-nums">{finalScores.t2}</p>
                {finalScores.winner === 2 && <Trophy className="h-4 w-4 text-primary mx-auto mt-1" />}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="grid gap-2">
              <Button
                onClick={handleRematch}
                disabled={rematchLoading}
                variant="outline"
                className="h-12"
              >
                <Repeat className="mr-2 h-4 w-4" />
                Rematch (Same Teams)
              </Button>
              <Button
                onClick={handleShuffle}
                disabled={rematchLoading}
                variant="outline"
                className="h-12"
              >
                <Shuffle className="mr-2 h-4 w-4" />
                Shuffle & Play Again
              </Button>
              <Button
                onClick={() => setOpen(false)}
                variant="ghost"
                className="h-12 text-muted-foreground"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
