'use client';

import { useState } from 'react';
import { TEMPLATE_LIBRARY, formatTemplatePrice, getTemplatesForGrant } from '../../lib/templates';

const CUSTOM_TEMPLATE_PRICE = 9949; // $99.49

export default function TemplateModal({ isOpen, onClose, grant = null, userEmail = null }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(grant ? 'custom' : 'all');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [generatingCustom, setGeneratingCustom] = useState(false);
  const [customTemplatePreview, setCustomTemplatePreview] = useState(null);

  // Filter templates based on grant source or show all
  const relevantTemplates = grant ? getTemplatesForGrant(grant) : [];
  const allTemplates = TEMPLATE_LIBRARY;

  const displayTemplates = activeTab === 'recommended' && relevantTemplates.length > 0
    ? relevantTemplates
    : allTemplates;

  const handlePurchase = async (template) => {
    if (!userEmail) {
      alert('Please sign up first to purchase templates');
      return;
    }

    setIsLoading(true);
    setPromoError('');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          email: userEmail,
          grantId: grant?.normalizedId || null,
          promoCode: promoCode.trim(),
        }),
      });

      const data = await response.json();

      if (data.error === 'invalid_promo') {
        setPromoError('Invalid promo code');
        setIsLoading(false);
        return;
      }

      if (data.url) {
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

  const handleGenerateCustomTemplate = async () => {
    if (!userEmail) {
      alert('Please sign up first to generate custom templates');
      return;
    }

    if (!grant) {
      alert('No grant selected for custom template');
      return;
    }

    setGeneratingCustom(true);

    try {
      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant: grant,
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCustomTemplatePreview(data.template);
      } else {
        alert(data.error || 'Failed to generate template. Please try again.');
      }
    } catch (error) {
      console.error('Template generation error:', error);
      alert('Error generating template. Please try again.');
    } finally {
      setGeneratingCustom(false);
    }
  };

  const handlePurchaseCustomTemplate = async () => {
    if (!userEmail) {
      alert('Please sign up first to purchase templates');
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
          promoCode: promoCode.trim(),
          isCustom: true,
          customTemplate: customTemplatePreview,
        }),
      });

      const data = await response.json();

      if (data.error === 'invalid_promo') {
        setPromoError('Invalid promo code');
        setIsLoading(false);
        return;
      }

      if (data.url) {
        // For custom templates, always store the data in localStorage before redirect
        // This ensures it's available on the success page (promo codes, Stripe, etc.)
        if (customTemplatePreview) {
          localStorage.setItem('pendingCustomTemplate', JSON.stringify(customTemplatePreview));
        }
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
                  {grant ? 'Get Your Custom Template' : 'Grant Application Templates'}
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

            {/* Tabs */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {grant && (
                <button
                  onClick={() => { setActiveTab('custom'); setCustomTemplatePreview(null); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'custom'
                      ? 'bg-white text-blue-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  ✨ AI Custom Template
                </button>
              )}
              {relevantTemplates.length > 0 && (
                <button
                  onClick={() => setActiveTab('recommended')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'recommended'
                      ? 'bg-white text-blue-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Recommended ({relevantTemplates.length})
                </button>
              )}
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-blue-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Standard Templates ({allTemplates.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Custom AI Template Tab */}
            {activeTab === 'custom' && grant && (
              <div>
                {!customTemplatePreview ? (
                  /* Generate Custom Template View */
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full mb-6">
                      <span className="text-4xl">✨</span>
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      AI-Powered Custom Template
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                      Our AI will analyze this specific grant and create a tailored proposal template
                      with sections, prompts, and guidance designed specifically for{' '}
                      <strong>{grant.normalizedAgency || 'this agency'}</strong>.
                    </p>

                    {/* Grant Info Card */}
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

                    <div className="flex flex-col items-center gap-4">
                      <div className="text-3xl font-bold text-green-600">
                        ${(CUSTOM_TEMPLATE_PRICE / 100).toFixed(2)}
                      </div>

                      <button
                        onClick={handleGenerateCustomTemplate}
                        disabled={generatingCustom}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-400 disabled:to-blue-400 text-white px-8 py-3 rounded-xl font-semibold text-lg flex items-center gap-2"
                      >
                        {generatingCustom ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Generating Preview...
                          </>
                        ) : (
                          <>
                            <span>✨</span>
                            Generate My Custom Template
                          </>
                        )}
                      </button>

                      {generatingCustom && (
                        <p className="text-sm text-gray-600 mt-2">
                          This generally takes about 30 seconds...
                        </p>
                      )}

                      <p className="text-xs text-gray-500">
                        Preview before you buy • Powered by Claude AI
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Custom Template Preview */
                  <div>
                    <button
                      onClick={() => setCustomTemplatePreview(null)}
                      className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
                    >
                      <span>←</span> Back
                    </button>

                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">✨</span>
                          <h3 className="text-2xl font-bold text-gray-900">
                            {customTemplatePreview.templateTitle}
                          </h3>
                        </div>
                        <p className="text-gray-600">{customTemplatePreview.grantSummary}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="text-3xl font-bold text-green-600">
                          ${(CUSTOM_TEMPLATE_PRICE / 100).toFixed(2)}
                        </div>
                        <div className="mt-2 mb-2">
                          <input
                            type="text"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            placeholder="Promo code"
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          {promoError && (
                            <p className="text-red-500 text-xs mt-1">{promoError}</p>
                          )}
                        </div>
                        <button
                          onClick={handlePurchaseCustomTemplate}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg font-medium"
                        >
                          {isLoading ? 'Processing...' : 'Buy Now'}
                        </button>
                      </div>
                    </div>

                    {/* Key Requirements */}
                    {customTemplatePreview.keyRequirements?.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Key Requirements Identified:</h4>
                        <div className="flex flex-wrap gap-2">
                          {customTemplatePreview.keyRequirements.map((req, idx) => (
                            <span key={idx} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sections Preview */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Custom Sections ({customTemplatePreview.sections?.length || 0})
                      </h4>
                      <div className="grid gap-3">
                        {customTemplatePreview.sections?.slice(0, 4).map((section, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <h5 className="font-medium text-gray-900">{section.title}</h5>
                              {section.estimatedLength && (
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                  {section.estimatedLength}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{section.guidance}</p>
                            {section.tips && (
                              <p className="text-xs text-blue-600 mt-2 italic">💡 {section.tips}</p>
                            )}
                          </div>
                        ))}
                        {customTemplatePreview.sections?.length > 4 && (
                          <p className="text-sm text-gray-500 text-center">
                            +{customTemplatePreview.sections.length - 4} more sections in full template
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Timeline Preview */}
                    {customTemplatePreview.timeline?.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Suggested Timeline</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="space-y-2">
                            {customTemplatePreview.timeline.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3 text-sm">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                                  Week {item.weeksBeforeDeadline}
                                </span>
                                <span className="text-gray-700">{item.milestone}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Agency Insights */}
                    {customTemplatePreview.agencyInsights && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Agency Insights</h4>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-gray-700">{customTemplatePreview.agencyInsights}</p>
                        </div>
                      </div>
                    )}

                    {/* Checklist Preview */}
                    {customTemplatePreview.checklist?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Required Documents Checklist</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <ul className="grid grid-cols-2 gap-2">
                            {customTemplatePreview.checklist.slice(0, 6).map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                <span className="text-green-500">✓</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Standard Template Detail View */}
            {activeTab !== 'custom' && selectedTemplate && (
              <div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
                >
                  <span>←</span> Back to templates
                </button>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h3>
                    <p className="text-gray-600 mt-1">{selectedTemplate.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600">
                      {formatTemplatePrice(selectedTemplate.price)}
                    </div>
                    <div className="mt-2 mb-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Promo code"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {promoError && (
                        <p className="text-red-500 text-xs mt-1">{promoError}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handlePurchase(selectedTemplate)}
                      disabled={isLoading}
                      className="mt-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      {isLoading ? 'Processing...' : 'Buy Now'}
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Template Sections</h4>
                  <div className="grid gap-3">
                    {selectedTemplate.sections.map((section, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900">{section.title}</h5>
                        <p className="text-sm text-gray-600 mt-1">{section.guidance}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {section.prompts.slice(0, 3).map((prompt, pidx) => (
                            <span
                              key={pidx}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                            >
                              {prompt.slice(0, 40)}...
                            </span>
                          ))}
                          {section.prompts.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{section.prompts.length - 3} more prompts
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Required Documents Checklist</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="grid grid-cols-2 gap-2">
                      {selectedTemplate.checklist.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-green-500">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Template Grid View */}
            {activeTab !== 'custom' && !selectedTemplate && (
              <div className="grid md:grid-cols-2 gap-4">
                {displayTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        {template.popular && (
                          <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        {formatTemplatePrice(template.price)}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {template.sections.length} sections • {template.checklist.length} checklist items
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchase(template);
                        }}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <p className="text-center text-sm text-gray-500">
              {activeTab === 'custom'
                ? 'Custom templates are generated using AI and tailored to your specific grant.'
                : 'Instant download after purchase. Templates delivered as editable Word documents.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
