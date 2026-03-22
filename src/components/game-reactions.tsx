"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/utils/supabase/client"

const REACTIONS = [
  { emoji: "\uD83D\uDC4D", label: "thumbs up" },
  { emoji: "\uD83D\uDD25", label: "fire" },
  { emoji: "\uD83D\uDCAF", label: "100" },
  { emoji: "\uD83D\uDC4F", label: "clap" },
  { emoji: "\uD83D\uDE02", label: "laugh" },
  { emoji: "\u2764\uFE0F", label: "heart" },
]

interface FloatingReaction {
  id: string
  emoji: string
  x: number
  createdAt: number
}

interface GameReactionsProps {
  sessionId: string
  gameId: string
  canReact?: boolean
}

export function GameReactions({ sessionId, gameId, canReact = true }: GameReactionsProps) {
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const lastSentRef = useRef(0)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
  const supabaseRef = useRef(createClient())

  const addFloating = useCallback((emoji: string) => {
    const reaction: FloatingReaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      x: 10 + Math.random() * 80,
      createdAt: Date.now(),
    }
    setFloatingReactions(prev => [...prev, reaction])
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id))
    }, 2500)
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase.channel(`reactions-${gameId}`)

    channel
      .on("broadcast", { event: "reaction" }, (payload) => {
        if (payload.payload?.emoji) {
          addFloating(payload.payload.emoji)
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, addFloating])

  function sendReaction(emoji: string) {
    const now = Date.now()
    if (now - lastSentRef.current < 1000) return
    lastSentRef.current = now

    channelRef.current?.send({
      type: "broadcast",
      event: "reaction",
      payload: { emoji },
    })
    // Also show locally
    addFloating(emoji)
  }

  return (
    <div className="relative">
      {/* Floating reactions */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
        {floatingReactions.map((r) => (
          <span
            key={r.id}
            className="absolute text-2xl animate-reaction-float"
            style={{ left: `${r.x}%`, bottom: 0 }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {/* Reaction bar */}
      {canReact && (
        <div className="flex items-center justify-center gap-1 mt-2">
          {REACTIONS.map(({ emoji, label }) => (
            <button
              key={label}
              onClick={() => sendReaction(emoji)}
              className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-base transition-transform hover:scale-125 active:scale-90"
              aria-label={`React with ${label}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
