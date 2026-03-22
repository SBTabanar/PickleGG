"use client"

import { useState, useEffect } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Users } from "lucide-react"
import { getFriendsAction } from "@/app/friends/actions"
import { joinQueueAction } from "@/app/dashboard/session/[id]/actions"

type FriendInfo = {
  friendshipId: string
  userId: string
  displayName: string
  avatarUrl: string | null
}

interface QueueWithFriendsDialogProps {
  sessionId: string
  onJoined: () => void
}

export function QueueWithFriendsDialog({ sessionId, onJoined }: QueueWithFriendsDialogProps) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<FriendInfo[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchingFriends, setFetchingFriends] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedIds([])
      setError(null)
      setFetchingFriends(true)
      getFriendsAction().then(result => {
        setFriends(result.friends || [])
        setFetchingFriends(false)
      })
    }
  }, [open])

  function toggleFriend(id: string) {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : prev.length < 3 ? [...prev, id] : prev // max 3 friends + self = 4
    )
  }

  async function handleJoin() {
    if (selectedIds.length === 0) return
    setLoading(true)
    setError(null)
    const result = await joinQueueAction(sessionId, selectedIds)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
      onJoined()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="h-12 text-base">
          <Users className="mr-2 h-5 w-5" />
          With Friends
        </Button>
      } />
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Queue with Friends</DialogTitle>
          <DialogDescription>
            Select friends to queue with (up to 3). You&apos;ll join as a group.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <ScrollArea className="h-[280px]">
          {fetchingFriends ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Loading friends...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No friends yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add friends from the friends menu in the header
              </p>
            </div>
          ) : (
            <div className="space-y-1 pr-4">
              {friends.map(friend => (
                <label
                  key={friend.userId}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={friend.avatarUrl || ""} />
                      <AvatarFallback>{friend.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{friend.displayName}</span>
                  </div>
                  <Checkbox
                    checked={selectedIds.includes(friend.userId)}
                    onCheckedChange={() => toggleFriend(friend.userId)}
                  />
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="py-1 text-sm text-muted-foreground">
          {selectedIds.length} / 3 friends selected (you + {selectedIds.length} = {selectedIds.length + 1} players)
        </div>

        <DialogFooter>
          <Button
            onClick={handleJoin}
            disabled={loading || selectedIds.length === 0}
            className="w-full"
          >
            {loading ? "Joining..." : `Queue with ${selectedIds.length} Friend${selectedIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
