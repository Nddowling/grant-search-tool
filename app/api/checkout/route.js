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

// Template pricing (à la carte only - NOT included in any subscription)
const TEMPLATE_PRICING = {
  single: 4900, // $49.00
  threePack: 11900, // $119.00 (save $28)
};


export async function POST(request) {
  try {
    const body = await request.json();
    const { templateId, email, grantId, promoCode, isCustom, customTemplate, grantTitle, grantAgency } = body;

    let template;
    let price;
    let name;
    let description;

    // Handle template 3-pack purchase
    if (templateId === 'template-3pack') {
      template = { id: 'template-3pack' };
      price = TEMPLATE_PRICING.threePack;
      name = 'AI Template 3-Pack';
      description = 'Three AI-generated custom grant templates (save $28)';
    }
    // Handle single template purchase (no grant specified)
    else if (templateId === 'template-single') {
      template = { id: 'template-single' };
      price = TEMPLATE_PRICING.single;
      name = 'Single AI Template';
      description = 'One AI-generated custom grant template';
    }
    // Handle custom AI-generated template for specific grant
    else if (isCustom || templateId === 'custom-ai-generated') {
      template = { id: 'custom-ai-generated' };
      price = TEMPLATE_PRICING.single;
      name = customTemplate?.templateTitle || grantTitle ? `Custom Template: ${(grantTitle || '').slice(0, 50)}...` : 'Custom AI Grant Template';
      description = customTemplate?.grantSummary || (grantAgency ? `AI-generated template for ${grantAgency}` : 'AI-generated custom template for your specific grant');
    } else {
      // Standard template from library
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

    // Build metadata for the checkout session
    let metadata = {
      templateId: template.id,
      email: email,
      grantId: grantId || '',
      isCustom: (isCustom || templateId === 'custom-ai-generated') ? 'true' : 'false',
      templateType: template.id, // 'template-3pack', 'template-single', or 'custom-ai-generated'
    };

    // For 3-pack, track credits
    if (templateId === 'template-3pack') {
      metadata.templateCredits = '3';
    }

    // For custom templates, store grant info for generation
    if (isCustom || templateId === 'custom-ai-generated') {
      metadata.customTemplateTitle = (customTemplate?.templateTitle || grantTitle || '').slice(0, 450);
      if (grantAgency) metadata.grantAgency = grantAgency.slice(0, 100);
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
      success_url: templateId === 'template-3pack'
        ? `${baseUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}&type=3pack`
        : (isCustom || templateId === 'custom-ai-generated')
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
      templateType: session.metadata?.templateType,
      templateCredits: session.metadata?.templateCredits ? parseInt(session.metadata.templateCredits) : 1,
      isCustom: session.metadata?.isCustom === 'true',
      customTemplateTitle: session.metadata?.customTemplateTitle,
      grantAgency: session.metadata?.grantAgency,
      amount: session.amount_total,
    });

  } catch (error) {
    console.error('Session retrieval error:', error);
    return Response.json({ error: 'Failed to retrieve session' }, { status: 500 });
  }
}
