import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { ModeToggle } from '@/components/mode-toggle'
import { CreateSessionDialog } from '@/components/create-session-dialog'
import { Session } from '@/types/database'
import { Button } from '@/components/ui/button'
import { ChevronRight, Calendar } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false })

  const typedSessions = sessions as Session[] | null

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10">
        <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <span className="text-primary font-bold text-xl">PickleGG</span>
          </Link>
          <Link href="/dashboard" className="text-foreground transition-colors hover:text-foreground">
            Sessions
          </Link>
          <Link href="/leaderboard" className="text-muted-foreground transition-colors hover:text-foreground">
            Leaderboard
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="hidden md:inline text-muted-foreground">{user?.email}</span>
          <ModeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-8 p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Play Sessions</h1>
            <p className="text-muted-foreground">Manage your pickleball court rotations and stats.</p>
          </div>
          <CreateSessionDialog />
        </div>

        <div className="grid gap-4">
          {!typedSessions || typedSessions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-semibold">No sessions found</h3>
                <p className="text-muted-foreground mb-6">Create your first play session to get started.</p>
                <CreateSessionDialog />
              </CardContent>
            </Card>
          ) : (
            typedSessions.map((session) => (
              <Link key={session.id} href={`/dashboard/session/${session.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer group">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">{session.name}</h3>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          session.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Started {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
