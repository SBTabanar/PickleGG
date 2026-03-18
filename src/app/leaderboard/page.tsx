import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link'
import { ChevronLeft, Trophy, Medal } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { Profile } from '@/types/database'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("wins", { ascending: false })
    .limit(50)

  const typedProfiles = profiles as Profile[] | null

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </Link>
        <div className="flex-1 text-center font-bold">PickleGG Leaderboard</div>
        <ModeToggle />
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-8">
          <div className="text-center space-y-2">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Hall of Fame</h1>
            <p className="text-muted-foreground">The best players on the courts.</p>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] text-center">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Played</TableHead>
                    <TableHead className="text-center">Wins</TableHead>
                    <TableHead className="text-center">Losses</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!typedProfiles || typedProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No matches recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    typedProfiles.map((profile, index) => {
                      const winRate = profile.games_played > 0 
                        ? Math.round((profile.wins / profile.games_played) * 100) 
                        : 0
                      
                      return (
                        <TableRow key={profile.id}>
                          <TableCell className="text-center font-bold">
                            {index === 0 ? <Medal className="h-5 w-5 text-yellow-500 mx-auto" /> : 
                             index === 1 ? <Medal className="h-5 w-5 text-slate-400 mx-auto" /> :
                             index === 2 ? <Medal className="h-5 w-5 text-amber-600 mx-auto" /> :
                             index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={profile.avatar_url || ""} />
                                <AvatarFallback>{profile.display_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-semibold">{profile.display_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{profile.games_played}</TableCell>
                          <TableCell className="text-center font-bold text-green-500">{profile.wins}</TableCell>
                          <TableCell className="text-center text-red-500">{profile.losses}</TableCell>
                          <TableCell className="text-right font-mono">{winRate}%</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
