"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Venue, Session, VenueMember } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModeToggle } from "@/components/mode-toggle"
import { PlayerAvatar } from "@/components/player-avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Building2,
  LayoutGrid,
  Users,
  Zap,
  Calendar,
  Shield,
  UserPlus,
  Trash2,
  Clock,
} from "lucide-react"
import { createVenueSessionAction, inviteStaffAction, removeStaffAction } from "../actions"
import { searchPlayersAction } from "@/app/friends/actions"

type MemberWithName = VenueMember & { displayName: string }

interface VenueDashboardProps {
  venue: Venue
  sessions: Session[]
  members: MemberWithName[]
  currentUserRole: string
  userId: string
}

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

export function VenueDashboard({ venue, sessions, members, currentUserRole, userId }: VenueDashboardProps) {
  const router = useRouter()
  const isOwner = currentUserRole === 'owner'
  const activeSessions = sessions.filter(s => s.status === 'active')
  const pastSessions = sessions.filter(s => s.status === 'completed')

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 md:px-6 z-10">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <div className="flex-1 flex items-center justify-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold truncate">{venue.name}</h1>
          {isOwner && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Shield className="h-3 w-3" />
              Owner
            </span>
          )}
        </div>
        <ModeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6 md:p-10 max-w-4xl mx-auto w-full">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <LayoutGrid className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">Courts</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{venue.num_courts}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">Active Sessions</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{activeSessions.length}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">Staff</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{members.length}</p>
          </div>
        </div>

        {/* Staff Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Staff</h2>
            </div>
            {isOwner && <InviteStaffDialog venueId={venue.id} />}
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((m, i) => (
              <div
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium"
              >
                <PlayerAvatar name={m.displayName} size="sm" index={i} className="h-5 w-5 text-[8px]" />
                <span className="max-w-[80px] truncate">{m.displayName}</span>
                <span className={`text-[10px] ${m.role === 'owner' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                  {m.role}
                </span>
                {isOwner && m.role !== 'owner' && (
                  <RemoveStaffButton venueId={venue.id} memberId={m.id} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Active Sessions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Active Sessions</h2>
            </div>
            <CreateVenueSessionDialog venueId={venue.id} numCourts={venue.num_courts} />
          </div>

          {activeSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-2xl">
              <Calendar className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">No active sessions</p>
              <p className="text-xs text-muted-foreground mb-4">Create a session to start managing open play.</p>
              <CreateVenueSessionDialog venueId={venue.id} numCourts={venue.num_courts} />
            </div>
          ) : (
            <div className="grid gap-2">
              {activeSessions.map((session, index) => (
                <Link key={session.id} href={`/dashboard/session/${session.id}`}>
                  <div className="flex items-center justify-between px-5 py-4 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/20 transition-all duration-200 group">
                    <div className="flex items-center gap-3.5">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <LayoutGrid className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{session.name}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
                            Active
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">{timeAgo(session.created_at)}</p>
                          {session.share_code && (
                            <>
                              <span className="text-xs text-muted-foreground/50">|</span>
                              <p className="text-xs text-muted-foreground font-mono">{session.share_code}</p>
                            </>
                          )}
                          {(session.scheduled_start || session.scheduled_end) && (
                            <>
                              <span className="text-xs text-muted-foreground/50">|</span>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {session.scheduled_start && new Date(session.scheduled_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                {session.scheduled_start && session.scheduled_end && ' - '}
                                {session.scheduled_end && new Date(session.scheduled_end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </p>
                            </>
                          )}
                          {session.recurrence && (
                            <>
                              <span className="text-xs text-muted-foreground/50">|</span>
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                                {session.recurrence}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past Sessions</h2>
              <span className="text-xs text-muted-foreground ml-1">({pastSessions.length})</span>
            </div>
            <div className="grid gap-2">
              {pastSessions.slice(0, 10).map((session) => (
                <Link key={session.id} href={`/dashboard/session/${session.id}`}>
                  <div className="flex items-center justify-between px-5 py-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors group">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{session.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function CreateVenueSessionDialog({ venueId, numCourts }: { venueId: string; numCourts: number }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [courts, setCourts] = useState(String(numCourts))
  const [scheduledStart, setScheduledStart] = useState("")
  const [scheduledEnd, setScheduledEnd] = useState("")
  const [recurrence, setRecurrence] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Session name is required"); return }
    setLoading(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]
    const startTime = scheduledStart
      ? new Date(`${today}T${scheduledStart}`).toISOString()
      : undefined
    const endTime = scheduledEnd
      ? new Date(`${today}T${scheduledEnd}`).toISOString()
      : undefined

    const result = await createVenueSessionAction(
      venueId,
      name.trim(),
      parseInt(courts) || numCourts,
      startTime,
      endTime,
      recurrence || undefined,
    )

    if (result.error) {
      setError(result.error)
    } else if (result.session) {
      setOpen(false)
      router.push(`/dashboard/session/${result.session.id}`)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) { setName(""); setCourts(String(numCourts)); setScheduledStart(""); setScheduledEnd(""); setRecurrence(""); setError(null) }
    }}>
      <DialogTrigger render={
        <Button size="sm">
          <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
          New Session
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Start a Session</DialogTitle>
            <DialogDescription>Create a new open play session at this venue.</DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="session-name">Session Name</Label>
              <Input id="session-name" placeholder="Friday Night Open Play" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session-courts">Number of Courts</Label>
              <Input id="session-courts" type="number" min={1} max={50} value={courts} onChange={e => setCourts(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="session-start">Start Time</Label>
                <Input id="session-start" type="time" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="session-end">End Time</Label>
                <Input id="session-end" type="time" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session-recurrence">Recurrence (optional)</Label>
              <select
                id="session-recurrence"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={recurrence}
                onChange={e => setRecurrence(e.target.value)}
              >
                <option value="">No recurrence</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="weekdays">Weekdays (Mon-Fri)</option>
                <option value="weekends">Weekends (Sat-Sun)</option>
              </select>
              <p className="text-xs text-muted-foreground">Recurring sessions are auto-created on schedule.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Start Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function InviteStaffDialog({ venueId }: { venueId: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{ id: string; display_name: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSearch(q: string) {
    setQuery(q)
    if (q.trim().length < 2) { setResults([]); return }
    const result = await searchPlayersAction(q)
    if (result.players) setResults(result.players)
  }

  async function handleInvite(userId: string) {
    setLoading(true)
    setError(null)
    const result = await inviteStaffAction(venueId, userId)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) { setQuery(""); setResults([]); setError(null) }
    }}>
      <DialogTrigger render={
        <Button variant="outline" size="sm">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Invite Staff
        </Button>
      } />
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Invite Staff</DialogTitle>
          <DialogDescription>Search for a player to add as staff at this venue.</DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <Input placeholder="Search by name..." value={query} onChange={e => handleSearch(e.target.value)} />
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {results.map((player, i) => (
            <div key={player.id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card">
              <div className="flex items-center gap-2">
                <PlayerAvatar name={player.display_name} size="sm" index={i} />
                <span className="text-sm font-medium">{player.display_name || "Unknown"}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleInvite(player.id)} disabled={loading}>
                Add
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RemoveStaffButton({ venueId, memberId }: { venueId: string; memberId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRemove() {
    setLoading(true)
    await removeStaffAction(venueId, memberId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
      title="Remove staff member"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  )
}
