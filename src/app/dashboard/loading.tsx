export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-6 z-10">
        <div className="flex items-center gap-6">
          <div className="h-7 w-7 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-6 p-6 md:p-10 max-w-4xl mx-auto w-full">
        {/* Welcome banner skeleton */}
        <div className="rounded-2xl border bg-card p-6 md:p-8">
          <div className="h-4 w-24 rounded bg-muted animate-pulse mb-2" />
          <div className="h-7 w-40 rounded bg-muted animate-pulse mb-1" />
          <div className="h-4 w-56 rounded bg-muted animate-pulse" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card px-4 py-3.5">
              <div className="h-3 w-20 rounded bg-muted animate-pulse mb-2" />
              <div className="h-6 w-10 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        {/* Session cards skeleton */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-28 rounded bg-muted animate-pulse" />
            <div className="h-7 w-28 rounded bg-muted animate-pulse" />
          </div>
          <div className="grid gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 rounded-xl border bg-card">
                <div className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
                  <div>
                    <div className="h-4 w-32 rounded bg-muted animate-pulse mb-1.5" />
                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
