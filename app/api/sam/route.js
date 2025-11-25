export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const agency = searchParams.get('agency') || '';

  const apiKey = process.env.SAM_GOV_API_KEY;

  if (!apiKey) {
    // Return 200 with empty results and a message instead of 500
    // This allows the frontend to handle it gracefully
    return Response.json({
      error: 'SAM.gov API key not configured. Contact administrator to enable SAM.gov search.',
      opportunities: [],
      total: 0,
      source: 'sam.gov'
    });
  }

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', opportunities: [] }, { status: 400 });
  }

  try {
    // SAM.gov API requires date range to be within 1 year (365 days max)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 180); // 6 months in the past
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 180); // 6 months in the future (total: ~360 days)

    const formatDate = (date) => {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };

    const baseUrl = 'https://api.sam.gov/opportunities/v2/search';
    const params = new URLSearchParams({
      api_key: apiKey,
      q: keyword,
      postedFrom: formatDate(startDate),
      postedTo: formatDate(endDate),
      limit: '50',
      offset: '0'
    });

    if (agency) {
      params.append('organizationId', agency);
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SAM.gov API Error Response:', errorText);
      throw new Error(`SAM.gov API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    const opportunities = (data.opportunitiesData || data.opportunities || []).map(opp => ({
      noticeId: opp.noticeId,
      title: opp.title,
      department: opp.department?.name || opp.departmentName,
      subTier: opp.subTier?.name || opp.subTierName,
      office: opp.office?.name || opp.officeName,
      postedDate: opp.postedDate,
      responseDeadLine: opp.responseDeadLine,
      archiveDate: opp.archiveDate,
      type: opp.type?.value || opp.type,
      baseType: opp.baseType?.value || opp.baseType,
      setAsideDescription: opp.typeOfSetAsideDescription,
      naicsCode: opp.naicsCode,
      classificationCode: opp.classificationCode,
      description: opp.description?.body || opp.description,
      award: opp.award,
      pointOfContact: opp.pointOfContact,
      links: opp.links,
      uiLink: opp.uiLink || `https://sam.gov/opp/${opp.noticeId}/view`
    }));

    return Response.json({
      opportunities,
      total: data.totalRecords || opportunities.length,
      source: 'sam.gov'
    });

  } catch (error) {
    console.error('SAM.gov API Error:', error);
    // Return 200 with empty results and error message for graceful frontend handling
    return Response.json({
      error: `SAM.gov search temporarily unavailable: ${error.message}`,
      opportunities: [],
      total: 0,
      source: 'sam.gov'
    });
  }
}
