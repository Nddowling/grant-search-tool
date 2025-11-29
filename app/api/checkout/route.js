/**
 * Stripe Checkout API Route
 * Creates checkout sessions for template purchases (standard and custom AI-generated)
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

// Custom template pricing
const CUSTOM_TEMPLATE_PRICE = 4900; // $49.00

export async function POST(request) {
  try {
    const body = await request.json();
    const { templateId, email, grantId, promoCode, isCustom, customTemplate } = body;

    let template;
    let price;
    let name;
    let description;

    if (isCustom && customTemplate) {
      // Custom AI-generated template
      template = { id: 'custom-ai-generated' };
      price = CUSTOM_TEMPLATE_PRICE;
      name = customTemplate.templateTitle || 'Custom AI Grant Template';
      description = customTemplate.grantSummary || 'AI-generated custom template for your specific grant';
    } else {
      // Standard template
      template = getTemplateById(templateId);
      if (!template) {
        return Response.json({ error: 'Template not found' }, { status: 404 });
      }
      price = template.price;
      name = template.name;
      description = template.description;
    }

    // Check for valid promo code
    if (promoCode) {
      const promo = PROMO_CODES[promoCode];

      if (!promo) {
        return Response.json({ error: 'invalid_promo' }, { status: 400 });
      }

      // If 100% discount, bypass Stripe entirely
      if (promo.discount === 100) {
        console.log(`Promo code ${promoCode} used by ${email} for template ${templateId}`);

        if (isCustom && customTemplate) {
          // For custom templates, encode the template data in the URL
          const encodedTemplate = encodeURIComponent(JSON.stringify(customTemplate));
          return Response.json({
            url: `/purchase-success?type=custom&promo=${promoCode}&data=${encodedTemplate}`,
            message: `Promo applied: ${promo.description}`
          });
        }

        return Response.json({
          url: `/purchase-success?template=${templateId}&promo=${promoCode}`,
          message: `Promo applied: ${promo.description}`
        });
      }

      // Partial discounts also give free access for testing
      console.log(`Promo code ${promoCode} (${promo.discount}% off) used by ${email}`);

      if (isCustom && customTemplate) {
        const encodedTemplate = encodeURIComponent(JSON.stringify(customTemplate));
        return Response.json({
          url: `/purchase-success?type=custom&promo=${promoCode}&data=${encodedTemplate}`,
          message: `Promo applied: ${promo.description}`
        });
      }

      return Response.json({
        url: `/purchase-success?template=${templateId}&promo=${promoCode}`,
        message: `Promo applied: ${promo.description}`
      });
    }

    // Check if Stripe is configured
    if (!stripe) {
      console.warn('Stripe not configured - returning mock checkout');

      if (isCustom && customTemplate) {
        const encodedTemplate = encodeURIComponent(JSON.stringify(customTemplate));
        return Response.json({
          url: `/purchase-success?type=custom&mock=true&data=${encodedTemplate}`,
          message: 'Stripe not configured - mock checkout'
        });
      }

      return Response.json({
        url: `/purchase-success?template=${templateId}&mock=true`,
        message: 'Stripe not configured - mock checkout'
      });
    }

    // Get the base URL for success/cancel redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // For custom templates, we need to store the template data temporarily
    // We'll pass it through session metadata (Stripe allows up to 500 chars per field)
    let metadata = {
      templateId: template.id,
      email: email,
      grantId: grantId || '',
      isCustom: isCustom ? 'true' : 'false',
    };

    // For custom templates, store a reference (the actual download happens client-side)
    if (isCustom && customTemplate) {
      metadata.customTemplateTitle = (customTemplate.templateTitle || '').slice(0, 450);
    }

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
              name: name,
              description: description.slice(0, 500),
              metadata: {
                templateId: template.id,
                type: isCustom ? 'custom' : 'standard',
              },
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      metadata: metadata,
      success_url: isCustom
        ? `${baseUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}&type=custom`
        : `${baseUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}&template=${templateId}`,
      cancel_url: `${baseUrl}?checkout=cancelled`,
    });

    // For custom templates, also return the template data so client can store it
    if (isCustom && customTemplate) {
      return Response.json({
        url: session.url,
        sessionId: session.id,
        storeCustomTemplate: true,
        customTemplateData: customTemplate,
      });
    }

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
      isCustom: session.metadata?.isCustom === 'true',
      customTemplateTitle: session.metadata?.customTemplateTitle,
      amount: session.amount_total,
    });

  } catch (error) {
    console.error('Session retrieval error:', error);
    return Response.json({ error: 'Failed to retrieve session' }, { status: 500 });
  }
}
