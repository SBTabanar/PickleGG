import { createClient } from '@/utils/supabase/server'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link'
import { ChevronLeft, Trophy, Medal, Crown, Flame } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { Profile } from '@/types/database'

function getWinRateColor(rate: number): string {
  if (rate >= 65) return 'text-primary font-semibold'
  if (rate >= 45) return 'text-warning font-medium'
  if (rate > 0) return 'text-destructive font-medium'
  return 'text-muted-foreground'
}

function getWinRateBg(rate: number): string {
  if (rate >= 65) return 'bg-primary/10'
  if (rate >= 45) return 'bg-warning/10'
  if (rate > 0) return 'bg-destructive/10'
  return 'bg-muted'
}

export default async function LeaderboardPage() {
  const supabase = await createClient()

  // SECURITY NOTE: This query intentionally runs without an auth check because
  // the leaderboard is designed to be publicly visible. The "profiles" table
  // should have a Supabase RLS policy that allows SELECT on non-sensitive
  // columns (display_name, avatar_url, wins, losses, games_played) for all
  // users, including anonymous/unauthenticated ones. Ensure that sensitive
  // columns (e.g., email) are NOT exposed by RLS or by the select("*") below.
  // For production, replace select("*") with an explicit column list.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("wins", { ascending: false })
    .limit(50)

  // NOTE: In production, replace `as Profile[]` casts with Supabase's generated
  // database types (via `supabase gen types typescript`) for end-to-end type safety.
  const typedProfiles = profiles as Profile[] | null

  const top3 = typedProfiles?.slice(0, 3) ?? []
  const rest = typedProfiles?.slice(3) ?? []

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-6 z-10">
        <nav aria-label="Main navigation" className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center" aria-hidden="true">
              <span className="text-primary-foreground font-bold text-xs">P</span>
            </div>
            <span className="text-sm font-bold tracking-tight hidden sm:inline">PickleGG</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
            Sessions
          </Link>
          <Link href="/leaderboard" className="text-sm font-medium text-foreground relative after:absolute after:bottom-[-17px] after:inset-x-0 after:h-0.5 after:bg-primary after:rounded-full min-h-[44px] flex items-center" aria-current="page">
            Leaderboard
          </Link>
        </nav>
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-4 py-1.5 mb-2">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Leaderboard</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Hall of Fame</h1>
            <p className="text-sm text-muted-foreground">Top players ranked by wins across all sessions.</p>
          </div>

          {/* Podium for Top 3 */}
          {top3.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 md:gap-4 items-end max-w-lg mx-auto w-full">
              {/* 2nd place */}
              <div className="flex flex-col items-center animate-fade-in-up stagger-2 opacity-0">
                <div className="relative mb-3">
                  <Avatar className="h-14 w-14 md:h-16 md:w-16 ring-2 ring-muted-foreground/20 ring-offset-2 ring-offset-background">
                    <AvatarImage src={top3[1].avatar_url || ""} />
                    <AvatarFallback className="text-base bg-muted">{top3[1].display_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-muted-foreground/80 flex items-center justify-center">
                    <Medal className="h-3.5 w-3.5 text-background" />
                  </div>
                </div>
                <p className="text-xs font-semibold truncate max-w-full">{top3[1].display_name}</p>
                <p className="text-lg font-bold text-muted-foreground tabular-nums">{top3[1].wins}W</p>
                <div className="w-full h-20 bg-muted/50 rounded-t-xl border border-b-0 mt-2 flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground/40">2</span>
                </div>
              </div>

              {/* 1st place */}
              <div className="flex flex-col items-center animate-fade-in-up stagger-1 opacity-0">
                <div className="relative mb-3">
                  <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-2 ring-primary ring-offset-2 ring-offset-background">
                    <AvatarImage src={top3[0].avatar_url || ""} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">{top3[0].display_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                    <Crown className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                <p className="text-sm font-bold truncate max-w-full">{top3[0].display_name}</p>
                <p className="text-xl font-bold text-primary tabular-nums">{top3[0].wins}W</p>
                <div className="w-full h-28 bg-primary/5 rounded-t-xl border border-primary/20 border-b-0 mt-2 flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary/30">1</span>
                </div>
              </div>

              {/* 3rd place */}
              <div className="flex flex-col items-center animate-fade-in-up stagger-3 opacity-0">
                <div className="relative mb-3">
                  <Avatar className="h-12 w-12 md:h-14 md:w-14 ring-2 ring-muted-foreground/20 ring-offset-2 ring-offset-background">
                    <AvatarImage src={top3[2].avatar_url || ""} />
                    <AvatarFallback className="text-sm bg-muted">{top3[2].display_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-muted-foreground/60 flex items-center justify-center">
                    <Medal className="h-3 w-3 text-background" />
                  </div>
                </div>
                <p className="text-xs font-semibold truncate max-w-full">{top3[2].display_name}</p>
                <p className="text-lg font-bold text-muted-foreground tabular-nums">{top3[2].wins}W</p>
                <div className="w-full h-14 bg-muted/30 rounded-t-xl border border-b-0 mt-2 flex items-center justify-center">
                  <span className="text-xl font-bold text-muted-foreground/30">3</span>
                </div>
              </div>
            </div>
          )}

          {/* Full Table */}
          <div className="rounded-2xl border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[60px] text-center">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Played</TableHead>
                    <TableHead className="text-center">Wins</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Losses</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!typedProfiles || typedProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Trophy className="h-6 w-6 text-primary" />
                          </div>
                          <p className="text-sm font-medium">No matches recorded yet</p>
                          <p className="text-xs text-muted-foreground">Play some games and the leaderboard will populate.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    typedProfiles.map((profile, index) => {
                      const winRate = profile.games_played > 0
                        ? Math.round((profile.wins / profile.games_played) * 100)
                        : 0

                      return (
                        <TableRow key={profile.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="text-center">
                            {index === 0 ? (
                              <Crown className="h-4 w-4 text-primary mx-auto" />
                            ) : index === 1 ? (
                              <Medal className="h-4 w-4 text-muted-foreground mx-auto" />
                            ) : index === 2 ? (
                              <Medal className="h-3.5 w-3.5 text-muted-foreground/60 mx-auto" />
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={profile.avatar_url || ""} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">{profile.display_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <span className="text-sm font-medium truncate block">{profile.display_name}</span>
                                {profile.wins >= 10 && (
                                  <span className="inline-flex items-center gap-0.5 text-[11px] text-primary">
                                    <Flame className="h-3 w-3" />
                                    Hot
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground tabular-nums hidden sm:table-cell">{profile.games_played}</TableCell>
                          <TableCell className="text-center text-sm font-semibold tabular-nums">{profile.wins}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground tabular-nums hidden sm:table-cell">{profile.losses}</TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs tabular-nums ${getWinRateBg(winRate)} ${getWinRateColor(winRate)}`}>
                              {winRate}%
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
