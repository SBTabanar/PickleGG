import { login, signup, signInWithGoogle, signInWithApple } from './actions'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { ArrowLeft, Trophy, Users, BarChart3 } from 'lucide-react'

// Allowlist of known error messages to prevent parameter pollution or misleading content.
// Any unrecognized error string is replaced with a generic fallback.
const KNOWN_ERRORS = new Set([
  'Invalid email or password.',
  'Could not create account. Please try again.',
  'Email and password are required.',
  'Please enter a valid email address.',
  'Password must be at least 6 characters.',
  'Password is too long.',
  'Email address is too long.',
  'Could not sign in with Google.',
  'Could not sign in with Apple.',
  'Could not sign in. Please try again.',
])

function sanitizeError(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(raw)
    if (KNOWN_ERRORS.has(decoded)) return decoded
    // Fallback: do not display arbitrary user-controlled strings
    return 'An error occurred. Please try again.'
  } catch {
    return 'An error occurred. Please try again.'
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; redirect?: string }> }) {
  const { error: rawError, redirect: redirectTo } = await searchParams
  const error = sanitizeError(rawError)
  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary/5 flex-col justify-between p-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-16">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center" aria-hidden="true">
                <span className="text-primary-foreground font-bold text-lg">P</span>
              </div>
              <span className="text-2xl font-bold tracking-tight">PickleGG</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Organize your court,<br />
              <span className="text-primary-text">track your game.</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The smart way to manage pickleball queues, courts, and player stats. Jump in and start playing.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-md">
          <div className="rounded-xl border bg-card/60 backdrop-blur p-4">
            <Trophy className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-medium">Leaderboards</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Track your wins</p>
          </div>
          <div className="rounded-xl border bg-card/60 backdrop-blur p-4">
            <Users className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-medium">Queue System</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Fair rotations</p>
          </div>
          <div className="rounded-xl border bg-card/60 backdrop-blur p-4">
            <BarChart3 className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-medium">Live Stats</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Real-time scores</p>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12">
        <div className="lg:hidden mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center" aria-hidden="true">
                <span className="text-primary-foreground font-bold text-sm">P</span>
              </div>
              <span className="text-lg font-bold">PickleGG</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in or create an account to continue.</p>
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-destructive shrink-0" aria-hidden="true" />
              <p id="form-error" className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form className="space-y-4">
            {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className="h-11"
                required
                aria-describedby={error ? "form-error" : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" className="h-11" required aria-describedby={error ? "form-error" : undefined} />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" formAction={login} className="w-full h-11">
                Log in
              </Button>
              <Button type="submit" formAction={signup} variant="outline" className="w-full h-11">
                Create account
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <form action={signInWithGoogle}>
              <Button type="submit" variant="outline" className="w-full h-11">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </Button>
            </form>
            <form action={signInWithApple}>
              <Button type="submit" variant="outline" className="w-full h-11">
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Apple
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
