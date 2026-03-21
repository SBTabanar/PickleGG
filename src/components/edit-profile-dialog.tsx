"use client"

import { useState, useEffect } from "react"
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
import { UserPen, Trophy, Gamepad2 } from "lucide-react"

const supabase = createClient()

export function EditProfileDialog() {
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [stats, setStats] = useState({ games_played: 0, wins: 0, losses: 0 })

  useEffect(() => {
    if (open) {
      setError(null)
      setSuccess(false)
      fetchProfile()
    }
  }, [open])

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("profiles")
      .select("display_name, games_played, wins, losses")
      .eq("id", user.id)
      .single()

    if (data) {
      setDisplayName(data.display_name || "")
      setStats({
        games_played: data.games_played || 0,
        wins: data.wins || 0,
        losses: data.losses || 0,
      })
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = displayName.trim()
    if (!trimmed) {
      setError("Display name is required.")
      return
    }
    if (trimmed.length > 30) {
      setError("Display name must be 30 characters or fewer.")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("Not authenticated.")
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: trimmed,
      }, { onConflict: "id" })

    if (updateError) {
      setError("Failed to update profile. Please try again.")
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  const winRate = stats.games_played > 0
    ? Math.round((stats.wins / stats.games_played) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <UserPen className="h-4 w-4" />
            <span className="sr-only">Edit Profile</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Your Profile</DialogTitle>
            <DialogDescription>
              Update your display name. This is how other players see you.
            </DialogDescription>
          </DialogHeader>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="rounded-xl border bg-card px-3 py-2.5 text-center">
              <Gamepad2 className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums">{stats.games_played}</p>
              <p className="text-[10px] text-muted-foreground">Games</p>
            </div>
            <div className="rounded-xl border bg-card px-3 py-2.5 text-center">
              <Trophy className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums">{stats.wins}</p>
              <p className="text-[10px] text-muted-foreground">Wins</p>
            </div>
            <div className="rounded-xl border bg-card px-3 py-2.5 text-center">
              <p className="text-lg font-bold tabular-nums">{winRate}%</p>
              <p className="text-[10px] text-muted-foreground">Win Rate</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 mb-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-4">
              <p className="text-sm text-primary">Profile updated!</p>
            </div>
          )}

          <div className="grid gap-2 mb-4">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
