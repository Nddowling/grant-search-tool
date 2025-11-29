/**
 * Grant Matching API
 * Matches grants against agency profiles and stores results
 * Can be called by cron job or manually triggered
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Match score weights
const WEIGHTS = {
  focusArea: 30,      // Match on focus area
  keyword: 25,        // Match on keyword
  source: 15,         // Match on preferred source
  orgType: 20,        // Eligibility match on org type
  location: 10,       // State/geographic match
};

/**
 * Calculate match score between a grant and a profile
 */
function calculateMatchScore(grant, profile) {
  let score = 0;
  const reasons = [];

  const grantText = [
    grant.normalizedTitle || '',
    grant.normalizedDescription || '',
    grant.normalizedAgency || '',
    grant.category || '',
    grant.fundingCategory || '',
  ].join(' ').toLowerCase();

  // Check focus areas
  const focusAreas = profile.focus_areas || [];
  for (const area of focusAreas) {
    const areaKeywords = getFocusAreaKeywords(area);
    for (const keyword of areaKeywords) {
      if (grantText.includes(keyword.toLowerCase())) {
        score += WEIGHTS.focusArea;
        reasons.push(`Matches ${area} focus area`);
        break; // Only count each focus area once
      }
    }
  }

  // Check custom keywords
  const keywords = profile.keywords || [];
  for (const keyword of keywords) {
    if (grantText.includes(keyword.toLowerCase())) {
      score += WEIGHTS.keyword;
      reasons.push(`Contains keyword: ${keyword}`);
    }
  }

  // Check preferred source
  const preferredSources = profile.preferred_sources || [];
  if (preferredSources.length === 0 || preferredSources.includes(grant.source)) {
    if (preferredSources.length > 0) {
      score += WEIGHTS.source;
      reasons.push(`From preferred source: ${grant.source}`);
    }
  }

  // Check organization type eligibility
  const orgType = profile.organization_type;
  if (checkEligibility(grant, orgType)) {
    score += WEIGHTS.orgType;
    reasons.push('Eligible for your organization type');
  }

  // Check location match
  const state = profile.state;
  if (state && grantText.includes(state.toLowerCase())) {
    score += WEIGHTS.location;
    reasons.push(`Available in ${state}`);
  }

  // Check grant amount range
  const minAmount = profile.min_grant_amount || 0;
  const maxAmount = profile.max_grant_amount;
  const grantAmount = parseGrantAmount(grant.normalizedAmount);

  if (grantAmount) {
    if (grantAmount >= minAmount && (!maxAmount || grantAmount <= maxAmount)) {
      // Amount is in range, no penalty
    } else {
      // Amount outside range, reduce score
      score = Math.max(0, score - 20);
    }
  }

  // Normalize score to 0-100
  const normalizedScore = Math.min(100, Math.round(score));

  return {
    score: normalizedScore,
    reasons: [...new Set(reasons)], // Remove duplicates
  };
}

/**
 * Get keywords associated with focus areas
 */
function getFocusAreaKeywords(area) {
  const keywordMap = {
    education: ['education', 'school', 'student', 'teacher', 'learning', 'training', 'curriculum', 'stem', 'literacy'],
    healthcare: ['health', 'medical', 'hospital', 'clinical', 'patient', 'disease', 'mental health', 'public health'],
    environment: ['environment', 'climate', 'conservation', 'sustainability', 'green', 'renewable', 'pollution', 'ecosystem'],
    research: ['research', 'study', 'investigation', 'scientific', 'innovation', 'discovery', 'laboratory'],
    technology: ['technology', 'innovation', 'digital', 'software', 'cyber', 'ai', 'data', 'computing'],
    arts: ['arts', 'culture', 'museum', 'creative', 'humanities', 'music', 'theater', 'visual arts'],
    housing: ['housing', 'community development', 'affordable', 'homeless', 'shelter', 'urban development'],
    workforce: ['workforce', 'employment', 'job', 'career', 'apprentice', 'vocational', 'labor'],
    agriculture: ['agriculture', 'farm', 'food', 'rural', 'crop', 'livestock', 'nutrition'],
    disaster: ['disaster', 'emergency', 'fema', 'mitigation', 'resilience', 'hazard', 'recovery'],
    justice: ['justice', 'public safety', 'law enforcement', 'court', 'crime', 'corrections'],
    transportation: ['transportation', 'infrastructure', 'transit', 'highway', 'road', 'bridge'],
    energy: ['energy', 'power', 'electric', 'solar', 'wind', 'efficiency', 'grid'],
    social_services: ['social services', 'welfare', 'assistance', 'poverty', 'family', 'child', 'senior'],
    veterans: ['veteran', 'military', 'armed forces', 'service member', 'va '],
  };

  return keywordMap[area] || [area];
}

/**
 * Check if organization type is eligible for grant
 */
function checkEligibility(grant, orgType) {
  const eligibilityText = [
    grant.eligibility || '',
    grant.applicantTypes || '',
    grant.normalizedDescription || '',
  ].join(' ').toLowerCase();

  const eligibilityMap = {
    nonprofit: ['nonprofit', 'non-profit', '501(c)(3)', '501c3', 'charitable', 'organization'],
    small_business: ['small business', 'sbir', 'sttr', 'entrepreneur', 'commercial'],
    university: ['university', 'college', 'higher education', 'academic', 'institution of higher'],
    k12: ['school district', 'k-12', 'elementary', 'secondary', 'local education'],
    government: ['state', 'local', 'municipal', 'county', 'government', 'public agency'],
    tribal: ['tribal', 'native', 'indigenous', 'indian'],
    hospital: ['hospital', 'healthcare', 'health system', 'medical center'],
    individual: ['individual', 'researcher', 'investigator', 'principal investigator'],
  };

  const keywords = eligibilityMap[orgType] || [];

  // If no eligibility info, assume eligible
  if (!eligibilityText.trim()) return true;

  // Check if any eligibility keyword matches
  return keywords.some(keyword => eligibilityText.includes(keyword));
}

/**
 * Parse grant amount from string
 */
function parseGrantAmount(amountStr) {
  if (!amountStr) return null;

  // Remove $ and commas, extract number
  const cleaned = amountStr.replace(/[$,]/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);

  if (match) {
    const num = parseFloat(match[1]);
    // Handle "K" or "M" suffixes
    if (cleaned.toLowerCase().includes('k')) return num * 1000;
    if (cleaned.toLowerCase().includes('m')) return num * 1000000;
    return num;
  }

  return null;
}

// POST - Run matching for all profiles (called by cron)
export async function POST(request) {
  try {
    const body = await request.json();
    const { grants, profileId } = body;

    if (!grants || !Array.isArray(grants)) {
      return Response.json({ error: 'Grants array required' }, { status: 400 });
    }

    if (!supabase) {
      // Dev mode - just return match results without storing
      const mockProfile = {
        focus_areas: ['education', 'technology'],
        keywords: ['stem', 'innovation'],
        preferred_sources: [],
        organization_type: 'nonprofit',
        state: 'CA',
        min_grant_amount: 0,
        max_grant_amount: null,
      };

      const matches = grants.map(grant => {
        const { score, reasons } = calculateMatchScore(grant, mockProfile);
        return {
          grant,
          score,
          reasons,
        };
      }).filter(m => m.score >= 30) // Minimum 30% match
        .sort((a, b) => b.score - a.score);

      return Response.json({
        success: true,
        matchCount: matches.length,
        matches: matches.slice(0, 20), // Top 20 matches
        message: 'Supabase not configured - showing mock matches',
      });
    }

    // Fetch profiles to match against
    let profiles;
    if (profileId) {
      // Match for specific profile
      const { data, error } = await supabase
        .from('agency_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error || !data) {
        return Response.json({ error: 'Profile not found' }, { status: 404 });
      }
      profiles = [data];
    } else {
      // Match for all profiles with notifications enabled
      const { data, error } = await supabase
        .from('agency_profiles')
        .select('*')
        .eq('email_notifications', true)
        .neq('notification_frequency', 'none');

      if (error) {
        throw error;
      }
      profiles = data || [];
    }

    let totalMatches = 0;

    // Process each profile
    for (const profile of profiles) {
      const matches = [];

      for (const grant of grants) {
        const { score, reasons } = calculateMatchScore(grant, profile);

        // Only store matches above threshold
        if (score >= 30) {
          matches.push({
            profile_id: profile.id,
            grant_id: grant.normalizedId || grant.id || `${grant.source}-${Date.now()}`,
            grant_title: grant.normalizedTitle || 'Untitled Grant',
            grant_agency: grant.normalizedAgency,
            grant_amount: grant.normalizedAmount,
            grant_deadline: grant.normalizedDeadline,
            grant_source: grant.source,
            grant_link: grant.normalizedLink,
            grant_description: grant.normalizedDescription?.slice(0, 500),
            match_score: score,
            match_reasons: reasons,
            status: 'new',
          });
        }
      }

      // Upsert matches (update if exists, insert if new)
      if (matches.length > 0) {
        const { error } = await supabase
          .from('grant_matches')
          .upsert(matches, {
            onConflict: 'profile_id,grant_id,grant_source',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error('Error storing matches for profile:', profile.id, error);
        } else {
          totalMatches += matches.length;
        }
      }
    }

    return Response.json({
      success: true,
      profilesProcessed: profiles.length,
      totalMatches,
      message: `Matched ${grants.length} grants against ${profiles.length} profiles`,
    });

  } catch (error) {
    console.error('Grant matching error:', error);
    return Response.json(
      { error: 'Failed to run grant matching' },
      { status: 500 }
    );
  }
}

// GET - Fetch matches for a profile
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const status = searchParams.get('status'); // new, sent, viewed, all
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!email) {
    return Response.json({ error: 'Email required' }, { status: 400 });
  }

  if (!supabase) {
    return Response.json({
      matches: [],
      message: 'Supabase not configured',
    });
  }

  try {
    // First get the profile ID
    const { data: profile, error: profileError } = await supabase
      .from('agency_profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (profileError || !profile) {
      return Response.json({
        matches: [],
        message: 'No profile found',
      });
    }

    // Fetch matches
    let query = supabase
      .from('grant_matches')
      .select('*')
      .eq('profile_id', profile.id)
      .order('match_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: matches, error } = await query;

    if (error) {
      throw error;
    }

    return Response.json({
      matches: (matches || []).map(m => ({
        id: m.id,
        grantId: m.grant_id,
        grantTitle: m.grant_title,
        grantAgency: m.grant_agency,
        grantAmount: m.grant_amount,
        grantDeadline: m.grant_deadline,
        grantSource: m.grant_source,
        grantLink: m.grant_link,
        grantDescription: m.grant_description,
        matchScore: m.match_score,
        matchReasons: m.match_reasons,
        status: m.status,
        createdAt: m.created_at,
      })),
      total: matches?.length || 0,
    });

  } catch (error) {
    console.error('Fetch matches error:', error);
    return Response.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}
