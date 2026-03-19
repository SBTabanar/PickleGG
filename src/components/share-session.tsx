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
import { Input } from "@/components/ui/input"
import { Share2, Copy, Check } from "lucide-react"

interface ShareSessionProps {
  shareCode: string | null
  sessionName: string
}

export function ShareSession({ shareCode, sessionName }: ShareSessionProps) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState(`/join/${shareCode}`)

  useEffect(() => {
    setShareUrl(`${window.location.origin}/join/${shareCode}`)
  }, [shareCode])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setCopyFailed(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (e.g., insecure context or denied permission).
      // Show a message prompting the user to copy manually instead of using
      // the deprecated document.execCommand("copy") which manipulates the DOM.
      setCopyFailed(true)
      setTimeout(() => setCopyFailed(false), 4000)
    }
  }

  if (!shareCode) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            Share
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Session</DialogTitle>
          <DialogDescription>
            Share this link so others can join &quot;{sessionName}&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Session Code</label>
            <div className="flex items-center gap-2 rounded-xl bg-muted/50 border px-4 py-3">
              <span className="text-lg font-mono font-bold tracking-widest flex-1">{shareCode}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="font-mono text-xs"
              />
              <Button
                size="default"
                variant={copied ? "default" : "outline"}
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            {copyFailed && (
              <p className="text-xs text-muted-foreground">
                Could not copy automatically. Please select the link above and copy it manually.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
