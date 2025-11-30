'use client';

import { useState } from 'react';

// Pricing configuration
const PRICING = {
  monthly: {
    amount: 29,
    period: '/month',
    name: 'Monthly',
    badge: null,
  },
  semiannual: {
    amount: 165.30,
    period: '/6 months',
    name: '6-Month',
    badge: 'Save 5%',
    perMonth: 27.55,
  },
  annual: {
    amount: 313.20,
    period: '/year',
    name: 'Annual',
    badge: 'Best Value',
    perMonth: 26.10,
  },
};

const PRO_FEATURES = [
  { text: 'Unlimited AI-powered searches', included: true },
  { text: '5 custom templates per month', included: true },
  { text: 'Save organization profile', included: true },
  { text: 'Email alerts for new grants', included: true },
  { text: 'Export search results to CSV', included: true },
  { text: 'Priority support', included: true },
];

const FREE_FEATURES = [
  { text: '3 AI searches total', included: true },
  { text: 'View grant results', included: true },
  { text: 'Save favorites', included: true },
  { text: 'Custom templates', included: false },
  { text: 'Email alerts', included: false },
  { text: 'Export results', included: false },
];

export default function PricingModal({ isOpen, onClose, userEmail = null, onSelectPlan }) {
  const [selectedPlan, setSelectedPlan] = useState('annual');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal container */}
      <div className="min-h-full flex items-center justify-center p-4">
        {/* Modal */}
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full border border-white/10 overflow-hidden">
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
              Upgrade to Pro
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Find More Grants, Win More Funding
            </h2>
            <p className="text-slate-400">
              Unlimited AI searches + custom application templates
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Plan Selection */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {Object.entries(PRICING).map(([key, plan]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    selectedPlan === key
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {plan.badge && (
                    <span className={`absolute -top-2 right-4 px-2 py-0.5 rounded-full text-xs font-medium ${
                      plan.badge === 'Best Value'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-slate-900'
                    }`}>
                      {plan.badge}
                    </span>
                  )}

                  <div className="text-slate-400 text-sm mb-1">{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">${plan.amount.toFixed(2)}</span>
                    <span className="text-slate-500 text-sm">{plan.period}</span>
                  </div>
                  {plan.perMonth && (
                    <div className="text-emerald-400 text-xs mt-1">
                      ${plan.perMonth}/month
                    </div>
                  )}

                  {selectedPlan === key && (
                    <div className="absolute top-3 left-3">
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
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Pro Features */}
              <div className="bg-blue-500/10 rounded-xl p-5 border border-blue-500/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-sm">✨</span>
                  Pro Plan
                </h3>
                <ul className="space-y-3">
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
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-slate-600 flex items-center justify-center text-sm">🆓</span>
                  Free Plan
                </h3>
                <ul className="space-y-3">
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

            {/* Error message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {/* CTA */}
            <div className="text-center">
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-blue-600/50 disabled:to-blue-500/50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mx-auto"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Upgrade to Pro - ${PRICING[selectedPlan].amount.toFixed(2)}{PRICING[selectedPlan].period}
                  </>
                )}
              </button>

              <p className="text-xs text-slate-500 mt-4">
                Cancel anytime. Secure payment via Stripe.
              </p>
            </div>
          </div>

          {/* Pay-per-template alternative */}
          <div className="px-6 py-4 bg-slate-800/50 border-t border-white/10">
            <p className="text-center text-sm text-slate-400">
              Just need one template?{' '}
              <button
                onClick={() => {
                  onClose();
                  if (onSelectPlan) onSelectPlan('pay-per-template');
                }}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Pay $49 per template
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
