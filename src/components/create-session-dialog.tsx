"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
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

export function CreateSessionDialog() {
  const [name, setName] = useState("")
  const [numCourts, setNumCourts] = useState("3")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate session name
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Session name is required.")
      return
    }
    if (trimmedName.length > 100) {
      setError("Session name must be 100 characters or fewer.")
      return
    }

    // Validate court count
    const parsedCourts = parseInt(numCourts, 10)
    if (isNaN(parsedCourts) || parsedCourts < 1 || parsedCourts > 20) {
      setError("Number of courts must be between 1 and 20.")
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // 1. Create the session
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          name: trimmedName,
          creator_id: user.id,
          status: "active",
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // 2. Create the courts
      const courts = Array.from({ length: parsedCourts }).map((_, i) => ({
        session_id: session.id,
        name: `Court ${i + 1}`,
        order_index: i,
        status: "open",
      }))

      const { error: courtsError } = await supabase.from("courts").insert(courts)
      if (courtsError) throw courtsError

      setOpen(false)
      router.push(`/dashboard/session/${session.id}`)
    } catch (err) {
      console.error("Error creating session:", err instanceof Error ? err.message : "Unknown error")
      setError("Failed to create session. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) { setName(""); setNumCourts("3"); setError(null) }
    }}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusCircle className="mr-2 h-3.5 w-3.5" />
            New Session
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create Play Session</DialogTitle>
            <DialogDescription>
              Give your session a name and define how many courts are available.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Session Name</Label>
              <Input
                id="name"
                placeholder="Saturday Open Play"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="courts">Number of Courts</Label>
              <Input
                id="courts"
                type="number"
                min="1"
                max="20"
                value={numCourts}
                onChange={(e) => setNumCourts(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
