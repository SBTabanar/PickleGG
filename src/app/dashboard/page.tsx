import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ModeToggle } from '@/components/mode-toggle'
import { CreateSessionDialog } from '@/components/create-session-dialog'
import { JoinSessionInput } from '@/components/join-session-input'
import { Session } from '@/types/database'
import { Button } from '@/components/ui/button'
import { ChevronRight, Calendar, Trophy, Zap, LayoutGrid, LogOut, Users } from 'lucide-react'
import { logout } from '@/app/login/actions'

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fallback auth guard: middleware should catch unauthenticated requests,
  // but if it does not (e.g. stale session), redirect here as a safety net.
  if (!user) {
    redirect('/login')
  }

  // Filter sessions by creator_id so users only see their own sessions.
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })

  // NOTE: In production, replace `as Session[]` casts with Supabase's generated
  // database types (via `supabase gen types typescript`) for end-to-end type safety.
  const typedSessions = sessions as Session[] | null

  const activeSessions = typedSessions?.filter(s => s.status === 'active').length ?? 0
  const totalSessions = typedSessions?.length ?? 0
  const displayName = user?.email?.split('@')[0] ?? 'Player'

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
          <Link href="/dashboard" className="text-sm font-medium text-foreground relative after:absolute after:bottom-[-17px] after:inset-x-0 after:h-0.5 after:bg-primary after:rounded-full min-h-[44px] flex items-center" aria-current="page">
            Sessions
          </Link>
          <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
            Leaderboard
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden md:inline text-xs text-muted-foreground">{user?.email}</span>
          <ModeToggle />
          <form action={logout}>
            <Button variant="ghost" size="icon-sm" type="submit">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log out</span>
            </Button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6 md:p-10 max-w-4xl mx-auto w-full">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div className="relative">
            <p className="text-sm text-muted-foreground mb-1">Welcome back,</p>
            <h1 className="text-2xl font-bold tracking-tight mb-1">{displayName}</h1>
            <p className="text-sm text-muted-foreground">Ready to play? Create or join a session below.</p>
          </div>
        </div>

        {/* Join a Session */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Join a Session</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Enter the code shared by your session manager</p>
          <JoinSessionInput />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <LayoutGrid className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">Total Sessions</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{totalSessions}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">Active Now</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{activeSessions}</p>
          </div>
          <div className="col-span-2 md:col-span-1 rounded-xl border bg-card px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">Quick Actions</span>
            </div>
            <div className="mt-0.5">
              <CreateSessionDialog />
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Play Sessions</h2>
            <CreateSessionDialog />
          </div>

          <div className="grid gap-2">
            {!typedSessions || typedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-2xl">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-semibold mb-1">No sessions yet</p>
                <p className="text-xs text-muted-foreground mb-6 max-w-[240px]">
                  Create your first play session to start managing courts and tracking games.
                </p>
                <CreateSessionDialog />
              </div>
            ) : (
              typedSessions.map((session, index) => (
                <Link key={session.id} href={`/dashboard/session/${session.id}`}>
                  <div
                    className="flex items-center justify-between px-5 py-4 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/20 transition-all duration-200 group animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        session.status === 'active'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`} aria-hidden="true">
                        <LayoutGrid className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{session.name}</p>
                          {session.status === 'active' && (
                            <span role="status" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary-text">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" aria-hidden="true" />
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <span className="text-xs text-muted-foreground/50" aria-hidden="true">|</span>
                          <p className="text-xs text-muted-foreground">
                            {timeAgo(session.created_at)}
                          </p>
                          {session.share_code && (
                            <>
                              <span className="text-xs text-muted-foreground/50" aria-hidden="true">|</span>
                              <p className="text-xs text-muted-foreground font-mono">{session.share_code}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
