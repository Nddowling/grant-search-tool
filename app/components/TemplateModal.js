'use client';

import { useState } from 'react';

const PAY_PER_TEMPLATE_PRICE = 4900; // $49.00
const PRO_TEMPLATE_LIMIT = 5; // Pro users get 5 templates/month

export default function TemplateModal({
  isOpen,
  onClose,
  grant = null,
  userEmail = null,
  subscription = null, // { plan, status } - null means free user
  templateUsage = 0, // Number of templates used this month
  onTemplateGenerated = null // Callback when a template is generated (to update usage)
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [showSamplePreview, setShowSamplePreview] = useState(false);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState(null);
  const [generateError, setGenerateError] = useState('');

  const isPro = subscription && subscription.status === 'active';
  const templatesRemaining = isPro ? PRO_TEMPLATE_LIMIT - templateUsage : 0;
  const canUseProTemplate = isPro && templatesRemaining > 0;

  // Generate template for Pro users (included in subscription)
  const handleGenerateProTemplate = async () => {
    if (!userEmail) {
      alert('Please sign up first');
      return;
    }

    if (!grant) {
      alert('No grant selected for custom template');
      return;
    }

    if (!canUseProTemplate) {
      alert('You have used all your templates this month. Purchase additional templates at $49 each.');
      return;
    }

    setGeneratingTemplate(true);
    setGenerateError('');

    try {
      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          grantId: grant?.normalizedId || null,
          grantTitle: grant?.normalizedTitle || null,
          grantAgency: grant?.normalizedAgency || null,
          grantAmount: grant?.normalizedAmount || null,
          grantDeadline: grant?.normalizedDeadline || null,
          grantSource: grant?.source || null,
          isPro: true,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setGenerateError(data.error);
        return;
      }

      if (data.downloadUrl) {
        setGeneratedTemplate(data);
        // Update usage in parent
        if (onTemplateGenerated) {
          onTemplateGenerated();
        }
        // Update localStorage usage
        const usageKey = `templateUsage_${userEmail}_${new Date().getMonth()}`;
        localStorage.setItem(usageKey, String(templateUsage + 1));
      }
    } catch (error) {
      console.error('Template generation error:', error);
      setGenerateError('Failed to generate template. Please try again.');
    } finally {
      setGeneratingTemplate(false);
    }
  };

  // Purchase template for non-Pro users or Pro users who need extra
  const handlePurchaseTemplate = async () => {
    if (!userEmail) {
      alert('Please sign up first to purchase templates');
      return;
    }

    if (!grant) {
      alert('No grant selected for custom template');
      return;
    }

    setIsLoading(true);
    setPromoError('');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'custom-ai-generated',
          email: userEmail,
          grantId: grant?.normalizedId || null,
          grantTitle: grant?.normalizedTitle || null,
          grantAgency: grant?.normalizedAgency || null,
          grantAmount: grant?.normalizedAmount || null,
          grantDeadline: grant?.normalizedDeadline || null,
          grantSource: grant?.source || null,
          promoCode: promoCode.trim(),
          isCustom: true,
        }),
      });

      const data = await response.json();

      if (data.error === 'invalid_promo') {
        setPromoError('Invalid promo code');
        setIsLoading(false);
        return;
      }

      if (data.url) {
        // Store grant info for template generation after payment
        localStorage.setItem('pendingGrantForTemplate', JSON.stringify(grant));
        window.location.href = data.url;
      } else {
        alert('Error creating checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error creating checkout session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal container */}
      <div className="min-h-full flex items-center justify-center p-4">
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  Get Your Custom Template
                </h2>
                <p className="text-white/80">
                  {grant
                    ? `AI-powered template tailored for: ${grant.normalizedTitle?.slice(0, 60)}...`
                    : 'Professional templates to help you write winning grant applications'
                  }
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {showSamplePreview ? (
              /* Sample PDF Preview */
              <div>
                <button
                  onClick={() => setShowSamplePreview(false)}
                  className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
                >
                  <span>←</span> Back
                </button>

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Sample Template Preview
                  </h3>
                  <p className="text-gray-600 text-sm">
                    This is a sample of a previously generated template. Your custom template will be
                    tailored specifically for <strong>{grant?.normalizedTitle || 'your selected grant'}</strong>.
                  </p>
                </div>

                {/* PDF-style preview container */}
                <div className="bg-gray-100 rounded-lg p-4 mb-6">
                  <div className="bg-white shadow-lg rounded border max-h-[400px] overflow-y-auto">
                    {/* Fake document header */}
                    <div className="border-b p-6">
                      <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                          Grant Application Template
                        </h1>
                        <p className="text-lg text-blue-600 font-medium">
                          {grant?.normalizedTitle || 'Your Grant Title Here'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Generated by Kayden & Co AI Template Engine
                        </p>
                      </div>
                    </div>

                    {/* Sample sections - blurred/preview style */}
                    <div className="p-6 space-y-6">
                      {/* Section 1 */}
                      <div>
                        <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">
                          1. Executive Summary
                        </h2>
                        <div className="space-y-2">
                          <p className="text-gray-600 text-sm">
                            <strong>Purpose:</strong> Provide a compelling overview of your project...
                          </p>
                          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 text-sm">
                            <p className="text-blue-800 italic">
                              Writing Prompt: Describe your organization's mission and how this grant
                              aligns with your goals in 2-3 paragraphs...
                            </p>
                          </div>
                          <div className="h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                            [Your content here]
                          </div>
                        </div>
                      </div>

                      {/* Section 2 */}
                      <div>
                        <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">
                          2. Statement of Need
                        </h2>
                        <div className="space-y-2">
                          <p className="text-gray-600 text-sm">
                            <strong>Purpose:</strong> Document the problem your project addresses...
                          </p>
                          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 text-sm">
                            <p className="text-yellow-800">
                              💡 Tip: Include relevant statistics and cite credible sources...
                            </p>
                          </div>
                          <div className="h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                            [Your content here]
                          </div>
                        </div>
                      </div>

                      {/* Section 3 - Partially visible */}
                      <div>
                        <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">
                          3. Project Goals & Objectives
                        </h2>
                        <div className="relative">
                          <div className="space-y-2 blur-sm">
                            <p className="text-gray-600 text-sm">
                              <strong>Purpose:</strong> Outline specific, measurable goals...
                            </p>
                            <div className="h-16 bg-gray-100 rounded"></div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                              + 8 More Sections in Full Template
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase section */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">
                        Ready to get your custom template?
                      </h4>
                      <p className="text-sm text-gray-600">
                        Tailored specifically for {grant?.normalizedAgency || 'your grant agency'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {canUseProTemplate ? (
                        <>
                          <div className="text-lg font-bold text-emerald-600">
                            Included with Pro
                          </div>
                          <button
                            onClick={handleGenerateProTemplate}
                            disabled={generatingTemplate}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold"
                          >
                            {generatingTemplate ? 'Generating...' : 'Generate Now'}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-green-600">
                            ${(PAY_PER_TEMPLATE_PRICE / 100).toFixed(2)}
                          </div>
                          <button
                            onClick={handlePurchaseTemplate}
                            disabled={isLoading}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold"
                          >
                            {isLoading ? 'Processing...' : 'Buy Now'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Main AI Template Offering */
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full mb-6">
                  <span className="text-4xl">✨</span>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  AI-Powered Custom Template
                </h3>
                <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                  Our AI will analyze this specific grant and create a tailored proposal template
                  with sections, prompts, and guidance designed specifically for{' '}
                  <strong>{grant?.normalizedAgency || 'this agency'}</strong>.
                </p>

                {/* Grant Info Card */}
                {grant && (
                  <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left max-w-lg mx-auto">
                    <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {grant.normalizedTitle}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Agency:</span>
                        <p className="font-medium">{grant.normalizedAgency || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Award:</span>
                        <p className="font-medium">{grant.normalizedAmount || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Deadline:</span>
                        <p className="font-medium">{grant.normalizedDeadline || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Source:</span>
                        <p className="font-medium capitalize">{grant.source}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* What's Included */}
                <div className="bg-blue-50 rounded-xl p-6 mb-6 text-left max-w-lg mx-auto">
                  <h4 className="font-semibold text-gray-900 mb-3">What You'll Get:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Custom sections tailored to this grant's requirements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Agency-specific writing prompts and guidance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Recommended timeline with milestones</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Budget guidance specific to this grant type</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Document checklist based on likely requirements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Downloadable Word document (.docx)</span>
                    </li>
                  </ul>
                </div>

                {/* Price and Actions */}
                <div className="flex flex-col items-center gap-4 max-w-lg mx-auto">
                  {/* Show different pricing based on subscription */}
                  {canUseProTemplate ? (
                    /* Pro user with templates remaining */
                    <>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 w-full text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="text-emerald-600 font-bold text-xl">Included with Pro</span>
                          <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            {templatesRemaining} of {PRO_TEMPLATE_LIMIT} remaining
                          </span>
                        </div>
                        <p className="text-sm text-emerald-700">Generate your custom template now</p>
                      </div>

                      {generateError && (
                        <p className="text-red-500 text-sm">{generateError}</p>
                      )}

                      {generatedTemplate ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 w-full text-center">
                          <div className="text-4xl mb-3">🎉</div>
                          <h4 className="font-bold text-gray-900 mb-2">Template Ready!</h4>
                          <a
                            href={generatedTemplate.downloadUrl}
                            download
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Template (.docx)
                          </a>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                          <button
                            onClick={() => setShowSamplePreview(true)}
                            className="flex-1 border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Preview
                          </button>
                          <button
                            onClick={handleGenerateProTemplate}
                            disabled={generatingTemplate}
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                          >
                            {generatingTemplate ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <span>✨</span>
                                Generate Now
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  ) : isPro && templatesRemaining <= 0 ? (
                    /* Pro user who has used all templates */
                    <>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 w-full text-center">
                        <p className="text-amber-800 font-medium mb-1">You've used all {PRO_TEMPLATE_LIMIT} templates this month</p>
                        <p className="text-sm text-amber-700">Purchase additional templates at $49 each</p>
                      </div>
                      <div className="text-3xl font-bold text-green-600">
                        ${(PAY_PER_TEMPLATE_PRICE / 100).toFixed(2)}
                      </div>

                      {/* Promo Code */}
                      <div className="w-full max-w-xs">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value);
                            setPromoError('');
                          }}
                          placeholder="Promo code (optional)"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {promoError && (
                          <p className="text-red-500 text-xs mt-1">{promoError}</p>
                        )}
                      </div>

                      <button
                        onClick={handlePurchaseTemplate}
                        disabled={isLoading}
                        className="w-full max-w-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <span>✨</span>
                            Buy Template - $49
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    /* Free user - show pay-per-template pricing */
                    <>
                      <div className="text-3xl font-bold text-green-600">
                        ${(PAY_PER_TEMPLATE_PRICE / 100).toFixed(2)}
                      </div>

                      {/* Promo Code */}
                      <div className="w-full max-w-xs">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value);
                            setPromoError('');
                          }}
                          placeholder="Promo code (optional)"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {promoError && (
                          <p className="text-red-500 text-xs mt-1">{promoError}</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                        <button
                          onClick={() => setShowSamplePreview(true)}
                          className="flex-1 border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview
                        </button>
                        <button
                          onClick={handlePurchaseTemplate}
                          disabled={isLoading}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                        >
                          {isLoading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <span>✨</span>
                              Buy Now
                            </>
                          )}
                        </button>
                      </div>

                      {/* Pro upsell */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full max-w-xs text-center">
                        <p className="text-sm text-blue-800">
                          <strong>Pro members</strong> get 5 templates/month included.{' '}
                          <button className="underline text-blue-600 hover:text-blue-700">
                            Learn more
                          </button>
                        </p>
                      </div>
                    </>
                  )}

                  <p className="text-xs text-gray-500">
                    Powered by Claude AI • Instant download
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <p className="text-center text-sm text-gray-500">
              Custom templates are generated using AI and tailored to your specific grant.
              Delivered as an editable Word document (.docx).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
