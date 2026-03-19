"use client"

import { Game } from "@/types/database"
import { Trophy, Clock } from "lucide-react"

interface MatchHistoryProps {
  games: Game[]
}

export function MatchHistory({ games }: MatchHistoryProps) {
  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl text-center">
        <Clock className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No completed matches yet</p>
        <p className="text-xs text-muted-foreground mt-1">Match results will appear here.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      {games.map((game, index) => {
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
            className="flex items-center justify-between px-4 py-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-6 text-center">
                #{games.length - index}
              </span>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold ${
                  team1Won ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}>
                  {team1Won && <Trophy className="h-3 w-3" />}
                  <span className="tabular-nums">{game.team1_score}</span>
                </div>
                <span className="text-xs text-muted-foreground">-</span>
                <div className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold ${
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
  )
}
