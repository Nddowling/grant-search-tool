/**
 * NIH RePORTER API Route
 * Searches NIH-funded research projects - $42B/year in health research grants
 * API Docs: https://api.reporter.nih.gov/
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
  const organization = searchParams.get('organization') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 50;

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', projects: [] }, { status: 400 });
  }

  try {
    // Get current and recent fiscal years
    const currentYear = new Date().getFullYear();
    const fiscalYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

    const requestBody = {
      criteria: {
        advanced_text_search: {
          operator: 'and',
          search_field: 'all',
          search_text: keyword
        },
        fiscal_years: fiscalYears
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
        'OrgCountry',
        'ContactPiName',
        'PrincipalInvestigators',
        'AwardAmount',
        'ProjectStartDate',
        'ProjectEndDate',
        'AgencyIcAdmin',
        'AgencyIcFundings',
        'CfdaCode',
        'ProgramOfficerName'
      ],
      offset: (page - 1) * pageSize,
      limit: pageSize,
      sort_field: 'award_amount',
      sort_order: 'desc'
    };

    // Add organization filter if provided
    if (organization) {
      requestBody.criteria.org_names = [organization];
    }

    console.log(`NIH RePORTER search: keyword="${keyword}", page=${page}`);

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
      console.error('NIH RePORTER API Error:', response.status, errorText.substring(0, 200));
      throw new Error(`NIH RePORTER API error: ${response.status}`);
    }

    const data = await response.json();

    // Map response to normalized format
    const projects = (data.results || []).map(project => {
      // Get primary PI name
      const primaryPi = project.principal_investigators?.find(pi => pi.is_contact_pi)
        || project.principal_investigators?.[0];

      // Get total award amount from agency fundings
      const totalAward = project.agency_ic_fundings?.reduce(
        (sum, funding) => sum + (funding.total_cost || 0), 0
      ) || project.award_amount;

      return {
        id: project.appl_id,
        projectNumber: project.project_num,
        title: project.project_title,
        abstract: project.abstract_text,
        fiscalYear: project.fiscal_year,
        organization: project.organization?.org_name,
        orgCity: project.organization?.org_city,
        orgState: project.organization?.org_state,
        orgCountry: project.organization?.org_country,
        piName: primaryPi?.full_name || project.contact_pi_name,
        allPIs: project.principal_investigators?.map(pi => pi.full_name).join(', '),
        awardAmount: totalAward,
        startDate: project.project_start_date,
        endDate: project.project_end_date,
        adminAgency: project.agency_ic_admin?.abbreviation,
        cfdaCode: project.cfda_code,
        programOfficer: project.program_officer_name,
        link: project.project_num
          ? `https://reporter.nih.gov/project-details/${project.appl_id}`
          : null
      };
    });

    const total = data.meta?.total || projects.length;

    console.log(`NIH RePORTER returned ${projects.length} projects (page ${page})`);

    return Response.json({
      projects,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      source: 'nih-reporter'
    });

  } catch (error) {
    console.error('NIH RePORTER API Error:', error.name, error.message);

    let userMessage;
    if (error.name === 'AbortError') {
      userMessage = 'NIH RePORTER search timed out - try a more specific search term';
    } else {
      userMessage = `NIH RePORTER search temporarily unavailable: ${error.message}`;
    }

    return Response.json({
      error: userMessage,
      projects: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
      source: 'nih-reporter'
    });
  }
}
