'use client';

import { useState } from 'react';
import { TEMPLATE_LIBRARY, formatTemplatePrice, getTemplatesForGrant } from '../../lib/templates';

export default function TemplateModal({ isOpen, onClose, grant = null, userEmail = null }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');

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
        // Redirect to Stripe Checkout or success page (if promo)
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
                <h2 className="text-2xl font-bold mb-1">Grant Application Templates</h2>
                <p className="text-white/80">
                  Professional templates to help you write winning grant applications
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
            {relevantTemplates.length > 0 && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveTab('recommended')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'recommended'
                      ? 'bg-white text-blue-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Recommended for this Grant ({relevantTemplates.length})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'bg-white text-blue-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  All Templates ({allTemplates.length})
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {selectedTemplate ? (
              /* Template Detail View */
              <div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
                >
                  <span>&larr;</span> Back to templates
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
                    {/* Promo Code Input */}
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

                {/* Sections Preview */}
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

                {/* Checklist Preview */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Required Documents Checklist</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="grid grid-cols-2 gap-2">
                      {selectedTemplate.checklist.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-green-500">&#10003;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              /* Template Grid View */
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
                        {template.sections.length} sections &bull; {template.checklist.length} checklist items
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
              Instant download after purchase. Templates delivered as editable documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
