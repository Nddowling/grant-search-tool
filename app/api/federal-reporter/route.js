/**
 * Federal RePORTER API Route
 * Searches multi-agency research funding (NIH + CDC + VA + AHRQ + others)
 * API Docs: https://api.federalreporter.nih.gov/
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
  const agency = searchParams.get('agency') || '';
  const state = searchParams.get('state') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 50;

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', projects: [] }, { status: 400 });
  }

  try {
    // Get current and recent fiscal years
    const currentYear = new Date().getFullYear();
    const fiscalYears = `${currentYear - 4},${currentYear - 3},${currentYear - 2},${currentYear - 1},${currentYear}`;

    // Build query URL - Federal RePORTER uses GET with query params
    const params = new URLSearchParams({
      query: `text:${keyword}`,
      fy: fiscalYears,
      offset: String((page - 1) * pageSize),
      limit: String(pageSize),
      sortOrder: 'desc',
      sortField: 'totalCost'
    });

    if (agency) {
      params.set('agency', agency);
    }

    if (state) {
      params.set('state', state);
    }

    const apiUrl = `https://api.federalreporter.nih.gov/v1/projects/search?${params.toString()}`;

    console.log(`Federal RePORTER search: keyword="${keyword}", page=${page}`);

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Federal RePORTER API Error:', response.status, errorText.substring(0, 200));
      throw new Error(`Federal RePORTER API error: ${response.status}`);
    }

    const data = await response.json();

    // Map response to normalized format
    const rawProjects = data.items || [];
    const projects = rawProjects.map(project => ({
      id: project.smApplId || project.projectNumber,
      projectNumber: project.projectNumber,
      title: project.title,
      abstract: project.abstractText,
      fiscalYear: project.fy,
      agency: project.agency,
      agencyFullName: project.agencyFullName,
      department: project.department,
      organization: project.orgName,
      orgCity: project.orgCity,
      orgState: project.orgState,
      orgCountry: project.orgCountry,
      piName: project.contactPi,
      coPIs: project.otherPis,
      totalCost: project.totalCost,
      directCost: project.directCost,
      indirectCost: project.indirectCost,
      startDate: project.projectStartDate,
      endDate: project.projectEndDate,
      activityCode: project.activityCode,
      cfdaCode: project.cfdaCode,
      fundingMechanism: project.fundingMechanism,
      nihCategory: project.nihSpendingCatName,
      link: project.projectNumber
        ? `https://federalreporter.nih.gov/Projects/Details/?projectId=${project.smApplId}`
        : null
    }));

    const total = data.totalCount || projects.length;

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
