import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-02-25.clover',
    })
  }
  return _stripe
}

export const PLANS = {
  'venue-pro': {
    name: 'Venue Pro',
    priceId: process.env.STRIPE_VENUE_PRO_PRICE_ID!,
    trialDays: 14,
  },
} as const
