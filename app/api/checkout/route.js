/**
 * Stripe Checkout API Route
 * Creates checkout sessions for template purchases
 */

import Stripe from 'stripe';
import { getTemplateById } from '../../../lib/templates';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Valid promo codes - add more as needed
const PROMO_CODES = {
  'NicksFreePromoCode': { discount: 100, description: 'God mode - 100% off' },
  'LAUNCH50': { discount: 50, description: '50% off launch special' },
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { templateId, email, grantId, promoCode } = body;

    // Validate template exists
    const template = getTemplateById(templateId);
    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check for valid promo code
    if (promoCode) {
      const promo = PROMO_CODES[promoCode];

      if (!promo) {
        // Invalid promo code
        return Response.json({ error: 'invalid_promo' }, { status: 400 });
      }

      // If 100% discount, bypass Stripe entirely
      if (promo.discount === 100) {
        console.log(`Promo code ${promoCode} used by ${email} for template ${templateId}`);
        return Response.json({
          url: `/purchase-success?template=${templateId}&promo=${promoCode}`,
          message: `Promo applied: ${promo.description}`
        });
      }

      // For partial discounts, we'd apply to Stripe (future enhancement)
      // For now, partial discounts also give free access for testing
      console.log(`Promo code ${promoCode} (${promo.discount}% off) used by ${email}`);
      return Response.json({
        url: `/purchase-success?template=${templateId}&promo=${promoCode}`,
        message: `Promo applied: ${promo.description}`
      });
    }

    // Check if Stripe is configured
    if (!stripe) {
      console.warn('Stripe not configured - returning mock checkout');
      return Response.json({
        url: `/purchase-success?template=${templateId}&mock=true`,
        message: 'Stripe not configured - mock checkout'
      });
    }

    // Get the base URL for success/cancel redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: template.name,
              description: template.description,
              metadata: {
                templateId: template.id,
                category: template.category,
              },
            },
            unit_amount: template.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        templateId: template.id,
        email: email,
        grantId: grantId || '',
      },
      success_url: `${baseUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}&template=${templateId}`,
      cancel_url: `${baseUrl}?checkout=cancelled`,
    });

    return Response.json({ url: session.url, sessionId: session.id });

  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve session details (for success page)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return Response.json({ error: 'Session ID required' }, { status: 400 });
  }

  if (!stripe) {
    return Response.json({
      success: true,
      mock: true,
      message: 'Stripe not configured'
    });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return Response.json({
      success: session.payment_status === 'paid',
      email: session.customer_email,
      templateId: session.metadata?.templateId,
      amount: session.amount_total,
    });

  } catch (error) {
    console.error('Session retrieval error:', error);
    return Response.json({ error: 'Failed to retrieve session' }, { status: 500 });
  }
}
