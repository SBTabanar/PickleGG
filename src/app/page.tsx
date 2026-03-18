import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 text-center relative">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <h1 className="text-5xl font-extrabold tracking-tight mb-4">
        PickleGG
      </h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
        Smart pickleball queue rotation, court management, and stat tracking. 
        Say goodbye to messy paddle stacks and unfair wait times.
      </p>
      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link href="/login">Get Started</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/dashboard">View Dashboard</Link>
        </Button>
      </div>
    </main>
  )
}