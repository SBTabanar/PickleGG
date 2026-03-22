"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createVenueAction } from "@/app/dashboard/venue/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle } from "lucide-react"

export function CreateVenueDialog() {
  const [name, setName] = useState("")
  const [numCourts, setNumCourts] = useState("4")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Venue name is required.")
      return
    }
    if (trimmedName.length > 100) {
      setError("Venue name must be 100 characters or fewer.")
      return
    }

    const parsedCourts = parseInt(numCourts, 10)
    if (isNaN(parsedCourts) || parsedCourts < 1 || parsedCourts > 50) {
      setError("Number of courts must be between 1 and 50.")
      return
    }

    setLoading(true)
    try {
      const result = await createVenueAction(trimmedName, parsedCourts)
      if (result.error) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.push(`/dashboard/venue/${result.venue!.id}`)
    } catch {
      setError("Failed to create venue. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) { setName(""); setNumCourts("4"); setError(null) }
    }}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PlusCircle className="mr-2 h-3.5 w-3.5" />
            New Venue
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create Venue</DialogTitle>
            <DialogDescription>
              Set up a venue to manage courts, staff, and recurring sessions.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="venue-name">Venue Name</Label>
              <Input
                id="venue-name"
                placeholder="Downtown Pickleball Club"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="venue-courts">Number of Courts</Label>
              <Input
                id="venue-courts"
                type="number"
                min="1"
                max="50"
                value={numCourts}
                onChange={(e) => setNumCourts(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Venue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
