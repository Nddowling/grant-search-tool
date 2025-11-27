/**
 * Federal RePORTER API Route
 * Note: The Federal RePORTER API (api.federalreporter.nih.gov) has been deprecated.
 * NIH has consolidated this into the main NIH RePORTER API.
 * This route now uses NIH RePORTER with multi-agency filters.
 * API Docs: https://api.reporter.nih.gov/
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
  const agency = searchParams.get('agency') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 50;

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', projects: [] }, { status: 400 });
  }

  try {
    // Get current and recent fiscal years
    const currentYear = new Date().getFullYear();
    const fiscalYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

    // Use NIH RePORTER API which now includes multi-agency data
    // Filter for non-NIH agencies to differentiate from the NIH-specific endpoint
    const requestBody = {
      criteria: {
        advanced_text_search: {
          operator: 'and',
          search_field: 'all',
          search_text: keyword
        },
        fiscal_years: fiscalYears,
        // Include CDC, AHRQ, VA, FDA, and other HHS agencies
        agencies: agency ? [agency] : ['CDC', 'AHRQ', 'FDA', 'SAMHSA', 'HRSA', 'ACF', 'CMS']
      },
      include_fields: [
        'ApplId',
        'ProjectNum',
        'ProjectTitle',
        'AbstractText',
        'FiscalYear',
        'Organization',
        'OrgCity',
        'OrgState',
        'ContactPiName',
        'AwardAmount',
        'ProjectStartDate',
        'ProjectEndDate',
        'AgencyIcAdmin'
      ],
      offset: (page - 1) * pageSize,
      limit: pageSize,
      sort_field: 'award_amount',
      sort_order: 'desc'
    };

    console.log(`Federal RePORTER (via NIH API) search: keyword="${keyword}", page=${page}`);
    console.log(`Federal RePORTER request body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetchWithTimeout(
      'https://api.reporter.nih.gov/v2/projects/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Federal RePORTER API Error:', response.status, errorText.substring(0, 200));
      throw new Error(`Federal RePORTER API error: ${response.status}`);
    }

    const data = await response.json();

    // Map response to normalized format
    const rawProjects = data.results || [];
    const projects = rawProjects.map(project => ({
      id: project.appl_id,
      projectNumber: project.project_num,
      title: project.project_title,
      abstract: project.abstract_text,
      fiscalYear: project.fiscal_year,
      agency: project.agency_ic_admin?.abbreviation || 'HHS',
      agencyFullName: project.agency_ic_admin?.name,
      organization: project.organization?.org_name,
      orgCity: project.organization?.org_city,
      orgState: project.organization?.org_state,
      piName: project.contact_pi_name,
      totalCost: project.award_amount,
      startDate: project.project_start_date,
      endDate: project.project_end_date,
      link: project.appl_id
        ? `https://reporter.nih.gov/project-details/${project.appl_id}`
        : null
    }));

    const total = data.meta?.total || projects.length;

    console.log(`Federal RePORTER returned ${projects.length} projects (page ${page})`);

    return Response.json({
      projects,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      source: 'federal-reporter'
    });

  } catch (error) {
    console.error('Federal RePORTER API Error:', error.name, error.message);

    let userMessage;
    if (error.name === 'AbortError') {
      userMessage = 'Federal RePORTER search timed out - try a more specific search term';
    } else {
      userMessage = `Federal RePORTER search temporarily unavailable: ${error.message}`;
    }

    return Response.json({
      error: userMessage,
      projects: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
      source: 'federal-reporter'
    });
  }
}
