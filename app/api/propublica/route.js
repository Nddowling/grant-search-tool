/**
 * ProPublica Nonprofit Explorer API Route
 * Searches nonprofit 990 filings - 1.8M+ filings including foundation giving
 * API Docs: https://projects.propublica.org/nonprofits/api
 * No API key required
 */

const FETCH_TIMEOUT_MS = 30000;

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
  const state = searchParams.get('state') || '';
  const nteeCode = searchParams.get('ntee') || ''; // National Taxonomy code (1-10)
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 25; // ProPublica fixed page size

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', organizations: [] }, { status: 400 });
  }

  try {
    // Build query URL - ProPublica uses GET with query params
    // Page is 0-indexed in ProPublica API
    const params = new URLSearchParams({
      q: keyword
    });

    // Page is 0-indexed
    if (page > 1) {
      params.set('page', String(page - 1));
    }

    if (state) {
      params.set('state[id]', state);
    }

    if (nteeCode) {
      params.set('ntee[id]', nteeCode);
    }

    const apiUrl = `https://projects.propublica.org/nonprofits/api/v2/search.json?${params.toString()}`;

    console.log(`ProPublica search: keyword="${keyword}", page=${page}`);

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ProPublica API Error:', response.status, errorText.substring(0, 200));
      throw new Error(`ProPublica API error: ${response.status}`);
    }

    const data = await response.json();

    // Map response to normalized format
    const organizations = (data.organizations || []).map(org => ({
      ein: org.ein,
      strEin: org.strein, // Formatted EIN (XX-XXXXXXX)
      name: org.name,
      city: org.city,
      state: org.state,
      zipCode: org.zipcode,
      nteeCode: org.ntee_code,
      subsectionCode: org.subseccd, // 501(c) subsection
      classification: org.classification_codes,
      totalRevenue: org.income_amount,
      totalAssets: org.asset_amount,
      hasRecent990: org.have_filings,
      filingType: org.filing_type,
      score: org.score,
      link: org.ein
        ? `https://projects.propublica.org/nonprofits/organizations/${org.ein}`
        : null
    }));

    const total = data.total_results || organizations.length;
    const totalPages = data.num_pages || Math.ceil(total / pageSize);

    console.log(`ProPublica returned ${organizations.length} organizations (page ${page})`);

    return Response.json({
      organizations,
      total,
      page,
      pageSize,
      totalPages,
      source: 'propublica'
    });

  } catch (error) {
    console.error('ProPublica API Error:', error.name, error.message);

    let userMessage;
    if (error.name === 'AbortError') {
      userMessage = 'ProPublica search timed out - try a more specific search term';
    } else {
      userMessage = `ProPublica search temporarily unavailable: ${error.message}`;
    }

    return Response.json({
      error: userMessage,
      organizations: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
      source: 'propublica'
    });
  }
}

/**
 * Get detailed organization data including 990 filings
 * GET /api/propublica?ein=123456789
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const ein = body.ein;

    if (!ein) {
      return Response.json({ error: 'EIN is required' }, { status: 400 });
    }

    const apiUrl = `https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`;

    console.log(`ProPublica organization lookup: ein="${ein}"`);

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ProPublica API error: ${response.status}`);
    }

    const data = await response.json();

    // Map organization details with filings
    const organization = {
      ...data.organization,
      filings: (data.filings_with_data || []).map(filing => ({
        taxPeriod: filing.tax_prd,
        formType: filing.formtype === 0 ? '990' : filing.formtype === 1 ? '990-EZ' : '990-PF',
        totalRevenue: filing.totrevenue,
        totalExpenses: filing.totfuncexpns,
        totalAssets: filing.totassetsend,
        totalLiabilities: filing.totliabend,
        pdfUrl: filing.pdf_url
      }))
    };

    return Response.json({
      organization,
      source: 'propublica'
    });

  } catch (error) {
    console.error('ProPublica Organization Lookup Error:', error.message);
    return Response.json({
      error: `Failed to fetch organization: ${error.message}`,
      organization: null,
      source: 'propublica'
    });
  }
}
