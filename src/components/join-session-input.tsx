"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogIn } from "lucide-react"

export function JoinSessionInput() {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError("Enter a session code")
      return
    }
    if (!/^[A-Z0-9]{4,10}$/.test(trimmed)) {
      setError("Invalid code format")
      return
    }
    setError(null)
    router.push(`/join/${trimmed}`)
  }

  return (
    <form onSubmit={handleJoin} className="flex gap-2">
      <div className="flex-1">
        <Input
          placeholder="Enter code (e.g. K3X9MF)"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(null) }}
          className="uppercase font-mono tracking-wider"
          maxLength={10}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <Button type="submit" size="default">
        <LogIn className="mr-1.5 h-3.5 w-3.5" />
        Join
      </Button>
    </form>
  )
}
