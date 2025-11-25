export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const agency = searchParams.get('agency') || '';
  const eligibility = searchParams.get('eligibility') || '';

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', opportunities: [] }, { status: 400 });
  }

  try {
    // Use the new Grants.gov search2 API endpoint (launched March 2025)
    const requestBody = {
      keyword: keyword,
      oppStatuses: "forecasted|posted",
      rows: 50
    };

    if (agency) {
      requestBody.agencies = agency;
    }

    if (eligibility) {
      requestBody.eligibilities = eligibility;
    }

    const response = await fetch('https://api.grants.gov/v1/api/search2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grants.gov API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // The new search2 API returns data nested under data.data
    const responseData = data.data || data;

    // Safely extract opportunities array with fallbacks
    const rawOpportunities = responseData.oppHits || responseData.opportunities || [];

    // Safely map opportunities with null checks
    const opportunities = rawOpportunities.map(opp => {
      if (!opp) return null;
      return {
        id: opp.id || opp.opportunityId || null,
        title: opp.title || opp.opportunityTitle || 'Untitled',
        agency: opp.agencyCode || opp.agency || opp.agencyName || null,
        description: opp.synopsis || opp.description || null,
        postDate: opp.openDate || opp.postDate || null,
        closeDate: opp.closeDate || null,
        awardCeiling: opp.awardCeiling || null,
        awardFloor: opp.awardFloor || null,
        opportunityNumber: opp.oppNum || opp.number || opp.opportunityNumber || null,
        category: opp.fundingCategory || opp.categoryOfFundingActivity || null,
        eligibility: opp.applicantEligibility || opp.eligibilities || opp.applicantTypes || null,
        link: opp.id ? `https://www.grants.gov/search-results-detail/${opp.id}` : null,
      };
    }).filter(opp => opp !== null);

    return Response.json({
      opportunities,
      total: responseData.hitCount || responseData.totalRecords || opportunities.length,
      source: 'grants.gov'
    });

  } catch (error) {
    console.error('Grants.gov API Error:', error);
    // Return 200 with empty results and error message for graceful frontend handling
    return Response.json({
      error: `Grants.gov search temporarily unavailable: ${error.message}`,
      opportunities: [],
      total: 0,
      source: 'grants.gov'
    });
  }
}
