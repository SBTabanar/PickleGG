export default function LeaderboardLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-6 z-10">
        <div className="flex items-center gap-6">
          <div className="h-7 w-7 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </div>
      </header>
      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-8">
          <div className="text-center space-y-2">
            <div className="h-7 w-28 rounded-full bg-muted animate-pulse mx-auto" />
            <div className="h-8 w-48 rounded bg-muted animate-pulse mx-auto" />
            <div className="h-4 w-64 rounded bg-muted animate-pulse mx-auto" />
          </div>
          <div className="rounded-2xl border overflow-hidden">
            <div className="bg-muted/30 h-10 border-b" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
                <div className="h-4 w-8 rounded bg-muted animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse flex-1" />
                <div className="h-4 w-8 rounded bg-muted animate-pulse" />
                <div className="h-5 w-12 rounded-full bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
