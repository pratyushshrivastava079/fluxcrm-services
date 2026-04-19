import Stripe from 'stripe';

type StripeInstance = InstanceType<typeof Stripe>;

let _stripe: StripeInstance | null = null;

export function getStripe(): StripeInstance {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.startsWith('sk_test_...')) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' as any });
  }
  return _stripe;
}

export async function createPaymentIntent(
  amountCents: number,
  currency: string,
  metadata: Record<string, string>,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: currency.toLowerCase(),
    metadata,
    automatic_payment_methods: { enabled: true },
  });
  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
  };
}
