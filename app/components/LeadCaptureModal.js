'use client';

import { useState } from 'react';

export default function LeadCaptureModal({ isOpen, onSubmit, onLogin, totalResults = 0 }) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    company: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate required fields
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Call parent submit handler
      await onSubmit(formData);
    } catch (error) {
      setErrors({ general: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setErrors({ login: 'Email is required' });
      return;
    }
    if (!validateEmail(loginEmail)) {
      setErrors({ login: 'Please enter a valid email' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await onLogin(loginEmail.toLowerCase().trim());
      if (!result.success) {
        setErrors({ login: result.error || 'Email not found. Please sign up.' });
      }
    } catch (error) {
      setErrors({ login: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal container - centers the modal and allows scroll */}
      <div className="min-h-full flex items-center justify-center p-4">
        {/* Modal */}
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isLoginMode
                  ? 'Welcome Back'
                  : totalResults > 0 ? `${totalResults} Grants Found!` : 'Unlock Your Results'}
              </h2>
              <p className="text-sm text-white/60">
                {isLoginMode ? 'Sign in with your email' : 'Enter your email to see full details'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {isLoginMode ? (
            /* Login Form */
            <>
              <p className="text-white/80 mb-6">
                Enter the email you used to sign up and we'll restore your access.
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                {errors.login && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm">
                    {errors.login}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (errors.login) setErrors({});
                    }}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-2.5 bg-white/10 border rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.login ? 'border-red-500' : 'border-white/20'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <p className="text-center mt-4">
                <button
                  onClick={() => { setIsLoginMode(false); setErrors({}); setLoginEmail(''); }}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  New here? Create an account
                </button>
              </p>
            </>
          ) : (
            /* Signup Form */
            <>
              <p className="text-white/80 mb-6">
                {totalResults > 0
                  ? `You've found ${totalResults} matching grants. Enter your email to unlock award amounts, deadlines, and direct links.`
                  : 'Create your free account to search across 10 federal and state grant databases.'}
              </p>

              {/* Benefits */}
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-white mb-3">With your free account:</p>
                <ul className="space-y-2">
                  {[
                    'View full grant details & direct links',
                    'Unlimited searches across 10 databases',
                    'Save grants to your personal tracker',
                    'Get notified about new opportunities'
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {errors.general && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm">
                    {errors.general}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-2.5 bg-white/10 border rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-white/20'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="John"
                    className={`w-full px-4 py-2.5 bg-white/10 border rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.firstName ? 'border-red-500' : 'border-white/20'
                    }`}
                  />
                  {errors.firstName && (
                    <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>
                  )}
                </div>

                {/* Last Name (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Last Name <span className="text-white/40 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Company (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Company / Agency <span className="text-white/40 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    placeholder="Your organization"
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Continue for Free'
                  )}
                </button>
              </form>

              {/* Already have account link */}
              <p className="text-center mt-4">
                <button
                  onClick={() => { setIsLoginMode(true); setErrors({}); }}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Already signed up? Sign in
                </button>
              </p>

              {/* Privacy note */}
              <p className="text-xs text-white/40 text-center mt-4">
                By continuing, you agree to our Terms of Service and Privacy Policy.
                We'll never spam you or sell your data.
              </p>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
