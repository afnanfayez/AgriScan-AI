import Stripe from 'stripe';
import { ServiceError } from '@/services/errors';

let client: Stripe | null = null;

// Server-only Stripe client. Never import this from a 'use client' component.
export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  const isRealKey = key && key !== 'MY_STRIPE_SECRET_KEY' && key.length > 10;

  if (!isRealKey) {
    throw new ServiceError('Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.', 503);
  }

  if (!client) {
    client = new Stripe(key);
  }

  return client;
}
