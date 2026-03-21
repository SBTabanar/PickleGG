import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, LogIn } from 'lucide-react'

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()

  // Look up session by share code
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('share_code', code)
    .single()

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <Users className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Session Not Found</h1>
            <p className="text-sm text-muted-foreground mt-2">
              The session code &quot;{code}&quot; doesn&apos;t match any active session. Check the link and try again.
            </p>
          </div>
          <Button render={<Link href="/" />} className="w-full h-11">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // User is authenticated, redirect to the session dashboard
    redirect(`/dashboard/session/${session.id}`)
  }

  // User is not logged in - show join options
  const loginUrl = `/login?redirect=${encodeURIComponent(`/join/${code}`)}`

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 animate-fade-in-up">
        {/* Branding */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center" aria-hidden="true">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">PickleGG</span>
          </div>
        </div>

        {/* Session info card */}
        <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">You&apos;re invited to</p>
            <h1 className="text-xl font-bold tracking-tight mt-1">{session.name}</h1>
          </div>
          {session.status === 'active' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" aria-hidden="true" />
              Live Session
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button render={<Link href={loginUrl} />} className="w-full h-12 text-base">
            <LogIn className="mr-2 h-4 w-4" />
            Log in to Join
          </Button>

          <Button render={<Link href={loginUrl} />} variant="outline" className="w-full h-12 text-base">
            Create Account to Join
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          You need an account to join the session and track your stats.
        </p>

        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
