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
import { Swords, ChevronLeft } from "lucide-react"
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

type ChallengeMode = "1v1" | "2v2"
type Step = "mode" | "opponent" | "my_partner" | "their_partner"

export function ChallengeFriendDialog({ sessionId }: ChallengeFriendDialogProps) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<FriendInfo[]>([])
  const [mode, setMode] = useState<ChallengeMode | null>(null)
  const [step, setStep] = useState<Step>("mode")
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)
  const [myPartner, setMyPartner] = useState<string | null>(null)
  const [theirPartner, setTheirPartner] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadFriends()
      resetState()
    }
  }, [open])

  function resetState() {
    setMode(null)
    setStep("mode")
    setSelectedOpponent(null)
    setMyPartner(null)
    setTheirPartner(null)
    setError(null)
  }

  async function loadFriends() {
    const result = await getFriendsAction()
    if (result.friends) setFriends(result.friends)
  }

  function handleModeSelect(m: ChallengeMode) {
    setMode(m)
    setStep("opponent")
  }

  function handleOpponentSelect(userId: string) {
    setSelectedOpponent(userId)
    if (mode === "1v1") {
      // Done selecting, can send
    } else {
      setStep("my_partner")
    }
  }

  function handleMyPartnerSelect(userId: string) {
    setMyPartner(userId)
    setStep("their_partner")
  }

  function handleTheirPartnerSelect(userId: string) {
    setTheirPartner(userId)
  }

  function handleBack() {
    if (step === "their_partner") {
      setTheirPartner(null)
      setStep("my_partner")
    } else if (step === "my_partner") {
      setMyPartner(null)
      setStep("opponent")
    } else if (step === "opponent") {
      setSelectedOpponent(null)
      setStep("mode")
      setMode(null)
    }
  }

  const canSend = mode === "1v1"
    ? !!selectedOpponent
    : !!selectedOpponent && !!myPartner && !!theirPartner

  async function handleChallenge() {
    if (!selectedOpponent) return
    setLoading(true)
    setError(null)
    const result = await createChallengeAction(
      sessionId,
      selectedOpponent,
      myPartner || undefined,
      theirPartner || undefined
    )
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
    }
    setLoading(false)
  }

  function getFriendName(userId: string) {
    return friends.find(f => f.userId === userId)?.displayName || "Unknown"
  }

  // Friends available for selection at each step (exclude already-selected players)
  const selectedIds = [selectedOpponent, myPartner, theirPartner].filter(Boolean) as string[]

  function availableFriends(exclude: string[]) {
    return friends.filter(f => !exclude.includes(f.userId))
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
        {/* Step: Choose mode */}
        {step === "mode" && (
          <>
            <DialogHeader>
              <DialogTitle>Challenge a Friend</DialogTitle>
              <DialogDescription>
                Choose the match format.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-4">
              <button
                onClick={() => handleModeSelect("1v1")}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-card hover:border-primary/40 hover:bg-primary/5 px-4 py-6 transition-colors"
              >
                <span className="text-3xl font-bold">1v1</span>
                <span className="text-xs text-muted-foreground">Singles</span>
              </button>
              <button
                onClick={() => handleModeSelect("2v2")}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-card hover:border-primary/40 hover:bg-primary/5 px-4 py-6 transition-colors"
              >
                <span className="text-3xl font-bold">2v2</span>
                <span className="text-xs text-muted-foreground">Doubles</span>
              </button>
            </div>
          </>
        )}

        {/* Step: Pick opponent */}
        {step === "opponent" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                Pick your opponent
              </DialogTitle>
              <DialogDescription>
                {mode === "1v1" ? "Who do you want to play against?" : "Choose the player you're challenging."}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <FriendList
              friends={availableFriends([])}
              selected={selectedOpponent}
              onSelect={handleOpponentSelect}
            />
            {mode === "1v1" && selectedOpponent && (
              <Button onClick={handleChallenge} disabled={loading} className="w-full h-11">
                <Swords className="mr-2 h-4 w-4" />
                {loading ? "Sending..." : `Challenge ${getFriendName(selectedOpponent)}`}
              </Button>
            )}
          </>
        )}

        {/* Step: Pick your partner (2v2) */}
        {step === "my_partner" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                Pick your partner
              </DialogTitle>
              <DialogDescription>
                Who&apos;s on your team?
              </DialogDescription>
            </DialogHeader>
            <FriendList
              friends={availableFriends([selectedOpponent!])}
              selected={myPartner}
              onSelect={handleMyPartnerSelect}
            />
          </>
        )}

        {/* Step: Pick their partner (2v2) */}
        {step === "their_partner" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                Pick {getFriendName(selectedOpponent!)}&apos;s partner
              </DialogTitle>
              <DialogDescription>
                Who plays with {getFriendName(selectedOpponent!)}?
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <FriendList
              friends={availableFriends([selectedOpponent!, myPartner!])}
              selected={theirPartner}
              onSelect={handleTheirPartnerSelect}
            />
            {theirPartner && (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
                  <p className="font-medium mb-1">Match Summary</p>
                  <p className="text-muted-foreground">
                    You & {getFriendName(myPartner!)} vs {getFriendName(selectedOpponent!)} & {getFriendName(theirPartner)}
                  </p>
                </div>
                <Button onClick={handleChallenge} disabled={loading} className="w-full h-11">
                  <Swords className="mr-2 h-4 w-4" />
                  {loading ? "Sending..." : "Send Challenge"}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FriendList({
  friends,
  selected,
  onSelect,
}: {
  friends: FriendInfo[]
  selected: string | null
  onSelect: (userId: string) => void
}) {
  if (friends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No friends available. Add more friends first!
      </p>
    )
  }

  return (
    <div className="space-y-2 py-2 max-h-[300px] overflow-y-auto">
      {friends.map((friend, i) => (
        <button
          key={friend.userId}
          onClick={() => onSelect(friend.userId)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
            selected === friend.userId
              ? 'border-primary bg-primary/5'
              : 'bg-card hover:bg-muted/50'
          }`}
        >
          <PlayerAvatar name={friend.displayName} size="sm" index={i} />
          <span className="text-sm font-medium">{friend.displayName}</span>
        </button>
      ))}
    </div>
  )
}
