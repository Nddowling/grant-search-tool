// SAM.gov Opportunities API - Requires API key
// Docs: https://open.gsa.gov/api/get-opportunities-public-api/

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const agency = searchParams.get('agency') || '';

  // Get API key from environment variable
  const apiKey = process.env.SAM_GOV_API_KEY;

  if (!apiKey) {
    return Response.json({ 
      error: 'SAM.gov API key not configured. Add SAM_GOV_API_KEY to environment variables.',
      opportunities: [],
      source: 'sam.gov'
    }, { status: 500 });
  }

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', opportunities: [] }, { status: 400 });
  }

  try {
    // Calculate date range (last 90 days to today + 365 days future)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 90);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 365);

    const formatDate = (date) => {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };

    // Build search URL
    const baseUrl = 'https://api.sam.gov/opportunities/v2/search';
    const params = new URLSearchParams({
      api_key: apiKey,
      q: keyword,
      postedFrom: formatDate(startDate),
      postedTo: formatDate(endDate),
      limit: '50',
      offset: '0'
    });

    // Add agency filter if provided
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
    
    // Normalize the response structure
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
    return Response.json({ 
      error: error.message,
      opportunities: [],
      source: 'sam.gov'
    }, { status: 500 });
  }
}
