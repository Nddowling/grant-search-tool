'use client';

import { useState } from 'react';

// New pricing configuration - templates are separate
const PRICING = {
  monthly: {
    amount: 24,
    period: '/month',
    name: 'Pro Monthly',
    badge: 'Most Popular',
  },
  annual: {
    amount: 199,
    period: '/year',
    name: 'Pro Annual',
    badge: 'Save $89',
    perMonth: 16.58,
  },
};

const TEMPLATE_PRICING = {
  single: {
    amount: 49,
    name: 'Single Template',
    description: 'One AI-generated template',
  },
  threePack: {
    amount: 119,
    name: '3-Pack',
    description: 'Three AI-generated templates',
    savings: 28,
  },
};


export default function PricingModal({ isOpen, onClose, userEmail = null, onSelectPlan }) {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');

  const handleSubscribe = async () => {
    if (!userEmail) {
      setError('Please sign up first to subscribe');
      return;
    }

    setIsLoading(true);
    setError('');
    setPromoError('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          email: userEmail,
          promoCode: promoCode.trim(),
        }),
      });

      const data = await response.json();

      if (data.error === 'invalid_promo') {
        setPromoError('Invalid promo code');
        setIsLoading(false);
        return;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError('Failed to start checkout. Please try again.');
      console.error('Subscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyTemplate = async (pack) => {
    if (!userEmail) {
      setError('Please sign up first to purchase templates');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: pack === 'threePack' ? 'template-3pack' : 'template-single',
          email: userEmail,
          isCustom: false,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError('Failed to start checkout. Please try again.');
      console.error('Template purchase error:', err);
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
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-white/10 text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl"
            >
              &times;
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Choose Your Plan
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Find More Grants, Win More Funding
            </h2>
            <p className="text-slate-400">
              Unlimited searches with Pro, or buy templates as needed
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Pro Subscription Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-sm">⚡</span>
                Pro Subscription
              </h3>

              {/* Pro vs Free Comparison Table */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 mb-6 overflow-hidden">
                <div className="grid grid-cols-3 text-center text-sm font-medium border-b border-slate-700">
                  <div className="p-3 text-slate-400">Feature</div>
                  <div className="p-3 text-slate-400 border-l border-slate-700">Free</div>
                  <div className="p-3 text-blue-400 border-l border-slate-700 bg-blue-500/10">Pro</div>
                </div>
                <div className="divide-y divide-slate-700/50">
                  <div className="grid grid-cols-3 text-sm">
                    <div className="p-3 text-slate-300">AI Searches</div>
                    <div className="p-3 text-center border-l border-slate-700 text-slate-400">5/month</div>
                    <div className="p-3 text-center border-l border-slate-700 bg-blue-500/5 text-emerald-400 font-medium">Unlimited</div>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <div className="p-3 text-slate-300">Email Alerts</div>
                    <div className="p-3 text-center border-l border-slate-700 text-slate-500">-</div>
                    <div className="p-3 text-center border-l border-slate-700 bg-blue-500/5 text-emerald-400">Yes</div>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <div className="p-3 text-slate-300">CSV Export</div>
                    <div className="p-3 text-center border-l border-slate-700 text-slate-500">-</div>
                    <div className="p-3 text-center border-l border-slate-700 bg-blue-500/5 text-emerald-400">Yes</div>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <div className="p-3 text-slate-300">Saved Profile</div>
                    <div className="p-3 text-center border-l border-slate-700 text-slate-500">-</div>
                    <div className="p-3 text-center border-l border-slate-700 bg-blue-500/5 text-emerald-400">Yes</div>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <div className="p-3 text-slate-300">Priority Support</div>
                    <div className="p-3 text-center border-l border-slate-700 text-slate-500">-</div>
                    <div className="p-3 text-center border-l border-slate-700 bg-blue-500/5 text-emerald-400">Yes</div>
                  </div>
                </div>
              </div>

              {/* Plan Selection - 2 columns */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Monthly Plan */}
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                    selectedPlan === 'monthly'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white">
                    Most Popular
                  </span>

                  {selectedPlan === 'monthly' && (
                    <div className="absolute top-4 left-4">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}

                  <div className="text-slate-400 text-sm mb-1">Pro Monthly</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">$24</span>
                    <span className="text-slate-500 text-sm">/month</span>
                  </div>
                  <div className="text-slate-500 text-xs mt-2">Billed monthly</div>
                </button>

                {/* Annual Plan */}
                <button
                  onClick={() => setSelectedPlan('annual')}
                  className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                    selectedPlan === 'annual'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500 text-white">
                    Save $89
                  </span>

                  {selectedPlan === 'annual' && (
                    <div className="absolute top-4 left-4">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}

                  <div className="text-slate-400 text-sm mb-1">Pro Annual</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">$199</span>
                    <span className="text-slate-500 text-sm">/year</span>
                  </div>
                  <div className="text-emerald-400 text-sm mt-1">Just $16.58/month</div>
                </button>
              </div>

              {/* Promo Code Input */}
              <div className="mb-4">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                  placeholder="Promo code (optional)"
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {promoError && <p className="text-red-400 text-xs mt-1">{promoError}</p>}
              </div>

              {/* Subscribe CTA */}
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-blue-600/50 disabled:to-blue-500/50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Subscribe to Pro - ${PRICING[selectedPlan].amount}{PRICING[selectedPlan].period}
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-800 px-4 text-sm text-slate-500">or buy templates separately</span>
              </div>
            </div>

            {/* Templates Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center text-sm">📄</span>
                Application Templates
                <span className="text-xs font-normal text-slate-400 ml-2">Available to all users</span>
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Single Template */}
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <div className="text-slate-400 text-sm mb-1">{TEMPLATE_PRICING.single.name}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold text-white">${TEMPLATE_PRICING.single.amount}</span>
                  </div>
                  <p className="text-slate-500 text-sm mb-4">{TEMPLATE_PRICING.single.description}</p>
                  <button
                    onClick={() => handleBuyTemplate('single')}
                    disabled={isLoading}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all text-sm"
                  >
                    Buy Single Template
                  </button>
                </div>

                {/* 3-Pack */}
                <div className="bg-purple-500/10 rounded-xl p-5 border border-purple-500/30 relative">
                  <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500 text-white">
                    Save ${TEMPLATE_PRICING.threePack.savings}
                  </span>
                  <div className="text-purple-300 text-sm mb-1">{TEMPLATE_PRICING.threePack.name}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold text-white">${TEMPLATE_PRICING.threePack.amount}</span>
                    <span className="text-slate-500 text-sm line-through">${TEMPLATE_PRICING.single.amount * 3}</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">{TEMPLATE_PRICING.threePack.description}</p>
                  <button
                    onClick={() => handleBuyTemplate('threePack')}
                    disabled={isLoading}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-all text-sm"
                  >
                    Buy 3-Pack
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-slate-500 mt-4">
                Templates are one-time purchases. No subscription required.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm mt-4">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-800/50 border-t border-white/10">
            <p className="text-center text-xs text-slate-500">
              Secure payment via Stripe. Cancel subscriptions anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
