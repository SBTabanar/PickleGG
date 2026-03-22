"use client"

import { Button } from "@/components/ui/button"
import { Bell, BellOff } from "lucide-react"

interface NotificationToggleProps {
  permissionState: NotificationPermission
  onRequest: () => void
}

export function NotificationToggle({ permissionState, onRequest }: NotificationToggleProps) {
  if (typeof window === "undefined" || !("Notification" in window)) return null

  const isGranted = permissionState === "granted"
  const isDenied = permissionState === "denied"

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 w-9 p-0"
      onClick={onRequest}
      disabled={isDenied}
      title={
        isGranted
          ? "Notifications enabled"
          : isDenied
            ? "Notifications blocked — enable in browser settings"
            : "Enable notifications"
      }
    >
      {isGranted ? (
        <Bell className="h-4 w-4 text-primary" />
      ) : (
        <BellOff className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  )
}
