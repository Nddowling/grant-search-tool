/**
 * OpenFEMA API Route
 * Searches disaster grants, hazard mitigation, public assistance data
 * API Docs: https://www.fema.gov/about/openfema/api
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
  const disasterType = searchParams.get('disasterType') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 50;

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', grants: [] }, { status: 400 });
  }

  try {
    // OpenFEMA uses OData-style query parameters
    const skip = (page - 1) * pageSize;

    // Build filter conditions
    const filters = [];

    // Note: OpenFEMA doesn't support full-text search on all fields
    // We'll filter by applicant name or project title containing the keyword
    filters.push(`contains(applicantName,'${keyword}') or contains(projectTitle,'${keyword}')`);

    if (state) {
      filters.push(`state eq '${state}'`);
    }

    if (disasterType) {
      filters.push(`incidentType eq '${disasterType}'`);
    }

    const params = new URLSearchParams({
      '$filter': filters.join(' and '),
      '$skip': String(skip),
      '$top': String(pageSize),
      '$orderby': 'obligatedDate desc',
      '$inlinecount': 'allpages'
    });

    // Use Public Assistance Grant Award Activities V2 dataset
    const apiUrl = `https://www.fema.gov/api/open/v2/PublicAssistanceGrantAwardActivities?${params.toString()}`;

    console.log(`OpenFEMA search: keyword="${keyword}", state="${state}", page=${page}`);

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenFEMA API Error:', response.status, errorText.substring(0, 200));
      throw new Error(`OpenFEMA API error: ${response.status}`);
    }

    const data = await response.json();

    // Map response to normalized format
    const rawGrants = data.PublicAssistanceGrantAwardActivities || [];
    const grants = rawGrants.map(grant => ({
      id: grant.id || `${grant.disasterNumber}-${grant.projectNumber}`,
      disasterNumber: grant.disasterNumber,
      declarationTitle: grant.declarationTitle,
      incidentType: grant.incidentType,
      incidentBeginDate: grant.incidentBeginDate,
      incidentEndDate: grant.incidentEndDate,
      state: grant.state,
      county: grant.county,
      applicantName: grant.applicantName,
      applicantId: grant.applicantId,
      projectNumber: grant.projectNumber,
      projectTitle: grant.projectTitle,
      projectSize: grant.projectSize,
      projectAmount: grant.projectAmount,
      federalShareObligated: grant.federalShareObligated,
      totalObligated: grant.totalObligated,
      obligatedDate: grant.obligatedDate,
      damageCategory: grant.damageCategory,
      damageCategoryCode: grant.damageCategoryCode,
      region: grant.region,
      link: grant.disasterNumber
        ? `https://www.fema.gov/disaster/${grant.disasterNumber}`
        : null
    }));

    const total = data.metadata?.count || grants.length;

    console.log(`OpenFEMA returned ${grants.length} grants (page ${page})`);

    return Response.json({
      grants,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      source: 'fema'
    });

  } catch (error) {
    console.error('OpenFEMA API Error:', error.name, error.message);

    let userMessage;
    if (error.name === 'AbortError') {
      userMessage = 'OpenFEMA search timed out - try a more specific search term';
    } else if (error.message?.includes('Invalid')) {
      userMessage = 'OpenFEMA search failed - try a simpler search term (special characters may not be supported)';
    } else {
      userMessage = `OpenFEMA search temporarily unavailable: ${error.message}`;
    }

    return Response.json({
      error: userMessage,
      grants: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
      source: 'fema'
    });
  }
}

/**
 * Get disaster declarations (supplementary endpoint)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const state = body.state;
    const year = body.year || new Date().getFullYear();

    const params = new URLSearchParams({
      '$filter': state
        ? `state eq '${state}' and fyDeclared eq ${year}`
        : `fyDeclared eq ${year}`,
      '$top': '100',
      '$orderby': 'declarationDate desc'
    });

    const apiUrl = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?${params.toString()}`;

    console.log(`OpenFEMA declarations: state="${state}", year=${year}`);

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenFEMA API error: ${response.status}`);
    }

    const data = await response.json();

    const declarations = (data.DisasterDeclarationsSummaries || []).map(dec => ({
      disasterNumber: dec.disasterNumber,
      declarationTitle: dec.declarationTitle,
      declarationType: dec.declarationType,
      incidentType: dec.incidentType,
      declarationDate: dec.declarationDate,
      incidentBeginDate: dec.incidentBeginDate,
      incidentEndDate: dec.incidentEndDate,
      state: dec.state,
      designatedArea: dec.designatedArea,
      ihProgramDeclared: dec.ihProgramDeclared,
      iaProgramDeclared: dec.iaProgramDeclared,
      paProgramDeclared: dec.paProgramDeclared,
      hmProgramDeclared: dec.hmProgramDeclared,
      link: `https://www.fema.gov/disaster/${dec.disasterNumber}`
    }));

    return Response.json({
      declarations,
      source: 'fema'
    });

  } catch (error) {
    console.error('OpenFEMA Declarations Error:', error.message);
    return Response.json({
      error: `Failed to fetch declarations: ${error.message}`,
      declarations: [],
      source: 'fema'
    });
  }
}
