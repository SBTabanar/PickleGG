"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Profile } from "@/types/database"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { updateQueueEntryAction } from "@/app/dashboard/session/[id]/actions"

const supabase = createClient()

interface EditGroupDialogProps {
  sessionId: string
  entryId: string
  currentPlayerIds: string[]
  allQueuePlayerIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function EditGroupDialog({
  sessionId,
  entryId,
  currentPlayerIds,
  allQueuePlayerIds,
  open,
  onOpenChange,
  onUpdated,
}: EditGroupDialogProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(currentPlayerIds)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSelectedIds(currentPlayerIds)
      setSearch("")
      setError(null)
      fetchProfiles()
    }
  }, [open, currentPlayerIds])

  async function fetchProfiles() {
    // Only show players who have joined this session
    const { data: participants } = await supabase
      .from("session_participants")
      .select("user_id")
      .eq("session_id", sessionId)

    const participantIds = participants?.map(p => p.user_id) || []
    if (participantIds.length === 0) { setProfiles([]); return }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("id", participantIds)
      .order("display_name")
    if (data) setProfiles(data as Profile[])
  }

  // Show players who are: currently in this group OR not in any queue entry
  const filteredProfiles = profiles.filter(p => {
    const name = p.display_name || p.id.slice(0, 8)
    if (!name.toLowerCase().includes(search.toLowerCase())) return false
    // Always show players currently in this group
    if (currentPlayerIds.includes(p.id)) return true
    // Hide players in other queue entries
    if (allQueuePlayerIds.includes(p.id)) return false
    return true
  })

  function togglePlayer(id: string) {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : prev.length < 4 ? [...prev, id] : prev
    )
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    const result = await updateQueueEntryAction(sessionId, entryId, selectedIds)
    if (result.error) {
      setError(result.error)
    } else {
      onOpenChange(false)
      onUpdated()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>
            Add or remove players in this group. Max 4 players.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="relative my-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-1">
            {filteredProfiles.map((profile) => (
              <label
                key={profile.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback>{profile.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">{profile.display_name}</span>
                </div>
                <Checkbox
                  checked={selectedIds.includes(profile.id)}
                  onCheckedChange={() => togglePlayer(profile.id)}
                />
              </label>
            ))}
          </div>
        </ScrollArea>

        <div className="py-2 text-sm text-muted-foreground">
          {selectedIds.length} / 4 players selected
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
