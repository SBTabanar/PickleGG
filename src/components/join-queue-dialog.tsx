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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface JoinQueueDialogProps {
  sessionId: string
  onJoined: () => void
}

export function JoinQueueDialog({ sessionId, onJoined }: JoinQueueDialogProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [alreadyInQueue, setAlreadyInQueue] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      setSelectedIds([])
      setSearch("")
      fetchProfiles()
      fetchQueuePlayerIds()
    }
  }, [open])

  async function fetchProfiles() {
    // Only show players who have participated in this session
    // (have any queue entry regardless of status)
    const { data: allEntries } = await supabase
      .from("queue_entries")
      .select("player_ids")
      .eq("session_id", sessionId)

    const sessionPlayerIds = new Set<string>()
    allEntries?.forEach(e => e.player_ids.forEach((id: string) => sessionPlayerIds.add(id)))

    if (sessionPlayerIds.size === 0) {
      setProfiles([])
      return
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("id", Array.from(sessionPlayerIds))
      .order("display_name")
    if (data) setProfiles(data as Profile[])
  }

  async function fetchQueuePlayerIds() {
    // Players currently in queue or playing — can't be added again
    const { data: entries } = await supabase
      .from("queue_entries")
      .select("player_ids")
      .eq("session_id", sessionId)
      .in("status", ["waiting", "playing"])
    const { data: games } = await supabase
      .from("games")
      .select("team1_player_ids, team2_player_ids")
      .eq("session_id", sessionId)
      .eq("status", "in_progress")

    const ids = new Set<string>()
    entries?.forEach(e => e.player_ids.forEach((id: string) => ids.add(id)))
    games?.forEach(g => {
      g.team1_player_ids.forEach((id: string) => ids.add(id))
      g.team2_player_ids.forEach((id: string) => ids.add(id))
    })
    setAlreadyInQueue(Array.from(ids))
  }

  const filteredProfiles = profiles.filter(p =>
    p.display_name?.toLowerCase().includes(search.toLowerCase()) &&
    !alreadyInQueue.includes(p.id)
  )

  async function handleJoin() {
    if (selectedIds.length === 0) return
    setLoading(true)

    try {
      const { error } = await supabase.from("queue_entries").insert({
        session_id: sessionId,
        player_ids: selectedIds,
        status: "waiting",
        bucket_index: 0,
      })

      if (error) throw error
      
      setSelectedIds([])
      setOpen(false)
      onJoined()
    } catch (error) {
      console.error("Error joining queue:", error)
      alert("Failed to join queue")
    } finally {
      setLoading(false)
    }
  }

  function togglePlayer(id: string) {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : prev.length < 4 ? [...prev, id] : prev
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Join Queue</Button>} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join the Paddle Rack</DialogTitle>
          <DialogDescription>
            Select yourself and up to 3 partners to join as a group.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative my-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search players..." 
            className="pl-8" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
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
                  <span className="font-medium">{profile.display_name}</span>
                </div>
                <Checkbox checked={selectedIds.includes(profile.id)} onCheckedChange={() => togglePlayer(profile.id)} />
              </label>
            ))}
          </div>
        </ScrollArea>

        <div className="py-2 text-sm text-muted-foreground">
          {selectedIds.length} players selected (Max 4)
        </div>

        <DialogFooter>
          <Button onClick={handleJoin} disabled={loading || selectedIds.length === 0} className="w-full">
            {loading ? "Joining..." : `Join with ${selectedIds.length} Player${selectedIds.length > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
