/**
 * Agency Profile API Route
 * CRUD operations for agency profiles and grant matching preferences
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Organization type options
export const ORGANIZATION_TYPES = [
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

// Focus area options
export const FOCUS_AREAS = [
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

// Grant size options
export const GRANT_SIZE_RANGES = [
  { value: 'micro', label: 'Under $10,000', min: 0, max: 10000 },
  { value: 'small', label: '$10,000 - $50,000', min: 10000, max: 50000 },
  { value: 'medium', label: '$50,000 - $250,000', min: 50000, max: 250000 },
  { value: 'large', label: '$250,000 - $1,000,000', min: 250000, max: 1000000 },
  { value: 'major', label: 'Over $1,000,000', min: 1000000, max: null },
];

// Data source options
export const DATA_SOURCES = [
  { value: 'grants_gov', label: 'Grants.gov' },
  { value: 'sam_gov', label: 'SAM.gov' },
  { value: 'nih', label: 'NIH' },
  { value: 'nsf', label: 'NSF' },
  { value: 'fema', label: 'FEMA' },
  { value: 'usaspending', label: 'USASpending' },
  { value: 'federal_reporter', label: 'Federal RePORTER' },
  { value: 'propublica', label: 'ProPublica Nonprofits' },
  { value: 'regulations', label: 'Regulations.gov' },
  { value: 'california', label: 'California Grants' },
];

// US States for dropdown
export const US_STATES = [
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

// GET - Fetch profile by email
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return Response.json({ error: 'Email required' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (!supabase) {
    // Dev mode - return mock data
    return Response.json({
      exists: false,
      profile: null,
      message: 'Supabase not configured'
    });
  }

  try {
    const { data: profile, error } = await supabase
      .from('agency_profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error || !profile) {
      return Response.json({
        exists: false,
        profile: null
      });
    }

    return Response.json({
      exists: true,
      profile: {
        id: profile.id,
        organizationName: profile.organization_name,
        organizationType: profile.organization_type,
        ein: profile.ein,
        state: profile.state,
        city: profile.city,
        zipCode: profile.zip_code,
        focusAreas: profile.focus_areas || [],
        keywords: profile.keywords || [],
        minGrantAmount: profile.min_grant_amount,
        maxGrantAmount: profile.max_grant_amount,
        preferredSources: profile.preferred_sources || [],
        notificationFrequency: profile.notification_frequency,
        emailNotifications: profile.email_notifications,
        subscriptionTier: profile.subscription_tier,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return Response.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// POST - Create or update profile
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      email,
      organizationName,
      organizationType,
      ein,
      state,
      city,
      zipCode,
      focusAreas,
      keywords,
      minGrantAmount,
      maxGrantAmount,
      preferredSources,
      notificationFrequency,
      emailNotifications,
    } = body;

    // Validate required fields
    if (!email || !organizationName || !organizationType) {
      return Response.json(
        { error: 'Email, organization name, and type are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!supabase) {
      console.log('Profile data (Supabase not configured):', body);
      return Response.json({
        success: true,
        message: 'Profile saved (Supabase not configured)',
        profile: {
          email: normalizedEmail,
          organizationName,
          organizationType,
          focusAreas: focusAreas || [],
          keywords: keywords || [],
          notificationFrequency: notificationFrequency || 'weekly',
        }
      });
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('agency_profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    const profileData = {
      email: normalizedEmail,
      organization_name: organizationName.trim(),
      organization_type: organizationType,
      ein: ein?.trim() || null,
      state: state || null,
      city: city?.trim() || null,
      zip_code: zipCode?.trim() || null,
      focus_areas: focusAreas || [],
      keywords: keywords || [],
      min_grant_amount: minGrantAmount || 0,
      max_grant_amount: maxGrantAmount || null,
      preferred_sources: preferredSources || [],
      notification_frequency: notificationFrequency || 'weekly',
      email_notifications: emailNotifications !== false,
    };

    let result;
    if (existingProfile) {
      // Update existing profile
      result = await supabase
        .from('agency_profiles')
        .update(profileData)
        .eq('id', existingProfile.id)
        .select()
        .single();
    } else {
      // Create new profile
      result = await supabase
        .from('agency_profiles')
        .insert(profileData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Profile save error:', result.error);
      return Response.json(
        { error: 'Failed to save profile' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: existingProfile ? 'Profile updated' : 'Profile created',
      profile: {
        id: result.data.id,
        organizationName: result.data.organization_name,
        organizationType: result.data.organization_type,
        focusAreas: result.data.focus_areas,
        keywords: result.data.keywords,
        notificationFrequency: result.data.notification_frequency,
        emailNotifications: result.data.email_notifications,
      }
    });

  } catch (error) {
    console.error('Profile save error:', error);
    return Response.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}

// DELETE - Remove profile
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return Response.json({ error: 'Email required' }, { status: 400 });
  }

  if (!supabase) {
    return Response.json({ success: true, message: 'Profile deleted (mock)' });
  }

  try {
    const { error } = await supabase
      .from('agency_profiles')
      .delete()
      .eq('email', email.toLowerCase().trim());

    if (error) {
      throw error;
    }

    return Response.json({ success: true, message: 'Profile deleted' });
  } catch (error) {
    console.error('Profile delete error:', error);
    return Response.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}
