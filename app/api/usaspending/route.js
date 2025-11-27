/**
 * USASpending.gov API Route
 * Searches federal award/grant data - shows who won grants, how much, where
 * API Docs: https://api.usaspending.gov/
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
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 25; // USASpending works better with smaller page sizes

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', awards: [] }, { status: 400 });
  }

  try {
    // USASpending uses POST with a complex filter body
    const requestBody = {
      filters: {
        keywords: [keyword],
        award_type_codes: ['02', '03', '04', '05'], // Grants only: Block Grant, Formula Grant, Project Grant, Cooperative Agreement
        time_period: [
          {
            start_date: '2020-01-01',
            end_date: new Date().toISOString().split('T')[0]
          }
        ]
      },
      fields: [
        'Award ID',
        'Recipient Name',
        'Recipient State Code',
        'Award Amount',
        'Total Outlays',
        'Description',
        'Start Date',
        'End Date',
        'Awarding Agency',
        'Awarding Sub Agency',
        'Award Type',
        'CFDA Number',
        'generated_internal_id'
      ],
      page: page,
      limit: pageSize,
      sort: 'Award Amount',
      order: 'desc',
      subawards: false
    };

    // Add agency filter if provided
    if (agency) {
      requestBody.filters.agencies = [
        {
          type: 'awarding',
          tier: 'toptier',
          name: agency
        }
      ];
    }

    console.log(`USASpending search: keyword="${keyword}", page=${page}`);

    const response = await fetchWithTimeout(
      'https://api.usaspending.gov/api/v2/search/spending_by_award/',
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
      console.error('USASpending API Error:', response.status, errorText.substring(0, 200));
      throw new Error(`USASpending API error: ${response.status}`);
    }

    const data = await response.json();

    // Map response to normalized format
    const awards = (data.results || []).map(award => ({
      id: award.generated_internal_id || award['Award ID'],
      awardId: award['Award ID'],
      title: award['Description'] || 'Federal Award',
      recipientName: award['Recipient Name'],
      recipientState: award['Recipient State Code'],
      amount: award['Award Amount'],
      outlays: award['Total Outlays'],
      startDate: award['Start Date'],
      endDate: award['End Date'],
      agency: award['Awarding Agency'],
      subAgency: award['Awarding Sub Agency'],
      awardType: award['Award Type'],
      cfdaNumber: award['CFDA Number'],
      link: award.generated_internal_id
        ? `https://www.usaspending.gov/award/${award.generated_internal_id}`
        : null
    }));

    const total = data.page_metadata?.total || awards.length;
    const hasNext = data.page_metadata?.hasNext || false;

    console.log(`USASpending returned ${awards.length} awards (page ${page})`);

    return Response.json({
      awards,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext,
      source: 'usaspending.gov'
    });

  } catch (error) {
    console.error('USASpending API Error:', error.name, error.message);

    let userMessage;
    if (error.name === 'AbortError') {
      userMessage = 'USASpending search timed out - try a more specific search term';
    } else {
      userMessage = `USASpending search temporarily unavailable: ${error.message}`;
    }

    return Response.json({
      error: userMessage,
      awards: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
      source: 'usaspending.gov'
    });
  }
}
