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

const PRO_FEATURES = [
  { text: 'Unlimited AI-powered searches', included: true },
  { text: 'Save organization profile', included: true },
  { text: 'Email alerts for new grants', included: true },
  { text: 'Export search results to CSV', included: true },
  { text: 'Priority support', included: true },
];

const FREE_FEATURES = [
  { text: '5 AI searches per month', included: true },
  { text: 'View grant results', included: true },
  { text: 'Save favorites', included: true },
  { text: 'Email alerts', included: false },
  { text: 'CSV export', included: false },
  { text: 'Saved profile', included: false },
];

export default function PricingModal({ isOpen, onClose, userEmail = null, onSelectPlan }) {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    if (!userEmail) {
      setError('Please sign up first to subscribe');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          email: userEmail,
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

              {/* Plan Selection - 2 columns */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {Object.entries(PRICING).map(([key, plan]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                      selectedPlan === key
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {plan.badge && (
                      <span className={`absolute -top-2 right-4 px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.badge === 'Most Popular'
                          ? 'bg-blue-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}>
                        {plan.badge}
                      </span>
                    )}

                    <div className="text-slate-400 text-sm mb-1">{plan.name}</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">${plan.amount}</span>
                      <span className="text-slate-500 text-sm">{plan.period}</span>
                    </div>
                    {plan.perMonth && (
                      <div className="text-emerald-400 text-sm mt-1">
                        Just ${plan.perMonth}/month
                      </div>
                    )}

                    {selectedPlan === key && (
                      <div className="absolute top-4 left-4">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Feature Comparison */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Pro Features */}
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                  <h4 className="text-sm font-semibold text-blue-300 mb-3">Pro includes:</h4>
                  <ul className="space-y-2">
                    {PRO_FEATURES.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-300">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Free Features */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-400 mb-3">Free plan:</h4>
                  <ul className="space-y-2">
                    {FREE_FEATURES.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={feature.included ? 'text-slate-300' : 'text-slate-500'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
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
