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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Search, UserPlus, Check, X, Clock, Trash2 } from "lucide-react"
import {
  getFriendsAction,
  sendFriendRequestAction,
  respondToFriendRequestAction,
  removeFriendAction,
  searchPlayersAction,
} from "@/app/friends/actions"

type FriendInfo = {
  friendshipId: string
  userId: string
  displayName: string
  avatarUrl: string | null
}

export function FriendsDialog() {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<FriendInfo[]>([])
  const [pending, setPending] = useState<FriendInfo[]>([])
  const [outgoing, setOutgoing] = useState<FriendInfo[]>([])
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string | null; avatar_url: string | null }[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<"friends" | "add">("friends")

  useEffect(() => {
    if (open) {
      setError(null)
      setTab("friends")
      setSearch("")
      setSearchResults([])
      fetchFriends()
    }
  }, [open])

  async function fetchFriends() {
    const result = await getFriendsAction()
    setFriends(result.friends || [])
    setPending(result.pending || [])
    setOutgoing(result.outgoing || [])
  }

  async function handleSearch(query: string) {
    setSearch(query)
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    const result = await searchPlayersAction(query)
    setSearchResults(result.players || [])
    setSearching(false)
  }

  async function sendRequest(addresseeId: string) {
    setLoading(addresseeId)
    setError(null)
    const result = await sendFriendRequestAction(addresseeId)
    if (result.error) {
      setError(result.error)
    } else {
      await fetchFriends()
      // Remove from search results
      setSearchResults(prev => prev.filter(p => p.id !== addresseeId))
    }
    setLoading(null)
  }

  async function respond(friendshipId: string, accept: boolean) {
    setLoading(friendshipId)
    setError(null)
    const result = await respondToFriendRequestAction(friendshipId, accept)
    if (result.error) {
      setError(result.error)
    } else {
      await fetchFriends()
    }
    setLoading(null)
  }

  async function removeFriend(friendshipId: string) {
    setLoading(friendshipId)
    setError(null)
    const result = await removeFriendAction(friendshipId)
    if (result.error) {
      setError(result.error)
    } else {
      await fetchFriends()
    }
    setLoading(null)
  }

  const friendIds = new Set([
    ...friends.map(f => f.userId),
    ...outgoing.map(f => f.userId),
    ...pending.map(f => f.userId),
  ])

  const filteredSearchResults = searchResults.filter(p => !friendIds.has(p.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon-sm">
          <Users className="h-4 w-4" />
          <span className="sr-only">Friends</span>
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Friends</DialogTitle>
          <DialogDescription>
            Manage your friends and send requests.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          <button
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${tab === "friends" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("friends")}
          >
            Friends{friends.length > 0 ? ` (${friends.length})` : ""}
          </button>
          <button
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors relative ${tab === "add" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("add")}
          >
            Add Friend
            {pending.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {tab === "friends" && (
          <ScrollArea className="h-[300px]">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No friends yet</p>
                <p className="text-xs text-muted-foreground mt-1">Search for players to add them</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setTab("add")}>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Add Friend
                </Button>
              </div>
            ) : (
              <div className="space-y-1 pr-4">
                {friends.map(friend => (
                  <div key={friend.friendshipId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatarUrl || ""} />
                        <AvatarFallback>{friend.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{friend.displayName}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFriend(friend.friendshipId)}
                      disabled={loading === friend.friendshipId}
                      aria-label={`Remove ${friend.displayName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {tab === "add" && (
          <>
            {/* Pending incoming requests */}
            {pending.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Incoming Requests</p>
                {pending.map(req => (
                  <div key={req.friendshipId} className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={req.avatarUrl || ""} />
                        <AvatarFallback>{req.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{req.displayName}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => respond(req.friendshipId, true)}
                        disabled={loading === req.friendshipId}
                        aria-label="Accept"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => respond(req.friendshipId, false)}
                        disabled={loading === req.friendshipId}
                        aria-label="Decline"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Outgoing requests */}
            {outgoing.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Sent Requests</p>
                {outgoing.map(req => (
                  <div key={req.friendshipId} className="flex items-center justify-between p-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={req.avatarUrl || ""} />
                        <AvatarFallback>{req.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{req.displayName}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-8"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-1 pr-4">
                {searching && (
                  <p className="text-xs text-muted-foreground text-center py-4">Searching...</p>
                )}
                {!searching && search.length >= 2 && filteredSearchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No players found</p>
                )}
                {filteredSearchResults.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.avatar_url || ""} />
                        <AvatarFallback>{player.display_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{player.display_name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => sendRequest(player.id)}
                      disabled={loading === player.id}
                    >
                      <UserPlus className="mr-1 h-3 w-3" />
                      {loading === player.id ? "..." : "Add"}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
