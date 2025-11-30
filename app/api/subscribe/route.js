/**
 * Stripe Subscription API Route
 * Creates checkout sessions for Pro subscriptions
 *
 * Pricing:
 * - Monthly: $29/mo
 * - 6-Month: $165.30 (5% off = $27.55/mo)
 * - Annual: $313.20 (10% off = $26.10/mo)
 */

import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Subscription pricing in cents
const PRICING = {
  monthly: {
    amount: 2400, // $24.00
    interval: 'month',
    intervalCount: 1,
    name: 'Pro Monthly',
    description: 'Unlimited AI searches, email alerts, CSV export',
  },
  annual: {
    amount: 19900, // $199.00 (~17% off monthly)
    interval: 'year',
    intervalCount: 1,
    name: 'Pro Annual',
    description: 'Save $89/year - Unlimited AI searches, email alerts, CSV export',
    savings: '17%',
    savingsDollar: 89,
  },
};

// Pro plan features (templates NOT included - they're à la carte)
const PRO_FEATURES = [
  'Unlimited AI-powered searches',
  'Save organization profile',
  'Email alerts for new grants',
  'Export search results to CSV',
  'Priority support',
];

// Valid promo codes for subscriptions
const PROMO_CODES = {
  'NicksFreePromoCode': { discount: 100, description: 'God mode - 100% off' },
  'PROPRO': { discount: 100, description: 'Free Pro access' },
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { plan, email, userId, promoCode } = body;

    if (!plan || !PRICING[plan]) {
      return Response.json({
        error: 'Invalid plan. Choose: monthly or annual'
      }, { status: 400 });
    }

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const selectedPlan = PRICING[plan];

    // Check for valid promo code - bypass payment entirely
    if (promoCode) {
      const promo = PROMO_CODES[promoCode];

      if (!promo) {
        return Response.json({ error: 'invalid_promo' }, { status: 400 });
      }

      if (promo.discount === 100) {
        console.log(`Promo code ${promoCode} used by ${email} for ${plan} subscription`);
        // Return success URL that will activate Pro status
        return Response.json({
          url: `/purchase-success?subscription=${plan}&promo=${promoCode}`,
          message: `Promo applied: ${promo.description}`,
          promo: true,
        });
      }
    }

    // Check if Stripe is configured
    if (!stripe) {
      console.warn('Stripe not configured - returning mock subscription');
      return Response.json({
        url: `/purchase-success?subscription=${plan}&mock=true`,
        message: 'Stripe not configured - mock checkout',
        mock: true,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Create or retrieve customer
    let customer;
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: { userId: userId || '' },
      });
    }

    // Create the checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
              metadata: {
                plan: plan,
                features: PRO_FEATURES.join(', '),
              },
            },
            unit_amount: selectedPlan.amount,
            recurring: {
              interval: selectedPlan.interval,
              interval_count: selectedPlan.intervalCount,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        plan,
        email,
        userId: userId || '',
      },
      success_url: `${baseUrl}/purchase-success?subscription=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}?checkout=cancelled`,
      subscription_data: {
        metadata: {
          plan,
          email,
        },
      },
    });

    return Response.json({
      url: session.url,
      sessionId: session.id,
      plan,
      amount: selectedPlan.amount,
    });

  } catch (error) {
    console.error('Subscription checkout error:', error);
    return Response.json(
      { error: 'Failed to create subscription checkout' },
      { status: 500 }
    );
  }
}

// GET endpoint to check subscription status
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const sessionId = searchParams.get('session_id');

  if (!stripe) {
    return Response.json({
      subscribed: false,
      mock: true,
      message: 'Stripe not configured'
    });
  }

  try {
    // If session_id provided, check that specific session
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        return Response.json({
          subscribed: subscription.status === 'active',
          status: subscription.status,
          plan: session.metadata?.plan,
          currentPeriodEnd: subscription.current_period_end,
          email: session.customer_email,
        });
      }
    }

    // If email provided, check for active subscription
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });

      if (customers.data.length > 0) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customers.data[0].id,
          status: 'active',
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          return Response.json({
            subscribed: true,
            status: sub.status,
            plan: sub.metadata?.plan,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          });
        }
      }

      return Response.json({
        subscribed: false,
        status: 'none',
      });
    }

    return Response.json({ error: 'Email or session_id required' }, { status: 400 });

  } catch (error) {
    console.error('Subscription check error:', error);
    return Response.json({ error: 'Failed to check subscription' }, { status: 500 });
  }
}

// Return pricing info for display
export async function OPTIONS() {
  return Response.json({
    pricing: PRICING,
    features: PRO_FEATURES,
  });
}
