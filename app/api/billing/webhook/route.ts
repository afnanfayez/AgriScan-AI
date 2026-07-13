import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import { syncSubscriptionFromStripe } from '@/services/billing-service';

// Stripe needs Node's crypto module for signature verification — not available
// on the Edge runtime.
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    // A bad/forged signature must NOT be treated as a retryable server error —
    // returning 400 tells Stripe this is a client problem and stops retries.
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const stripe = getStripeClient();
          const subscriptionId =
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionFromStripe(subscription);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Modern API versions nest the subscription under
        // `parent.subscription_details.subscription`; fall back to the
        // legacy top-level `subscription` field for older accounts.
        const subscriptionRef =
          (invoice as any).parent?.subscription_details?.subscription ?? (invoice as any).subscription;
        if (subscriptionRef) {
          const stripe = getStripeClient();
          const id = typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef.id;
          const subscription = await stripe.subscriptions.retrieve(id);
          await syncSubscriptionFromStripe(subscription);
        }
        break;
      }
      default:
        break;
    }
  } catch (error: any) {
    console.error('Error processing Stripe webhook event:', event.type, error);
    return NextResponse.json({ error: 'Failed to process webhook event.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
