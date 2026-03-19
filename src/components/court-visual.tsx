import { cn } from "@/lib/utils"
import { PlayerAvatar } from "./player-avatar"

interface CourtVisualProps {
  team1Players: string[]
  team2Players: string[]
  team1Score?: number
  team2Score?: number
  className?: string
}

export function CourtVisual({
  team1Players,
  team2Players,
  team1Score = 0,
  team2Score = 0,
  className,
}: CourtVisualProps) {
  return (
    <div className={cn("relative w-full", className)}>
      {/* Court surface */}
      <div className="relative rounded-xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 overflow-hidden">
        {/* Net line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px border-t-2 border-dashed border-primary/30" />

        {/* Score display */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="flex items-center gap-2 rounded-full bg-background/90 backdrop-blur px-3 py-1 border shadow-sm">
            <span className="text-lg font-bold tabular-nums">{team1Score}</span>
            <span className="text-[10px] text-muted-foreground font-medium">VS</span>
            <span className="text-lg font-bold tabular-nums">{team2Score}</span>
          </div>
        </div>

        {/* Team 1 side */}
        <div className="flex items-center justify-center gap-3 py-6 px-4">
          {team1Players.map((pid, i) => (
            <div key={pid} className="flex flex-col items-center gap-1">
              <PlayerAvatar
                name={`P${i + 1}`}
                size="md"
                index={i}
              />
              <span className="text-[10px] font-medium text-muted-foreground">T1-P{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Team 2 side */}
        <div className="flex items-center justify-center gap-3 py-6 px-4">
          {team2Players.map((pid, i) => (
            <div key={pid} className="flex flex-col items-center gap-1">
              <PlayerAvatar
                name={`P${i + 1}`}
                size="md"
                index={i + 2}
              />
              <span className="text-[10px] font-medium text-muted-foreground">T2-P{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
