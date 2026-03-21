import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SessionNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <span className="text-3xl font-bold text-primary">?</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Session Not Found</h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        This session may have been deleted or the link is invalid.
      </p>
      <Button render={<Link href="/dashboard" />} size="lg">
        Back to Dashboard
      </Button>
    </div>
  )
}
