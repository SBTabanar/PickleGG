import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 flex items-center gap-4 px-6 md:px-10 py-4 bg-background/80 backdrop-blur-lg border-b">
        <Button render={<Link href="/" />} variant="ghost" size="sm">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </Button>
        <span className="text-sm font-semibold">Privacy Policy</span>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 22, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p>We collect the following information when you use PickleGG:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-foreground">Account information:</strong> Email address, display name, and avatar (optional).</li>
              <li><strong className="text-foreground">Game data:</strong> Scores, match history, win/loss records, and session participation.</li>
              <li><strong className="text-foreground">Venue data:</strong> Venue name, court configurations, staff membership, and session schedules.</li>
              <li><strong className="text-foreground">Usage data:</strong> Pages visited, features used, and basic device information for improving the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide and operate the Service (queue management, scoring, leaderboards).</li>
              <li>Display your name and stats to other players in sessions you join.</li>
              <li>Send transactional emails (account verification, password resets).</li>
              <li>Improve the Service based on usage patterns.</li>
            </ul>
            <p className="mt-2">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Data Storage</h2>
            <p>Your data is stored securely using Supabase, which uses PostgreSQL databases with encryption at rest and in transit. Data is hosted in the United States. We retain your data for as long as your account is active.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Data Sharing</h2>
            <p>We share your data only in these limited circumstances:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-foreground">Within sessions:</strong> Your display name, scores, and queue position are visible to other session participants.</li>
              <li><strong className="text-foreground">Spectator view:</strong> Active game scores and player names are visible to anyone with the session&apos;s share link.</li>
              <li><strong className="text-foreground">Leaderboards:</strong> Your display name, win/loss record, and games played are publicly visible on session leaderboards.</li>
              <li><strong className="text-foreground">Service providers:</strong> We use Supabase for database hosting and Stripe for payment processing. These providers have their own privacy policies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use tracking cookies or third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access and export your data.</li>
              <li>Correct inaccurate information.</li>
              <li>Delete your account and associated data.</li>
              <li>Opt out of non-essential communications.</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at <a href="mailto:hello@picklegg.com" className="text-primary hover:underline">hello@picklegg.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Children</h2>
            <p>PickleGG is not intended for children under 13. We do not knowingly collect information from children under 13. If you believe we have collected such information, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Contact</h2>
            <p>Questions about this policy? Contact us at <a href="mailto:hello@picklegg.com" className="text-primary hover:underline">hello@picklegg.com</a>.</p>
          </section>
        </div>
      </div>
    </main>
  )
}
