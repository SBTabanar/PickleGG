"use client"

import { useState, useCallback, useEffect } from "react"

export function useNotifications() {
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default")

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "denied" as const
    const result = await Notification.requestPermission()
    setPermissionState(result)
    return result
  }, [])

  const notify = useCallback((title: string, body?: string) => {
    if (permissionState !== "granted") return
    if (document.visibilityState === "visible") return
    try {
      new Notification(title, { body, icon: "/favicon.ico" })
    } catch {
      // Silent fail on environments that don't support Notification constructor
    }
  }, [permissionState])

  return { permissionState, requestPermission, notify }
}
