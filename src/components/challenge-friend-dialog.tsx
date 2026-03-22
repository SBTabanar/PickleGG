"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Swords } from "lucide-react"
import { getFriendsAction } from "@/app/friends/actions"
import { createChallengeAction } from "@/app/dashboard/session/[id]/challenge-actions"
import { PlayerAvatar } from "@/components/player-avatar"

interface ChallengeFriendDialogProps {
  sessionId: string
}

type FriendInfo = {
  friendshipId: string
  userId: string
  displayName: string
  avatarUrl: string | null
}

export function ChallengeFriendDialog({ sessionId }: ChallengeFriendDialogProps) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<FriendInfo[]>([])
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadFriends()
      setSelectedOpponent(null)
      setError(null)
    }
  }, [open])

  async function loadFriends() {
    const result = await getFriendsAction()
    if (result.friends) setFriends(result.friends)
  }

  async function handleChallenge() {
    if (!selectedOpponent) return
    setLoading(true)
    setError(null)
    const result = await createChallengeAction(sessionId, selectedOpponent)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm">
          <Swords className="mr-1.5 h-3.5 w-3.5" />
          Challenge
        </Button>
      } />
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Challenge a Friend</DialogTitle>
          <DialogDescription>
            Pick a friend to challenge. They&apos;ll get a notification to accept or decline.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-2 py-2 max-h-[300px] overflow-y-auto">
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No friends yet. Add friends first!
            </p>
          ) : (
            friends.map((friend, i) => (
              <button
                key={friend.userId}
                onClick={() => setSelectedOpponent(
                  selectedOpponent === friend.userId ? null : friend.userId
                )}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  selectedOpponent === friend.userId
                    ? 'border-primary bg-primary/5'
                    : 'bg-card hover:bg-muted/50'
                }`}
              >
                <PlayerAvatar name={friend.displayName} size="sm" index={i} />
                <span className="text-sm font-medium">{friend.displayName}</span>
              </button>
            ))
          )}
        </div>

        <Button
          onClick={handleChallenge}
          disabled={!selectedOpponent || loading}
          className="w-full h-11"
        >
          <Swords className="mr-2 h-4 w-4" />
          {loading ? "Sending..." : "Send Challenge"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
