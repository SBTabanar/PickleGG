"use client"

import { cn } from "@/lib/utils"
import { PlayerAvatar } from "./player-avatar"
import { Timer } from "lucide-react"
import { useEffect, useState } from "react"

interface CourtVisualProps {
  team1Players: string[]
  team2Players: string[]
  team1Score?: number
  team2Score?: number
  className?: string
  startedAt?: string | null
  playerNames?: Record<string, string>
}

function CourtTimer({ startedAt }: { startedAt: string }) {
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
    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground tabular-nums mt-1">
      <Timer className="h-3 w-3" />
      <span>{elapsed}</span>
    </div>
  )
}

export function CourtVisual({
  team1Players,
  team2Players,
  team1Score = 0,
  team2Score = 0,
  className,
  startedAt,
  playerNames = {},
}: CourtVisualProps) {
  return (
    <div className={cn("relative w-full", className)} role="img" aria-label={`Court match: Team 1 score ${team1Score}, Team 2 score ${team2Score}`}>
      {/* Court surface */}
      <div className="relative rounded-xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 overflow-hidden">
        {/* Net line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px border-t-2 border-dashed border-primary/30" />

        {/* Score display */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 rounded-full bg-background/90 backdrop-blur px-3 py-1 border shadow-sm">
              <span className="text-lg font-bold tabular-nums">{team1Score}</span>
              <span className="text-[10px] text-muted-foreground font-medium">VS</span>
              <span className="text-lg font-bold tabular-nums">{team2Score}</span>
            </div>
            {startedAt && <CourtTimer startedAt={startedAt} />}
          </div>
        </div>

        {/* Team 1 side */}
        <div className="flex items-center justify-center gap-3 py-6 px-4">
          {team1Players.map((pid, i) => {
            const name = playerNames[pid] || `Player ${i + 1}`
            return (
              <div key={pid} className="flex flex-col items-center gap-1">
                <PlayerAvatar
                  name={name}
                  size="md"
                  index={i}
                />
                <span className="text-[10px] font-medium text-muted-foreground max-w-[60px] truncate">{name}</span>
              </div>
            )
          })}
        </div>

        {/* Team 2 side */}
        <div className="flex items-center justify-center gap-3 py-6 px-4">
          {team2Players.map((pid, i) => {
            const name = playerNames[pid] || `Player ${i + 1}`
            return (
              <div key={pid} className="flex flex-col items-center gap-1">
                <PlayerAvatar
                  name={name}
                  size="md"
                  index={i + 2}
                />
                <span className="text-[10px] font-medium text-muted-foreground max-w-[60px] truncate">{name}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
