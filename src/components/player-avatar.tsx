import { cn } from "@/lib/utils"

interface PlayerAvatarProps {
  name?: string | null
  size?: "sm" | "md" | "lg"
  online?: boolean
  className?: string
  index?: number
}

const sizeMap = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
}

const colorPalette = [
  "bg-primary/20 text-primary",
  "bg-chart-2/20 text-chart-2",
  "bg-chart-3/20 text-chart-3",
  "bg-chart-4/20 text-chart-4",
  "bg-chart-5/20 text-chart-5",
]

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function PlayerAvatar({ name, size = "md", online, className, index = 0 }: PlayerAvatarProps) {
  const colorClass = colorPalette[index % colorPalette.length]

  return (
    <div className={cn("relative inline-flex items-center justify-center rounded-full font-semibold shrink-0", sizeMap[size], colorClass, className)} aria-label={name || "Player"} role="img">
      {getInitials(name)}
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
            online ? "bg-primary" : "bg-muted-foreground/40"
          )}
        />
      )}
    </div>
  )
}
