import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import { getSupabaseAdminClient } from '@/lib/supabase';
import type { SupabaseUserProfile } from '@/lib/auth';
import { ServiceError } from './errors';
import type { Plan } from './plan-service';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function priceIdForPlan(plan: 'Pro' | 'Enterprise'): string {
  const priceId = plan === 'Pro' ? process.env.STRIPE_PRICE_ID_PRO : process.env.STRIPE_PRICE_ID_ENTERPRISE;
  if (!priceId) {
    throw new ServiceError(`Stripe is not configured for the ${plan} plan. Set STRIPE_PRICE_ID_${plan.toUpperCase()}.`, 503);
  }
  return priceId;
}

function planForPriceId(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'Pro';
  if (priceId === process.env.STRIPE_PRICE_ID_ENTERPRISE) return 'Enterprise';
  return null;
}

// Subscription statuses that mean "the customer currently has paid access".
// Anything else (canceled, incomplete_expired, unpaid, paused) drops them
// back to Free.
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);

async function getOrCreateStripeCustomerId(user: SupabaseUserProfile): Promise<string> {
  const admin = getSupabaseAdminClient();
  const stripe = getStripeClient();

  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { supabase_user_id: user.id },
  });

  const { error } = await admin
    .from('subscriptions')
    .upsert({ user_id: user.id, stripe_customer_id: customer.id }, { onConflict: 'user_id' });

  if (error) {
    console.error('Failed to persist Stripe customer id:', error);
    throw new ServiceError('Failed to set up billing account.', 500);
  }

  return customer.id;
}

export async function createCheckoutSession(
  user: SupabaseUserProfile,
  plan: 'Pro' | 'Enterprise',
  theme: 'light' | 'dark' = 'light',
  cancelPath = '/dashboard?checkout=cancelled',
  appUrl = APP_URL
): Promise<string> {
  const stripe = getStripeClient();
  const customerId = await getOrCreateStripeCustomerId(user);
  const isDark = theme === 'dark';
  const baseUrl = appUrl.replace(/\/$/, '');
  const cancelUrl = `${baseUrl}${cancelPath}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
    branding_settings: {
      background_color: isDark ? '#020617' : '#ffffff',
      button_color: '#059669',
      display_name: 'Agriscan AI',
      border_style: 'rounded',
    },
    subscription_data: { metadata: { supabase_user_id: user.id } },
    success_url: `${baseUrl}/dashboard?checkout=success`,
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    throw new ServiceError('Failed to create checkout session.', 502);
  }

  return session.url;
}

export async function createPortalSession(user: SupabaseUserProfile): Promise<string> {
  const stripe = getStripeClient();
  const admin = getSupabaseAdminClient();

  const { data } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    throw new ServiceError('No billing account yet — upgrade to a paid plan first.', 400);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${APP_URL}/dashboard?tab=settings`,
  });

  return session.url;
}

// Called only from the Stripe webhook handler. Resolves the subscription's
// plan/status from Stripe and syncs both `subscriptions` and the
// `profiles.plan` cache using the service-role client — this is the only
// code path allowed to change a user's plan.
export async function syncSubscriptionFromStripe(subscription: Stripe.Subscription): Promise<void> {
  const admin = getSupabaseAdminClient();
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const { data: existing, error: lookupError } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (lookupError) {
    console.error('Error looking up subscription by customer id:', lookupError);
    return;
  }

  const userId = existing?.user_id || subscription.metadata?.supabase_user_id;
  if (!userId) {
    console.error('Stripe webhook: could not resolve a Supabase user for customer', customerId);
    return;
  }

  const item = subscription.items.data[0];
  const resolvedPlan = planForPriceId(item?.price?.id);
  const plan: Plan = resolvedPlan && ENTITLED_STATUSES.has(subscription.status) ? resolvedPlan : 'Free';

  const { error: subError } = await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: item?.price?.id || null,
      plan,
      status: subscription.status,
      current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (subError) {
    console.error('Failed to sync subscription row:', subError);
    return;
  }

  const { error: profileError } = await admin.from('profiles').update({ plan }).eq('id', userId);
  if (profileError) {
    console.error('Failed to sync profiles.plan from Stripe webhook:', profileError);
  }
}
