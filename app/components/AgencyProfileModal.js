'use client';

import { useState, useEffect } from 'react';

// Options for dropdowns
const ORGANIZATION_TYPES = [
  { value: 'nonprofit', label: 'Nonprofit Organization (501c3)' },
  { value: 'small_business', label: 'Small Business' },
  { value: 'university', label: 'University / College' },
  { value: 'k12', label: 'K-12 School District' },
  { value: 'government', label: 'State/Local Government' },
  { value: 'tribal', label: 'Tribal Organization' },
  { value: 'hospital', label: 'Hospital / Healthcare' },
  { value: 'individual', label: 'Individual Researcher' },
  { value: 'other', label: 'Other' },
];

const FOCUS_AREAS = [
  { value: 'education', label: 'Education & Training' },
  { value: 'healthcare', label: 'Healthcare & Medical' },
  { value: 'environment', label: 'Environment & Climate' },
  { value: 'research', label: 'Scientific Research' },
  { value: 'technology', label: 'Technology & Innovation' },
  { value: 'arts', label: 'Arts & Culture' },
  { value: 'housing', label: 'Housing & Community Development' },
  { value: 'workforce', label: 'Workforce Development' },
  { value: 'agriculture', label: 'Agriculture & Food' },
  { value: 'disaster', label: 'Disaster Relief & Mitigation' },
  { value: 'justice', label: 'Justice & Public Safety' },
  { value: 'transportation', label: 'Transportation & Infrastructure' },
  { value: 'energy', label: 'Energy' },
  { value: 'social_services', label: 'Social Services' },
  { value: 'veterans', label: 'Veterans Services' },
];

const GRANT_SIZE_RANGES = [
  { value: 'any', label: 'Any Amount', min: 0, max: null },
  { value: 'micro', label: 'Under $10,000', min: 0, max: 10000 },
  { value: 'small', label: '$10,000 - $50,000', min: 10000, max: 50000 },
  { value: 'medium', label: '$50,000 - $250,000', min: 50000, max: 250000 },
  { value: 'large', label: '$250,000 - $1,000,000', min: 250000, max: 1000000 },
  { value: 'major', label: 'Over $1,000,000', min: 1000000, max: null },
];

const DATA_SOURCES = [
  { value: 'grants_gov', label: 'Grants.gov' },
  { value: 'sam_gov', label: 'SAM.gov' },
  { value: 'nih', label: 'NIH' },
  { value: 'nsf', label: 'NSF' },
  { value: 'fema', label: 'FEMA' },
  { value: 'usaspending', label: 'USASpending' },
  { value: 'federal_reporter', label: 'Federal RePORTER' },
  { value: 'propublica', label: 'ProPublica Nonprofits' },
  { value: 'california', label: 'California Grants' },
];

const US_STATES = [
  { value: '', label: 'Select State' },
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'Washington D.C.' },
];

export default function AgencyProfileModal({ isOpen, onClose, userEmail, existingProfile = null, onSave }) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '',
    ein: '',
    state: '',
    city: '',
    zipCode: '',
    focusAreas: [],
    keywords: [],
    grantSizeRange: 'any',
    preferredSources: [],
    notificationFrequency: 'weekly',
    emailNotifications: true,
  });

  const [keywordInput, setKeywordInput] = useState('');

  // Load existing profile
  useEffect(() => {
    if (isOpen && userEmail) {
      loadProfile();
    }
  }, [isOpen, userEmail]);

  const loadProfile = async () => {
    if (!userEmail) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/profile?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();

      if (data.exists && data.profile) {
        const p = data.profile;
        setFormData({
          organizationName: p.organizationName || '',
          organizationType: p.organizationType || '',
          ein: p.ein || '',
          state: p.state || '',
          city: p.city || '',
          zipCode: p.zipCode || '',
          focusAreas: p.focusAreas || [],
          keywords: p.keywords || [],
          grantSizeRange: getGrantSizeRange(p.minGrantAmount, p.maxGrantAmount),
          preferredSources: p.preferredSources || [],
          notificationFrequency: p.notificationFrequency || 'weekly',
          emailNotifications: p.emailNotifications !== false,
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getGrantSizeRange = (min, max) => {
    if (!min && !max) return 'any';
    const range = GRANT_SIZE_RANGES.find(r =>
      r.min === min && r.max === max
    );
    return range?.value || 'any';
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const toggleArrayItem = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const addKeyword = () => {
    const keyword = keywordInput.trim().toLowerCase();
    if (keyword && !formData.keywords.includes(keyword)) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keyword]
      }));
    }
    setKeywordInput('');
  };

  const removeKeyword = (keyword) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.organizationName.trim()) {
        setError('Organization name is required');
        return false;
      }
      if (!formData.organizationType) {
        setError('Organization type is required');
        return false;
      }
    }
    if (step === 2) {
      if (formData.focusAreas.length === 0) {
        setError('Please select at least one focus area');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
      setError('');
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    setError('');
  };

  const handleSave = async () => {
    if (!validateStep()) return;

    setIsSaving(true);
    setError('');

    try {
      const selectedRange = GRANT_SIZE_RANGES.find(r => r.value === formData.grantSizeRange);

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          organizationName: formData.organizationName,
          organizationType: formData.organizationType,
          ein: formData.ein,
          state: formData.state,
          city: formData.city,
          zipCode: formData.zipCode,
          focusAreas: formData.focusAreas,
          keywords: formData.keywords,
          minGrantAmount: selectedRange?.min || 0,
          maxGrantAmount: selectedRange?.max || null,
          preferredSources: formData.preferredSources,
          notificationFrequency: formData.notificationFrequency,
          emailNotifications: formData.emailNotifications,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (onSave) onSave(data.profile);
        onClose();
      } else {
        setError(data.error || 'Failed to save profile');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {existingProfile ? 'Edit Your Profile' : 'Create Grant Alert Profile'}
                </h2>
                <p className="text-white/80">
                  Get notified when grants match your organization's needs
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex gap-2 mt-6">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 rounded-full ${
                    s <= step ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-white/80">
              <span>Organization</span>
              <span>Interests</span>
              <span>Notifications</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your profile...</p>
              </div>
            ) : (
              <>
                {/* Step 1: Organization Info */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name *
                      </label>
                      <input
                        type="text"
                        value={formData.organizationName}
                        onChange={(e) => handleInputChange('organizationName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Your organization's legal name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Type *
                      </label>
                      <select
                        value={formData.organizationType}
                        onChange={(e) => handleInputChange('organizationType', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select type...</option>
                        {ORGANIZATION_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        EIN (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.ein}
                        onChange={(e) => handleInputChange('ein', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="XX-XXXXXXX"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <select
                          value={formData.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {US_STATES.map(state => (
                            <option key={state.value} value={state.value}>{state.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="City"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Focus Areas & Keywords */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Focus Areas * (Select all that apply)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {FOCUS_AREAS.map(area => (
                          <button
                            key={area.value}
                            type="button"
                            onClick={() => toggleArrayItem('focusAreas', area.value)}
                            className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                              formData.focusAreas.includes(area.value)
                                ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                            }`}
                          >
                            {area.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Keywords
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Add specific terms you want to match (e.g., "STEM", "mental health", "climate change")
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Add a keyword..."
                        />
                        <button
                          type="button"
                          onClick={addKeyword}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          Add
                        </button>
                      </div>
                      {formData.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {formData.keywords.map(keyword => (
                            <span
                              key={keyword}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                            >
                              {keyword}
                              <button
                                type="button"
                                onClick={() => removeKeyword(keyword)}
                                className="text-purple-500 hover:text-purple-700"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Grant Size
                      </label>
                      <select
                        value={formData.grantSizeRange}
                        onChange={(e) => handleInputChange('grantSizeRange', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {GRANT_SIZE_RANGES.map(range => (
                          <option key={range.value} value={range.value}>{range.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Preferred Sources (Optional)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {DATA_SOURCES.map(source => (
                          <button
                            key={source.value}
                            type="button"
                            onClick={() => toggleArrayItem('preferredSources', source.value)}
                            className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                              formData.preferredSources.includes(source.value)
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                            }`}
                          >
                            {source.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Leave empty to search all sources
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Notification Preferences */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Grant Alert Preferences
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            How often do you want to receive grant alerts?
                          </label>
                          <div className="space-y-2">
                            {[
                              { value: 'daily', label: 'Daily', desc: 'Get notified every day when new grants match' },
                              { value: 'weekly', label: 'Weekly', desc: 'Receive a weekly digest of matching grants' },
                              { value: 'monthly', label: 'Monthly', desc: 'Monthly summary of opportunities' },
                            ].map(option => (
                              <label
                                key={option.value}
                                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                  formData.notificationFrequency === option.value
                                    ? 'bg-white border-2 border-purple-500'
                                    : 'bg-white/50 border-2 border-transparent hover:bg-white'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="frequency"
                                  value={option.value}
                                  checked={formData.notificationFrequency === option.value}
                                  onChange={(e) => handleInputChange('notificationFrequency', e.target.value)}
                                  className="mt-1"
                                />
                                <div>
                                  <div className="font-medium text-gray-900">{option.label}</div>
                                  <div className="text-sm text-gray-500">{option.desc}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <label className="flex items-center gap-3 p-3 bg-white rounded-lg">
                          <input
                            type="checkbox"
                            checked={formData.emailNotifications}
                            onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                            className="w-5 h-5 rounded text-purple-600"
                          />
                          <div>
                            <div className="font-medium text-gray-900">Enable email notifications</div>
                            <div className="text-sm text-gray-500">
                              Receive grant alerts at {userEmail}
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Profile Summary
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">Organization:</span> {formData.organizationName}</p>
                        <p><span className="text-gray-500">Type:</span> {ORGANIZATION_TYPES.find(t => t.value === formData.organizationType)?.label}</p>
                        {formData.state && (
                          <p><span className="text-gray-500">Location:</span> {formData.city ? `${formData.city}, ` : ''}{formData.state}</p>
                        )}
                        <p><span className="text-gray-500">Focus Areas:</span> {formData.focusAreas.length} selected</p>
                        {formData.keywords.length > 0 && (
                          <p><span className="text-gray-500">Keywords:</span> {formData.keywords.join(', ')}</p>
                        )}
                        <p><span className="text-gray-500">Alerts:</span> {formData.notificationFrequency}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between">
            {step > 1 ? (
              <button
                onClick={prevStep}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-green-400 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    Save & Enable Alerts
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
