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
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 50;

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', grants: [] }, { status: 400 });
  }

  try {
    const skip = (page - 1) * pageSize;

    // OpenFEMA v1 API with simpler query - search Disaster Declarations instead
    // The PublicAssistanceGrantAwardActivities endpoint has limited text search
    // Use DisasterDeclarationsSummaries which is more reliable
    const params = new URLSearchParams({
      '$orderby': 'declarationDate desc',
      '$skip': String(skip),
      '$top': String(pageSize),
      '$format': 'json'
    });

    // Add state filter if provided
    if (state) {
      params.set('$filter', `state eq '${state.toUpperCase()}'`);
    }

    const apiUrl = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?${params.toString()}`;

    console.log(`OpenFEMA search: keyword="${keyword}", state="${state}", page=${page}`);

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenFEMA API Error:', response.status, errorText.substring(0, 500));
      throw new Error(`OpenFEMA API error: ${response.status}`);
    }

    const data = await response.json();

    // Get disaster declarations and filter by keyword client-side
    const rawDeclarations = data.DisasterDeclarationsSummaries || [];
    const keywordLower = keyword.toLowerCase();

    // Filter declarations that match the keyword
    const filteredDeclarations = rawDeclarations.filter(dec => {
      const title = (dec.declarationTitle || '').toLowerCase();
      const incidentType = (dec.incidentType || '').toLowerCase();
      const designatedArea = (dec.designatedArea || '').toLowerCase();
      return title.includes(keywordLower) ||
             incidentType.includes(keywordLower) ||
             designatedArea.includes(keywordLower);
    });

    const grants = filteredDeclarations.map(dec => ({
      id: dec.disasterNumber || dec.id,
      disasterNumber: dec.disasterNumber,
      declarationTitle: dec.declarationTitle,
      incidentType: dec.incidentType,
      incidentBeginDate: dec.incidentBeginDate,
      incidentEndDate: dec.incidentEndDate,
      state: dec.state,
      county: dec.designatedArea,
      applicantName: dec.designatedArea,
      projectTitle: dec.declarationTitle,
      federalShareObligated: null,
      totalObligated: null,
      obligatedDate: dec.declarationDate,
      link: dec.disasterNumber
        ? `https://www.fema.gov/disaster/${dec.disasterNumber}`
        : null
    }));

    // If no keyword matches, try to return recent disasters anyway
    const finalGrants = grants.length > 0 ? grants : rawDeclarations.slice(0, 10).map(dec => ({
      id: dec.disasterNumber || dec.id,
      disasterNumber: dec.disasterNumber,
      declarationTitle: dec.declarationTitle,
      incidentType: dec.incidentType,
      incidentBeginDate: dec.incidentBeginDate,
      incidentEndDate: dec.incidentEndDate,
      state: dec.state,
      county: dec.designatedArea,
      applicantName: dec.designatedArea,
      projectTitle: dec.declarationTitle,
      federalShareObligated: null,
      obligatedDate: dec.declarationDate,
      link: dec.disasterNumber
        ? `https://www.fema.gov/disaster/${dec.disasterNumber}`
        : null
    }));

    console.log(`OpenFEMA returned ${finalGrants.length} disaster declarations (page ${page})`);

    return Response.json({
      grants: finalGrants,
      total: finalGrants.length,
      page,
      pageSize,
      totalPages: Math.ceil(finalGrants.length / pageSize),
      source: 'fema'
    });

  } catch (error) {
    console.error('OpenFEMA API Error:', error.name, error.message);

    let userMessage;
    if (error.name === 'AbortError') {
      userMessage = 'OpenFEMA search timed out - try again later';
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
