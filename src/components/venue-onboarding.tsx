"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createVenueAction } from "@/app/dashboard/venue/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, ArrowRight, Check, LayoutGrid, Users, Monitor } from "lucide-react"

export function VenueOnboarding() {
  const [dismissed, setDismissed] = useState(false)
  const [step, setStep] = useState<'intro' | 'form'>('intro')
  const [name, setName] = useState("")
  const [numCourts, setNumCourts] = useState("4")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (dismissed) return null

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) { setError("Venue name is required."); return }

    const parsedCourts = parseInt(numCourts, 10)
    if (isNaN(parsedCourts) || parsedCourts < 1 || parsedCourts > 50) {
      setError("Courts must be between 1 and 50.")
      return
    }

    setLoading(true)
    try {
      const result = await createVenueAction(trimmedName, parsedCourts)
      if (result.error) { setError(result.error); return }
      router.push(`/dashboard/venue/${result.venue!.id}`)
    } catch {
      setError("Failed to create venue. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (step === 'intro') {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/5 p-6 md:p-8">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Dismiss
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Own or manage a pickleball facility?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your venue in 30 seconds and start running organized sessions today.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="flex items-center gap-2.5 rounded-xl border bg-card/60 px-4 py-3">
            <LayoutGrid className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium">Manage all your courts</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border bg-card/60 px-4 py-3">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium">Add staff members</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border bg-card/60 px-4 py-3">
            <Monitor className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium">Lobby TV display</span>
          </div>
        </div>

        <Button onClick={() => setStep('form')} size="sm">
          Set Up My Venue
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Set Up Your Venue</h2>
          <p className="text-xs text-muted-foreground">You can add staff and configure sessions after setup.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 mb-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="onboard-name">Venue Name</Label>
          <Input
            id="onboard-name"
            placeholder="Downtown Pickleball Club"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="onboard-courts">Number of Courts</Label>
          <Input
            id="onboard-courts"
            type="number"
            min="1"
            max="50"
            value={numCourts}
            onChange={(e) => setNumCourts(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Create Venue
              </>
            )}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setDismissed(true)}>
            Maybe later
          </Button>
        </div>
      </form>
    </div>
  )
}
