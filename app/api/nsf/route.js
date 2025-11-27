/**
 * NSF Awards API Route
 * Searches National Science Foundation awards - $9B/year in science, engineering, STEM grants
 * API Docs: https://www.research.gov/common/webapi/awardapisearch-v1.htm
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
  const institution = searchParams.get('institution') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 25; // NSF API default

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', awards: [] }, { status: 400 });
  }

  try {
    // Calculate date range - last 5 years
    const today = new Date();
    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(today.getFullYear() - 5);

    const formatDate = (date) => {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };

    // Build query URL - NSF uses GET with query params
    const params = new URLSearchParams({
      keyword: keyword.replace(/\s+/g, '+'), // NSF uses + for spaces
      printFields: 'id,title,abstractText,agency,awardeeCity,awardeeCountryCode,awardeeName,awardeeStateCode,awardeeZipCode,cfdaNumber,coPDPI,date,startDate,expDate,estimatedTotalAmt,fundsObligatedAmt,piFirstName,piMiddeInitial,piLastName,piEmail,poName,poEmail,primaryProgram,transType,awardee,poPhone,awardeeAddress,perfAddress,publicationResearch,fundProgramName,pdPIName,piPhone',
      dateStart: formatDate(fiveYearsAgo),
      dateEnd: formatDate(today),
      offset: ((page - 1) * pageSize) + 1, // NSF uses 1-based offset
      rpp: pageSize
    });

    // Add institution filter
    if (institution) {
      params.set('awardeeName', institution.replace(/\s+/g, '+'));
    }

    const apiUrl = `https://api.nsf.gov/services/v1/awards.json?${params.toString()}`;

    console.log(`NSF Awards search: keyword="${keyword}", page=${page}`);

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NSF Awards API Error:', response.status, errorText.substring(0, 200));
      throw new Error(`NSF Awards API error: ${response.status}`);
    }

    const data = await response.json();

    // Map response to normalized format
    const rawAwards = data.response?.award || [];
    const awards = rawAwards.map(award => ({
      id: award.id,
      title: award.title,
      abstract: award.abstractText,
      piName: award.pdPIName || `${award.piFirstName || ''} ${award.piLastName || ''}`.trim(),
      piEmail: award.piEmail,
      institution: award.awardeeName,
      institutionCity: award.awardeeCity,
      institutionState: award.awardeeStateCode,
      institutionZip: award.awardeeZipCode,
      startDate: award.startDate,
      endDate: award.expDate,
      estimatedAmount: parseFloat(award.estimatedTotalAmt) || null,
      obligatedAmount: parseFloat(award.fundsObligatedAmt) || null,
      cfdaNumber: award.cfdaNumber,
      programOfficer: award.poName,
      programOfficerEmail: award.poEmail,
      primaryProgram: award.primaryProgram,
      fundProgramName: award.fundProgramName,
      transactionType: award.transType,
      link: award.id
        ? `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${award.id}`
        : null
    }));

    // NSF doesn't return total count reliably, estimate based on results
    const total = awards.length < pageSize
      ? ((page - 1) * pageSize) + awards.length
      : page * pageSize + 100; // Assume more pages exist

    console.log(`NSF Awards returned ${awards.length} awards (page ${page})`);

    return Response.json({
      awards,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      source: 'nsf'
    });

  } catch (error) {
    console.error('NSF Awards API Error:', error.name, error.message);

    let userMessage;
    if (error.name === 'AbortError') {
      userMessage = 'NSF Awards search timed out - try a more specific search term';
    } else {
      userMessage = `NSF Awards search temporarily unavailable: ${error.message}`;
    }

    return Response.json({
      error: userMessage,
      awards: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
      source: 'nsf'
    });
  }
}
