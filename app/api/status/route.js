/**
 * API Status/Health Check Endpoint
 * Tests all database connections and returns their status
 * GET /api/status - Returns status of all APIs
 * GET /api/status?test=true - Actually tests each API with a sample query
 */

const FETCH_TIMEOUT_MS = 10000; // Shorter timeout for status checks

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const start = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return { response, responseTime: Date.now() - start };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function testAPI(name, testFn) {
  const start = Date.now();
  try {
    const result = await testFn();
    return {
      name,
      status: 'ok',
      responseTime: Date.now() - start,
      ...result
    };
  } catch (error) {
    return {
      name,
      status: 'error',
      responseTime: Date.now() - start,
      error: error.message,
      errorType: error.name
    };
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const runTests = searchParams.get('test') === 'true';
  const testKeyword = searchParams.get('keyword') || 'health';

  const status = {
    timestamp: new Date().toISOString(),
    environment: {
      samApiKey: process.env.SAM_GOV_API_KEY ? 'configured' : 'missing',
      regulationsApiKey: process.env.REGULATIONS_GOV_API_KEY ? 'configured' : 'missing',
    },
    apis: {}
  };

  if (!runTests) {
    // Quick status without testing
    status.apis = {
      'grants.gov': { status: 'not_tested', endpoint: 'https://api.grants.gov/v1/api/search2' },
      'sam.gov': {
        status: process.env.SAM_GOV_API_KEY ? 'not_tested' : 'missing_key',
        endpoint: 'https://api.sam.gov/opportunities/v2/search'
      },
      'usaspending': { status: 'not_tested', endpoint: 'https://api.usaspending.gov/api/v2/search/spending_by_award/' },
      'nih-reporter': { status: 'not_tested', endpoint: 'https://api.reporter.nih.gov/v2/projects/search' },
      'nsf': { status: 'not_tested', endpoint: 'https://api.nsf.gov/services/v1/awards.json' },
      'federal-reporter': { status: 'not_tested', endpoint: 'https://api.reporter.nih.gov/v2/projects/search (multi-agency)' },
      'propublica': { status: 'not_tested', endpoint: 'https://projects.propublica.org/nonprofits/api/v2/search.json' },
      'fema': { status: 'not_tested', endpoint: 'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries' },
      'regulations.gov': {
        status: process.env.REGULATIONS_GOV_API_KEY ? 'not_tested' : 'missing_key',
        endpoint: 'https://api.regulations.gov/v4/documents'
      },
      'california': { status: 'not_tested', endpoint: 'https://data.ca.gov/api/3/action/datastore_search' },
    };
    status.message = 'Add ?test=true to run live API tests';
    return Response.json(status);
  }

  // Run actual API tests
  const tests = await Promise.all([
    // Grants.gov
    testAPI('grants.gov', async () => {
      const { response, responseTime } = await fetchWithTimeout(
        'https://api.grants.gov/v1/api/search2',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: testKeyword, rows: 1 })
        }
      );
      const data = await response.json();
      return {
        httpStatus: response.status,
        resultsFound: data.data?.hitCount || 0
      };
    }),

    // SAM.gov
    testAPI('sam.gov', async () => {
      if (!process.env.SAM_GOV_API_KEY) {
        throw new Error('API key not configured');
      }
      const params = new URLSearchParams({
        api_key: process.env.SAM_GOV_API_KEY,
        q: testKeyword,
        limit: '1'
      });
      const { response, responseTime } = await fetchWithTimeout(
        `https://api.sam.gov/opportunities/v2/search?${params}`
      );
      const data = await response.json();
      return {
        httpStatus: response.status,
        resultsFound: data.totalRecords || 0
      };
    }),

    // USASpending
    testAPI('usaspending', async () => {
      const { response, responseTime } = await fetchWithTimeout(
        'https://api.usaspending.gov/api/v2/search/spending_by_award/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: { keywords: [testKeyword], award_type_codes: ['02', '03', '04', '05'] },
            limit: 1
          })
        }
      );
      const data = await response.json();
      return {
        httpStatus: response.status,
        resultsFound: data.page_metadata?.total || 0
      };
    }),

    // NIH RePORTER
    testAPI('nih-reporter', async () => {
      const { response, responseTime } = await fetchWithTimeout(
        'https://api.reporter.nih.gov/v2/projects/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            criteria: { advanced_text_search: { search_text: testKeyword } },
            limit: 1
          })
        }
      );
      const data = await response.json();
      return {
        httpStatus: response.status,
        resultsFound: data.meta?.total || 0
      };
    }),

    // NSF
    testAPI('nsf', async () => {
      const { response, responseTime } = await fetchWithTimeout(
        `https://api.nsf.gov/services/v1/awards.json?keyword=${testKeyword}&rpp=1`
      );
      const data = await response.json();
      return {
        httpStatus: response.status,
        resultsFound: data.response?.award?.length || 0
      };
    }),

    // Federal RePORTER (via NIH)
    testAPI('federal-reporter', async () => {
      const { response, responseTime } = await fetchWithTimeout(
        'https://api.reporter.nih.gov/v2/projects/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            criteria: {
              advanced_text_search: { search_text: testKeyword },
              agencies: ['CDC', 'AHRQ', 'FDA']
            },
            limit: 1
          })
        }
      );
      const data = await response.json();
      return {
        httpStatus: response.status,
        resultsFound: data.meta?.total || 0
      };
    }),

    // ProPublica
    testAPI('propublica', async () => {
      const { response, responseTime } = await fetchWithTimeout(
        `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${testKeyword}`
      );
      const data = await response.json();
      return {
        httpStatus: response.status,
        resultsFound: data.total_results || 0
      };
    }),

    // FEMA
    testAPI('fema', async () => {
      const { response, responseTime } = await fetchWithTimeout(
        'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1&$format=json'
      );
      const data = await response.json();
      return {
        httpStatus: response.status,
        resultsFound: data.DisasterDeclarationsSummaries?.length || 0
      };
    }),

    // Regulations.gov
    testAPI('regulations.gov', async () => {
      if (!process.env.REGULATIONS_GOV_API_KEY) {
        throw new Error('API key not configured');
      }
      const { response, responseTime } = await fetchWithTimeout(
        `https://api.regulations.gov/v4/documents?filter[searchTerm]=${testKeyword}&page[size]=1&api_key=${process.env.REGULATIONS_GOV_API_KEY}`
      );
      const data = await response.json();
      return {
        httpStatus: response.status,
        resultsFound: data.meta?.totalElements || 0
      };
    }),

    // California
    testAPI('california', async () => {
      const { response, responseTime } = await fetchWithTimeout(
        `https://data.ca.gov/api/3/action/datastore_search?resource_id=111c8c88-21f6-453c-ae2c-b4785a0624f5&q=${testKeyword}&limit=1`
      );
      const data = await response.json();
      return {
        httpStatus: response.status,
        resultsFound: data.result?.total || 0,
        success: data.success
      };
    }),
  ]);

  // Organize results
  tests.forEach(test => {
    status.apis[test.name] = test;
  });

  // Summary
  const working = tests.filter(t => t.status === 'ok').length;
  const failed = tests.filter(t => t.status === 'error').length;
  status.summary = {
    total: tests.length,
    working,
    failed,
    avgResponseTime: Math.round(tests.reduce((sum, t) => sum + t.responseTime, 0) / tests.length)
  };

  return Response.json(status);
}
