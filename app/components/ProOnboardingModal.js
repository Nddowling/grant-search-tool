'use client';

import { useState } from 'react';

export default function ProOnboardingModal({ isOpen, onComplete, userEmail, userName }) {
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '',
    organizationDescription: '',
    location: '',
    focusAreas: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate required fields
    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }
    if (!formData.organizationType) {
      newErrors.organizationType = 'Please select an organization type';
    }
    if (!formData.organizationDescription.trim()) {
      newErrors.organizationDescription = 'Organization description is required';
    }
    if (formData.organizationDescription.trim().length < 50) {
      newErrors.organizationDescription = 'Please provide a more detailed description (at least 50 characters)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Save profile to localStorage
      const profile = {
        ...formData,
        email: userEmail,
        completedAt: new Date().toISOString(),
        isPro: true,
      };
      localStorage.setItem('grantSearchProfile', JSON.stringify(profile));

      // Update user data with profile completion flag
      const userData = JSON.parse(localStorage.getItem('grantSearchUser') || '{}');
      userData.hasCompletedOnboarding = true;
      userData.organizationDescription = formData.organizationDescription;
      localStorage.setItem('grantSearchUser', JSON.stringify(userData));

      // Call completion handler
      onComplete(profile);
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({ general: 'Failed to save profile. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop - no click to close since this is required */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal container */}
      <div className="min-h-full flex items-center justify-center p-4">
        {/* Modal */}
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-white/10 overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-white/10 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to Pro, {userName || 'there'}!
            </h2>
            <p className="text-slate-400">
              Let's set up your organization profile to personalize your grant search experience.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {errors.general && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm mb-4">
                {errors.general}
              </div>
            )}

            <div className="space-y-4">
              {/* Organization Name */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Organization Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => handleChange('organizationName', e.target.value)}
                  placeholder="e.g., Austin Youth STEM Initiative"
                  style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                  className={`w-full px-4 py-2.5 border rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.organizationName ? 'border-red-500' : 'border-slate-600'
                  }`}
                />
                {errors.organizationName && (
                  <p className="text-red-400 text-xs mt-1">{errors.organizationName}</p>
                )}
              </div>

              {/* Organization Type */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Organization Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.organizationType}
                  onChange={(e) => handleChange('organizationType', e.target.value)}
                  style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.organizationType ? 'border-red-500' : 'border-slate-600'
                  }`}
                >
                  <option value="">Select type...</option>
                  <option value="nonprofit">Nonprofit (501c3)</option>
                  <option value="nonprofit-other">Nonprofit (non-501c3)</option>
                  <option value="state-gov">State Government</option>
                  <option value="county-gov">County Government</option>
                  <option value="city-gov">City/Township Government</option>
                  <option value="tribal">Native American Tribal Government</option>
                  <option value="education-public">Public Educational Institution</option>
                  <option value="education-private">Private Educational Institution</option>
                  <option value="small-business">Small Business</option>
                  <option value="for-profit">For-Profit Organization</option>
                  <option value="individual">Individual Researcher</option>
                  <option value="other">Other</option>
                </select>
                {errors.organizationType && (
                  <p className="text-red-400 text-xs mt-1">{errors.organizationType}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Location <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="e.g., Austin, Texas"
                  style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                  className="w-full px-4 py-2.5 border border-slate-600 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Focus Areas */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Focus Areas <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.focusAreas}
                  onChange={(e) => handleChange('focusAreas', e.target.value)}
                  placeholder="e.g., STEM education, youth development, workforce training"
                  style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                  className="w-full px-4 py-2.5 border border-slate-600 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Organization Description - Required */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Organization Description <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  This will be used to automatically find relevant grants for you. Be as specific as possible.
                </p>
                <textarea
                  value={formData.organizationDescription}
                  onChange={(e) => handleChange('organizationDescription', e.target.value)}
                  placeholder="Example: We're a small nonprofit in rural Texas focused on providing after-school STEM education programs for underserved middle school students. We're looking for grants to expand our robotics curriculum and hire additional instructors..."
                  rows={5}
                  style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                  className={`w-full px-4 py-3 border rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    errors.organizationDescription ? 'border-red-500' : 'border-slate-600'
                  }`}
                />
                <div className="flex justify-between mt-1">
                  {errors.organizationDescription ? (
                    <p className="text-red-400 text-xs">{errors.organizationDescription}</p>
                  ) : (
                    <span className="text-xs text-slate-500">Minimum 50 characters</span>
                  )}
                  <span className={`text-xs ${formData.organizationDescription.length >= 50 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {formData.organizationDescription.length} characters
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-blue-600/50 disabled:to-blue-500/50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Start Finding Grants
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 mt-4">
              You can update this information anytime from your profile settings.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
