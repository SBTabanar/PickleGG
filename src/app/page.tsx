import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import {
  Users, LayoutGrid, Trophy, Activity, ArrowRight, CircleDot, Zap, BarChart3,
  Building2, Monitor, Shield, Calendar, Check, Clock
} from 'lucide-react'

const playerFeatures = [
  {
    icon: Users,
    title: "Queue Management",
    description: "Smart paddle-rack rotation that auto-groups players into fair teams. No more arguing over who is next.",
  },
  {
    icon: LayoutGrid,
    title: "Court Tracking",
    description: "See every court at a glance -- who is playing, scores in progress, and which courts are open.",
  },
  {
    icon: Activity,
    title: "Live Scores",
    description: "Real-time score updates across all courts. Everyone stays in the loop without shouting across the gym.",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    description: "Track wins, losses, and win rates over time. Fuel friendly competition with stats that matter.",
  },
]

const venueFeatures = [
  {
    icon: Building2,
    title: "Venue Management",
    description: "Create your venue, set up courts, and manage everything from one dashboard. No clipboards needed.",
  },
  {
    icon: Shield,
    title: "Multi-Staff Roles",
    description: "Add staff members who can run sessions on your behalf. Owner and staff roles with appropriate permissions.",
  },
  {
    icon: Monitor,
    title: "Lobby TV Mode",
    description: "Full-screen display for wall-mounted screens. Show courts, queue, and scores in real-time to your lobby.",
  },
  {
    icon: Calendar,
    title: "Session Scheduling",
    description: "Schedule recurring sessions -- daily, weekly, or weekends. Set start and end times for automatic management.",
  },
]

const steps = [
  {
    number: "01",
    icon: CircleDot,
    title: "Create a Session",
    description: "Set up your play session with the number of courts available. Share the code so others can join.",
  },
  {
    number: "02",
    icon: Zap,
    title: "Join the Queue",
    description: "Players hop into the queue solo or with partners. The system groups you into fair 4-player matches.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Play & Track",
    description: "Start matches, enter scores when done, and watch the leaderboard update live. Rotate and repeat.",
  },
]

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for casual players and small groups.",
    features: [
      "Create & join sessions",
      "Queue management",
      "Live scoring & leaderboards",
      "Spectator view",
      "Challenge friends",
    ],
    cta: "Get Started",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Venue Pro",
    price: "$39",
    period: "/month",
    description: "Everything you need to run a pickleball facility.",
    features: [
      "Everything in Free",
      "Venue dashboard",
      "Multi-staff management",
      "Lobby TV display",
      "Session scheduling & recurrence",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/login?plan=venue-pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For multi-location facilities and franchises.",
    features: [
      "Everything in Venue Pro",
      "Multiple venues",
      "Custom branding",
      "API access",
      "Dedicated support",
      "Analytics & reports",
    ],
    cta: "Contact Us",
    href: "mailto:hello@picklegg.com",
    highlighted: false,
  },
]

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 bg-background/80 backdrop-blur-lg border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center" aria-hidden="true">
            <span className="text-primary-foreground font-bold text-sm">P</span>
          </div>
          <span className="text-base font-bold tracking-tight">PickleGG</span>
        </div>
        <nav aria-label="Main navigation" className="flex items-center gap-3">
          <Link href="#pricing" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="#venues" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
            For Venues
          </Link>
          <Button render={<Link href="/login" />} variant="ghost" size="sm">
            Log in
          </Button>
          <ModeToggle />
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="flex flex-col items-center justify-center px-6 pt-24 pb-20 md:pt-32 md:pb-28 text-center max-w-4xl mx-auto">
          <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur px-4 py-1.5 mb-8">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
            <span className="text-xs font-medium text-muted-foreground">Smart Pickleball Queue &amp; Court Management</span>
          </div>

          <h1 className="animate-fade-in-up stagger-1 text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 opacity-0">
            Never Lose Track
            <span className="block text-primary-text">of the Queue</span>
          </h1>

          <p className="animate-fade-in-up stagger-2 text-base md:text-lg text-muted-foreground mb-10 max-w-xl leading-relaxed opacity-0">
            Smart queue rotation, court management, and stat tracking for pickleball players and venues.
            Ditch the messy paddle stacks and play more.
          </p>

          <div className="animate-fade-in-up stagger-3 flex flex-col sm:flex-row gap-3 opacity-0">
            <Button render={<Link href="/login" />} size="lg" className="px-8 h-12 text-base">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button render={<Link href="#venues" />} variant="outline" size="lg" className="px-8 h-12 text-base">
              For Venue Owners
            </Button>
          </div>

          <div className="animate-fade-in-up stagger-4 mt-16 flex items-center gap-8 md:gap-12 opacity-0">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold">100+</p>
              <p className="text-xs text-muted-foreground mt-1">Active Players</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold">500+</p>
              <p className="text-xs text-muted-foreground mt-1">Games Played</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold">4.9</p>
              <p className="text-xs text-muted-foreground mt-1">Player Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Player Features Section */}
      <section className="px-6 py-20 md:py-28 border-t bg-muted/30" aria-labelledby="features-heading">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-primary-text uppercase mb-3">For Players</p>
            <h2 id="features-heading" className="text-3xl md:text-4xl font-bold tracking-tight">
              Everything You Need on Court
            </h2>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto">
              Built for rec centers, clubs, and pickup groups who want organized play without the hassle.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {playerFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border bg-card p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300" aria-hidden="true">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Venue Owners Section */}
      <section id="venues" className="px-6 py-20 md:py-28 border-t" aria-labelledby="venues-heading">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-primary-text uppercase mb-3">For Venue Owners</p>
            <h2 id="venues-heading" className="text-3xl md:text-4xl font-bold tracking-tight">
              Run Your Facility Like a Pro
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              PickleGG replaces your whiteboard queue, reduces court downtime, and keeps players coming back.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {venueFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border bg-card p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300" aria-hidden="true">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button render={<Link href="/login?plan=venue-pro" />} size="lg" className="px-10 h-12 text-base">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-20 md:py-28 border-t bg-muted/30" aria-labelledby="how-it-works-heading">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-primary-text uppercase mb-3">How It Works</p>
            <h2 id="how-it-works-heading" className="text-3xl md:text-4xl font-bold tracking-tight">
              Up and Running in Minutes
            </h2>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto">
              Three simple steps to organized pickleball sessions.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative text-center group">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold text-primary-text mb-2">{step.number}</div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-20 md:py-28 border-t" aria-labelledby="pricing-heading">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-primary-text uppercase mb-3">Pricing</p>
            <h2 id="pricing-heading" className="text-3xl md:text-4xl font-bold tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto">
              Free for players. Affordable plans for venues that want to level up.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 md:p-8 flex flex-col ${
                  plan.highlighted
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'bg-card'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  render={<Link href={plan.href} />}
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full h-11"
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 md:py-28 border-t bg-muted/30" aria-labelledby="cta-heading">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl border bg-card p-10 md:p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
            <div className="relative">
              <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Ready to Organize Your Next Session?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Join the growing community of pickleball players and venues using PickleGG to manage courts and track stats.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button render={<Link href="/login" />} size="lg" className="px-10 h-12 text-base">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button render={<Link href="#pricing" />} variant="outline" size="lg" className="px-10 h-12 text-base">
                  View Pricing
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center" aria-hidden="true">
              <span className="text-primary-foreground font-bold text-xs">P</span>
            </div>
            <span className="text-sm font-semibold">PickleGG</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} PickleGG. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}
