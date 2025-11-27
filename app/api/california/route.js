/**
 * California Grants Portal API Route
 * Searches California state grants via data.ca.gov Socrata API
 * Data Source: https://data.ca.gov/dataset/california-grants-portal
 * No API key required (but app token recommended for higher rate limits)
 */

const FETCH_TIMEOUT_MS = 30000;

// California Grants Portal dataset ID on data.ca.gov
const DATASET_ID = '111c8c88-21f6-453c-ae2c-b4785a0624f5';
const BASE_URL = `https://data.ca.gov/api/3/action/datastore_search`;

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const agency = searchParams.get('agency') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 50;

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', grants: [] }, { status: 400 });
  }

  try {
    const offset = (page - 1) * pageSize;

    // Build query - CKAN datastore uses SQL-like queries
    const params = new URLSearchParams({
      resource_id: DATASET_ID,
      q: keyword, // Full-text search
      limit: String(pageSize),
      offset: String(offset)
    });

    // Add filters if provided
    const filters = {};
    if (category) {
      filters.category = category;
    }
    if (agency) {
      filters.grantmaker_name = agency;
    }
    if (Object.keys(filters).length > 0) {
      params.set('filters', JSON.stringify(filters));
    }

    const apiUrl = `${BASE_URL}?${params.toString()}`;

    console.log(`California Grants search: keyword="${keyword}", page=${page}`);

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('California Grants API Error:', response.status, errorText.substring(0, 200));
      throw new Error(`California Grants API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'API returned unsuccessful response');
    }

    // Map response to normalized format
    const rawGrants = data.result?.records || [];
    const grants = rawGrants.map(grant => ({
      id: grant._id || grant.opportunity_id,
      title: grant.title || grant.opportunity_title,
      description: grant.description,
      grantmakerName: grant.grantmaker_name,
      grantmakerType: grant.grantmaker_type,
      category: grant.category,
      eligibility: grant.applicant_type || grant.eligible_applicants,
      fundingSource: grant.funding_source,
      matchRequired: grant.match_required,
      estimatedAvailable: grant.estimated_available_funds,
      estimatedAwards: grant.estimated_number_of_awards,
      minAward: grant.expected_award_floor,
      maxAward: grant.expected_award_ceiling,
      openDate: grant.open_date || grant.application_open_date,
      closeDate: grant.close_date || grant.application_deadline,
      fundingMethod: grant.funding_method,
      geographicScope: grant.geographic_scope,
      applicationUrl: grant.application_url,
      contactEmail: grant.contact_email,
      contactPhone: grant.contact_phone,
      isForecasted: grant.is_forecasted === 'Yes' || grant.is_forecasted === true,
      lastUpdated: grant.last_updated,
      link: grant.application_url || grant.opportunity_url ||
        (grant._id ? `https://www.grants.ca.gov/grants/${grant._id}/` : null)
    }));

    const total = data.result?.total || grants.length;

    console.log(`California Grants returned ${grants.length} grants (page ${page})`);

    return Response.json({
      grants,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      source: 'california'
    });

  } catch (error) {
    console.error('California Grants API Error:', error.name, error.message);

    let userMessage;
    if (error.name === 'AbortError') {
      userMessage = 'California Grants search timed out - try a more specific search term';
    } else {
      userMessage = `California Grants search temporarily unavailable: ${error.message}`;
    }

    return Response.json({
      error: userMessage,
      grants: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
      source: 'california'
    });
  }
}
