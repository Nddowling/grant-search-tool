// Configuration for timeout and retry
const FETCH_TIMEOUT_MS = 25000; // 25 seconds timeout (SAM.gov can be slow)
const MAX_RETRIES = 2; // Number of retry attempts
const RETRY_DELAYS = [2000, 4000]; // Exponential backoff delays in ms

/**
 * Fetch with timeout using AbortController
 */
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

/**
 * Fetch with retry logic for transient failures
 */
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      // If we get a 504 Gateway Timeout, treat it as retryable
      if (response.status === 504 && attempt < retries) {
        console.log(`SAM.gov returned 504, retrying (attempt ${attempt + 1}/${retries})...`);
        await sleep(RETRY_DELAYS[attempt] || 4000);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      // Check if it's an abort/timeout error or network error
      const isRetryable = error.name === 'AbortError' ||
                          error.message?.includes('fetch') ||
                          error.message?.includes('network');

      if (isRetryable && attempt < retries) {
        console.log(`SAM.gov request failed (${error.name}), retrying (attempt ${attempt + 1}/${retries})...`);
        await sleep(RETRY_DELAYS[attempt] || 4000);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const agency = searchParams.get('agency') || '';
  const opportunityType = searchParams.get('type') || ''; // Filter: 'g' for grants, 'o' for contracts, etc.
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 50;

  const apiKey = process.env.SAM_GOV_API_KEY;

  if (!apiKey) {
    // Return 200 with empty results and a message instead of 500
    // This allows the frontend to handle it gracefully
    return Response.json({
      error: 'SAM.gov API key not configured. Contact administrator to enable SAM.gov search.',
      opportunities: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
      source: 'sam.gov'
    });
  }

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', opportunities: [] }, { status: 400 });
  }

  try {
    // SAM.gov API requires date range to be within 1 year (365 days max)
    // Using a smaller range (90 days) for faster response times
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 90); // 3 months in the past
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 90); // 3 months in the future (total: ~180 days)

    const formatDate = (date) => {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };

    const baseUrl = 'https://api.sam.gov/opportunities/v2/search';
    const params = new URLSearchParams({
      api_key: apiKey,
      q: keyword,
      postedFrom: formatDate(startDate),
      postedTo: formatDate(endDate),
      limit: String(pageSize),
      offset: String((page - 1) * pageSize)
    });

    if (agency) {
      params.append('organizationId', agency);
    }

    // Filter by opportunity type (ptype parameter)
    // g = Grant, o = Solicitation (contract), p = Presolicitation, k = Combined Synopsis/Solicitation
    // r = Sources Sought, s = Special Notice, i = Intent to Bundle, a = Award Notice
    if (opportunityType) {
      params.append('ptype', opportunityType);
    }

    console.log(`SAM.gov search: keyword="${keyword}", dateRange=${formatDate(startDate)}-${formatDate(endDate)}`);

    const response = await fetchWithRetry(`${baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SAM.gov API Error Response:', response.status, errorText.substring(0, 200));

      // Provide more specific error messages
      if (response.status === 504) {
        throw new Error('SAM.gov server timeout - please try a more specific search term');
      } else if (response.status === 503) {
        throw new Error('SAM.gov service temporarily unavailable - please try again later');
      } else if (response.status === 429) {
        throw new Error('Too many requests to SAM.gov - please wait a moment and try again');
      }

      throw new Error(`SAM.gov API error: ${response.status}`);
    }

    const data = await response.json();

    const opportunities = (data.opportunitiesData || data.opportunities || []).map(opp => ({
      noticeId: opp.noticeId,
      title: opp.title,
      department: opp.department?.name || opp.departmentName,
      subTier: opp.subTier?.name || opp.subTierName,
      office: opp.office?.name || opp.officeName,
      postedDate: opp.postedDate,
      responseDeadLine: opp.responseDeadLine,
      archiveDate: opp.archiveDate,
      type: opp.type?.value || opp.type,
      baseType: opp.baseType?.value || opp.baseType,
      setAsideDescription: opp.typeOfSetAsideDescription,
      naicsCode: opp.naicsCode,
      classificationCode: opp.classificationCode,
      description: opp.description?.body || opp.description,
      award: opp.award,
      pointOfContact: opp.pointOfContact,
      links: opp.links,
      uiLink: opp.uiLink || `https://sam.gov/opp/${opp.noticeId}/view`
    }));

    console.log(`SAM.gov search returned ${opportunities.length} results (page ${page})`);

    const total = data.totalRecords || opportunities.length;
    return Response.json({
      opportunities,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      source: 'sam.gov'
    });

  } catch (error) {
    console.error('SAM.gov API Error:', error.name, error.message);

    // Provide user-friendly error messages based on error type
    let userMessage;
    if (error.name === 'AbortError') {
      userMessage = 'SAM.gov search timed out - try a more specific search term or try again later';
    } else if (error.message?.includes('timeout')) {
      userMessage = error.message;
    } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
      userMessage = 'Network error connecting to SAM.gov - please check your connection and try again';
    } else {
      userMessage = `SAM.gov search temporarily unavailable: ${error.message}`;
    }

    // Return 200 with empty results and error message for graceful frontend handling
    return Response.json({
      error: userMessage,
      opportunities: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
      source: 'sam.gov'
    });
  }
}
