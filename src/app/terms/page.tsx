import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 flex items-center gap-4 px-6 md:px-10 py-4 bg-background/80 backdrop-blur-lg border-b">
        <Button render={<Link href="/" />} variant="ghost" size="sm">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </Button>
        <span className="text-sm font-semibold">Terms of Service</span>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 22, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using PickleGG (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>PickleGG is a web-based platform for managing pickleball court queues, tracking game scores, and organizing play sessions. The Service is provided &quot;as is&quot; and may be updated or modified at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Accounts</h2>
            <p>You must create an account to use certain features. You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Venue Subscriptions</h2>
            <p>Venue Pro and Enterprise plans are billed monthly. You may cancel at any time, and cancellation takes effect at the end of the current billing period. Refunds are not provided for partial months. We reserve the right to change pricing with 30 days notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Acceptable Use</h2>
            <p>You agree not to misuse the Service. This includes but is not limited to: interfering with the Service&apos;s operation, accessing data not intended for you, attempting to breach security measures, or using the Service for any unlawful purpose.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Content and Data</h2>
            <p>You retain ownership of any content you submit to the Service, including display names and game data. By using the Service, you grant us a license to store and display this content as necessary to operate the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, PickleGG shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Termination</h2>
            <p>We may suspend or terminate your access to the Service at any time for violation of these terms. You may delete your account at any time. Upon termination, your data will be deleted in accordance with our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Changes to Terms</h2>
            <p>We may update these terms from time to time. We will notify users of material changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Contact</h2>
            <p>Questions about these terms? Contact us at <a href="mailto:hello@picklegg.com" className="text-primary hover:underline">hello@picklegg.com</a>.</p>
          </section>
        </div>
      </div>
    </main>
  )
}
