import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from 'next/link'
import { ModeToggle } from '@/components/mode-toggle'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link href="#" className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <span className="text-primary font-bold text-xl">PickleGG</span>
          </Link>
          <Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">
            Sessions
          </Link>
          <Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">
            Leaderboard
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span>{user?.email || "Guest User"}</span>
          <ModeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Active Session: Saturday Open Play</h1>
          <Button>Join Queue</Button>
        </div>

        <Tabs defaultValue="queue" className="w-full">
          <TabsList>
            <TabsTrigger value="queue">Paddle Queue</TabsTrigger>
            <TabsTrigger value="courts">Courts (3)</TabsTrigger>
          </TabsList>
          <TabsContent value="queue" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Next Up (The Bucket)</CardTitle>
                <CardDescription>Players waiting for the next open court. 4 players per bucket.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/50">
                  <div className="flex gap-4">
                    <div className="font-semibold w-24">Bucket 1</div>
                    <div className="text-muted-foreground">Alex, Sarah, Mike, John</div>
                  </div>
                  <Button variant="secondary" size="sm">Ready</Button>
                </div>
                <div className="flex items-center justify-between border p-4 rounded-lg">
                  <div className="flex gap-4">
                    <div className="font-semibold w-24">Bucket 2</div>
                    <div className="text-muted-foreground">Emma, David <span className="text-primary/70 text-xs uppercase ml-2 border px-1 rounded">2 spots open</span></div>
                  </div>
                  <Button variant="outline" size="sm">Join Bucket</Button>
                </div>
                <div className="flex items-center justify-between border p-4 rounded-lg opacity-60">
                  <div className="flex gap-4">
                    <div className="font-semibold w-24">Bucket 3</div>
                    <div className="text-muted-foreground italic">Empty</div>
                  </div>
                  <Button variant="outline" size="sm">Start Bucket</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="courts" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((court) => (
                <Card key={court}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Court {court}</CardTitle>
                    <CardDescription className="text-green-500 font-medium">In Progress</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm py-2">
                      <span>Team A:</span>
                      <span className="font-medium">Tom & Jerry</span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-2 border-b mb-2">
                      <span>Team B:</span>
                      <span className="font-medium">Spike & Tyke</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="default" className="w-full" size="sm">Enter Score</Button>
                      <Button variant="destructive" className="w-full" size="sm">Clear Court</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
