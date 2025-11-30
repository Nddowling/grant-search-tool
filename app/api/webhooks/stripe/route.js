/**
 * Stripe Webhook Handler
 * Processes subscription and payment events
 *
 * Events handled:
 * - checkout.session.completed: New subscription/payment
 * - customer.subscription.updated: Plan changes
 * - customer.subscription.deleted: Cancellation
 * - invoice.payment_failed: Failed payment
 */

import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  if (!stripe) {
    console.warn('Stripe not configured');
    return Response.json({ received: true, mock: true });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // For development without webhook secret
      event = JSON.parse(body);
      console.warn('Webhook secret not configured - parsing raw body');
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  console.log(`Stripe webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Handle subscription checkout
        if (session.mode === 'subscription') {
          const email = session.customer_email || session.metadata?.email;
          const plan = session.metadata?.plan;

          console.log(`New subscription: ${email} - ${plan}`);

          // Here you would update your database
          // For now, we'll just log it
          // TODO: Update user record with subscription status

          // Example Supabase update (when configured):
          // await supabase
          //   .from('users')
          //   .update({
          //     subscription_status: 'active',
          //     subscription_plan: plan,
          //     subscription_id: session.subscription,
          //     subscription_started: new Date().toISOString(),
          //   })
          //   .eq('email', email);
        }

        // Handle one-time payment (template purchase)
        if (session.mode === 'payment') {
          const email = session.customer_email || session.metadata?.email;
          const templateId = session.metadata?.templateId;
          const isCustom = session.metadata?.isCustom === 'true';

          console.log(`Template purchase: ${email} - ${templateId} (custom: ${isCustom})`);

          // TODO: Record template purchase in database
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const email = subscription.metadata?.email;

        console.log(`Subscription updated: ${email} - status: ${subscription.status}`);

        // Handle plan changes, status changes, etc.
        // TODO: Update user subscription status in database

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const email = subscription.metadata?.email;

        console.log(`Subscription cancelled: ${email}`);

        // TODO: Update user to free tier in database

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const email = invoice.customer_email;

        console.log(`Payment failed: ${email}`);

        // TODO: Send email notification about failed payment
        // TODO: Update subscription status if needed

        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const email = invoice.customer_email;

        console.log(`Invoice paid: ${email} - $${(invoice.amount_paid / 100).toFixed(2)}`);

        // Reset monthly template usage on successful payment
        // TODO: Reset template_count for user in database

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Stripe sends webhooks as POST, but we'll handle GET for testing
export async function GET() {
  return Response.json({
    status: 'Stripe webhook endpoint active',
    configured: !!stripe && !!webhookSecret,
    events: [
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
      'invoice.paid',
    ],
  });
}
