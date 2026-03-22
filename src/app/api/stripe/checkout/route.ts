import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getStripe, PLANS } from '@/utils/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { venueId, planKey } = await request.json()

  const plan = PLANS[planKey as keyof typeof PLANS]
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // Verify venue ownership
  const { data: member } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Only venue owners can subscribe' }, { status: 403 })
  }

  const origin = request.headers.get('origin') || ''

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: plan.trialDays,
      metadata: { venue_id: venueId, user_id: user.id },
    },
    metadata: { venue_id: venueId, user_id: user.id },
    success_url: `${origin}/dashboard/venue/${venueId}?subscription=success`,
    cancel_url: `${origin}/dashboard/venue/${venueId}?subscription=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
