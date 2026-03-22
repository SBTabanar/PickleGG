"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Challenge } from "@/types/database"
import { respondToChallengeAction, cancelChallengeAction } from "@/app/dashboard/session/[id]/challenge-actions"
import { Swords, Check, X } from "lucide-react"
import { PlayerAvatar } from "@/components/player-avatar"

interface ChallengeNotificationProps {
  challenge: Challenge
  currentUserId: string
  playerNames: Record<string, string>
  onResponded: () => void
}

export function ChallengeNotification({
  challenge,
  currentUserId,
  playerNames,
  onResponded,
}: ChallengeNotificationProps) {
  const [loading, setLoading] = useState(false)
  const isIncoming = challenge.challenged_id === currentUserId || challenge.challenged_partner_id === currentUserId
  const isOutgoing = challenge.challenger_id === currentUserId || challenge.challenger_partner_id === currentUserId

  async function handleAccept() {
    setLoading(true)
    await respondToChallengeAction(challenge.id, true)
    onResponded()
    setLoading(false)
  }

  async function handleDecline() {
    setLoading(true)
    await respondToChallengeAction(challenge.id, false)
    onResponded()
    setLoading(false)
  }

  async function handleCancel() {
    setLoading(true)
    await cancelChallengeAction(challenge.id)
    onResponded()
    setLoading(false)
  }

  const challengerName = playerNames[challenge.challenger_id] || "Someone"

  if (isIncoming && challenge.status === 'pending') {
    return (
      <div className="rounded-xl border-2 border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <Swords className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Challenge from {challengerName}!</p>
            <p className="text-xs text-muted-foreground">
              {challenge.challenger_partner_id
                ? `${challengerName} & ${playerNames[challenge.challenger_partner_id] || "partner"}`
                : challengerName
              } want to play!
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={loading}
              className="h-8 px-3"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDecline}
              disabled={loading}
              className="h-8 px-3 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isOutgoing && challenge.status === 'pending') {
    const challengedName = playerNames[challenge.challenged_id] || "Friend"
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Swords className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Challenge sent to {challengedName}</p>
            <p className="text-xs text-muted-foreground">Waiting for response...</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={loading}
            className="h-8 px-3 text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (challenge.status === 'accepted') {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <Swords className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm font-medium text-primary">Challenge accepted! You&apos;re queued up.</p>
        </div>
      </div>
    )
  }

  return null
}
