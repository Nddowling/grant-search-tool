'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

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
  const [showEmailForm, setShowEmailForm] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      // This will redirect to Google OAuth
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      console.error('Google sign in error:', error);
      setErrors({ general: 'Failed to sign in with Google. Please try again.' });
      setIsSubmitting(false);
    }
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
          {/* Brand */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <div>
              <span className="text-sm font-bold text-white">Kayden</span>
              <span className="text-sm font-bold text-amber-400"> & Co</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isLoginMode
                  ? 'Welcome Back'
                  : totalResults > 0 ? `${totalResults} Grants Found!` : 'Unlock Your Results'}
              </h2>
              <p className="text-sm text-slate-400">
                {isLoginMode ? 'Sign in to continue' : 'Create your free account'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {!showEmailForm && !isLoginMode ? (
            /* Primary Sign-In Options */
            <>
              <p className="text-white/80 mb-6">
                {totalResults > 0
                  ? `You've found ${totalResults} matching grants. Sign in to unlock award amounts, deadlines, and direct links.`
                  : 'Create your free account to search across 10 federal and state grant databases.'}
              </p>

              {/* Benefits */}
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-white mb-3">With your free account:</p>
                <ul className="space-y-2">
                  {[
                    'View full grant details & direct links',
                    '5 free AI searches per month',
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

              {errors.general && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm mb-4">
                  {errors.general}
                </div>
              )}

              {/* Google Sign-In Button - Primary */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full py-3 bg-white hover:bg-gray-100 disabled:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors flex items-center justify-center gap-3 mb-4"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-white/50">or</span>
                </div>
              </div>

              {/* Email Sign-Up Option */}
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Continue with Email
              </button>

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
          ) : isLoginMode ? (
            /* Login Form */
            <>
              <p className="text-white/80 mb-6">
                Sign in with your Google account or enter your email.
              </p>

              {/* Google Sign-In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full py-3 bg-white hover:bg-gray-100 disabled:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors flex items-center justify-center gap-3 mb-4"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-white/50">or use email</span>
                </div>
              </div>

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
                    style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                    className={`w-full px-4 py-2.5 border rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                    'Sign In with Email'
                  )}
                </button>
              </form>

              <p className="text-center mt-4">
                <button
                  onClick={() => { setIsLoginMode(false); setShowEmailForm(false); setErrors({}); setLoginEmail(''); }}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  New here? Create an account
                </button>
              </p>
            </>
          ) : (
            /* Email Signup Form */
            <>
              <button
                onClick={() => setShowEmailForm(false)}
                className="flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <p className="text-white/80 mb-6">
                Enter your details to create your account.
              </p>

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
                    style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                    className={`w-full px-4 py-2.5 border rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                    style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                    className={`w-full px-4 py-2.5 border rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                    style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                    className="w-full px-4 py-2.5 border border-white/20 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                    className="w-full px-4 py-2.5 border border-white/20 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    'Create Account'
                  )}
                </button>
              </form>

              {/* Already have account link */}
              <p className="text-center mt-4">
                <button
                  onClick={() => { setIsLoginMode(true); setShowEmailForm(false); setErrors({}); }}
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
