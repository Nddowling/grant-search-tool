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

    const opportunities = (data.oppHits || data.opportunities || []).map(opp => ({
      id: opp.id || opp.opportunityId,
      title: opp.title || opp.opportunityTitle,
      agency: opp.agency || opp.agencyName,
      description: opp.description || opp.synopsis?.synopsisDesc,
      postDate: opp.postDate || opp.openDate,
      closeDate: opp.closeDate || opp.close?.date,
      awardCeiling: opp.awardCeiling,
      awardFloor: opp.awardFloor,
      opportunityNumber: opp.number || opp.opportunityNumber,
      category: opp.category?.description || opp.categoryOfFundingActivity,
      eligibility: opp.eligibilities || opp.applicantTypes,
    }));

    return Response.json({
      opportunities,
      total: data.totalRecords || opportunities.length,
      source: 'grants.gov'
    });

  } catch (error) {
    console.error('Grants.gov API Error:', error);
    return Response.json({
      error: error.message,
      opportunities: [],
      source: 'grants.gov'
    }, { status: 500 });
  }
}
