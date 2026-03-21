export default function SessionLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-6 z-10">
        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        <div className="flex-1 flex justify-center">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-7 w-7 rounded bg-muted animate-pulse" />
      </header>
      <main className="flex flex-1 flex-col gap-6 p-6 md:p-10 max-w-5xl mx-auto w-full">
        {/* Stats row skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card px-4 py-3.5">
              <div className="h-3 w-16 rounded bg-muted animate-pulse mb-2" />
              <div className="h-6 w-10 rounded bg-muted animate-pulse mb-1" />
              <div className="h-2.5 w-12 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        {/* Tabs skeleton */}
        <div>
          <div className="h-10 w-full max-w-[480px] rounded-lg bg-muted animate-pulse" />
          <div className="mt-6 grid gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5 rounded-xl border bg-card">
                <div className="flex items-center gap-3.5">
                  <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                  <div>
                    <div className="h-4 w-20 rounded bg-muted animate-pulse mb-1" />
                    <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-7 w-7 rounded-full bg-muted animate-pulse border-2 border-background" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
