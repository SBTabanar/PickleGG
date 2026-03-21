"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Session error:", error.digest ?? error.message)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <span className="text-2xl text-destructive">!</span>
        </div>
        <h2 className="text-lg font-semibold">Failed to load session</h2>
        <p className="text-sm text-muted-foreground">
          We could not load this session. It may have been deleted, or there was a connection issue.
        </p>
        <div className="flex gap-3">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
          <Button render={<Link href="/dashboard" />} variant="ghost">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
