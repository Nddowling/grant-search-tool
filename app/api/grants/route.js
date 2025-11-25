export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const agency = searchParams.get('agency') || '';
  const eligibility = searchParams.get('eligibility') || '';

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', opportunities: [] }, { status: 400 });
  }

  try {
    const requestBody = {
      keyword: keyword,
      oppStatuses: "forecasted|posted",
      sortBy: "openDate|desc",
      rows: 50
    };

    if (agency) {
      requestBody.agency = agency;
    }

    if (eligibility) {
      requestBody.eligibilities = eligibility;
    }

    const response = await fetch('https://www.grants.gov/grantsws/rest/opportunities/search/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const altResponse = await fetch(
        `https://www.grants.gov/grantsws/rest/opportunities/search/v2/search2?keyword=${encodeURIComponent(keyword)}&oppStatus=posted,forecasted&rows=50`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!altResponse.ok) {
        throw new Error(`Grants.gov API error: ${response.status}`);
      }

      const altData = await altResponse.json();
      return Response.json({
        opportunities: altData.oppHits || [],
        total: altData.totalRecords || 0,
        source: 'grants.gov'
      });
    }

    const data = await response.json();

    // Safely extract opportunities array with fallbacks
    const rawOpportunities = data.oppHits || data.opportunities || [];

    // Safely map opportunities with null checks
    const opportunities = rawOpportunities.map(opp => {
      if (!opp) return null;
      return {
        id: opp.id || opp.opportunityId || null,
        title: opp.title || opp.opportunityTitle || 'Untitled',
        agency: opp.agency || opp.agencyName || null,
        description: opp.description || (opp.synopsis ? opp.synopsis.synopsisDesc : null),
        postDate: opp.postDate || opp.openDate || null,
        closeDate: opp.closeDate || (opp.close ? opp.close.date : null),
        awardCeiling: opp.awardCeiling || null,
        awardFloor: opp.awardFloor || null,
        opportunityNumber: opp.number || opp.opportunityNumber || null,
        category: (opp.category ? opp.category.description : null) || opp.categoryOfFundingActivity || null,
        eligibility: opp.eligibilities || opp.applicantTypes || null,
      };
    }).filter(opp => opp !== null);

    return Response.json({
      opportunities,
      total: data.totalRecords || opportunities.length,
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
