/**
 * Regulations.gov API Route
 * Searches federal rulemakings, public comments, dockets
 * API Docs: https://open.gsa.gov/api/regulationsgov/
 * Requires API key (free registration)
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
  const documentType = searchParams.get('documentType') || ''; // Proposed Rule, Rule, etc.
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 25; // Regulations.gov max is 250, but we keep it reasonable

  const apiKey = process.env.REGULATIONS_GOV_API_KEY;

  if (!apiKey) {
    return Response.json({
      error: 'Regulations.gov API key not configured. Contact administrator to enable regulatory search.',
      documents: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
      source: 'regulations.gov'
    });
  }

  if (!keyword) {
    return Response.json({ error: 'Keyword is required', documents: [] }, { status: 400 });
  }

  try {
    // Build query URL
    const params = new URLSearchParams({
      'api_key': apiKey,
      'filter[searchTerm]': keyword,
      'page[size]': String(pageSize),
      'page[number]': String(page),
      'sort': '-postedDate' // Most recent first
    });

    if (agency) {
      params.set('filter[agencyId]', agency);
    }

    if (documentType) {
      params.set('filter[documentType]', documentType);
    }

    const apiUrl = `https://api.regulations.gov/v4/documents?${params.toString()}`;

    console.log(`Regulations.gov search: keyword="${keyword}", page=${page}`);

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Regulations.gov API Error:', response.status, errorText.substring(0, 200));

      if (response.status === 429) {
        throw new Error('Rate limit exceeded - please wait a moment and try again');
      }
      throw new Error(`Regulations.gov API error: ${response.status}`);
    }

    const data = await response.json();

    // Map response to normalized format
    const documents = (data.data || []).map(doc => {
      const attrs = doc.attributes || {};
      return {
        id: doc.id,
        documentId: attrs.documentId,
        documentType: attrs.documentType,
        title: attrs.title,
        agencyId: attrs.agencyId,
        docketId: attrs.docketId,
        postedDate: attrs.postedDate,
        lastModifiedDate: attrs.lastModifiedDate,
        commentStartDate: attrs.commentStartDate,
        commentEndDate: attrs.commentEndDate,
        effectiveDate: attrs.effectiveDate,
        frDocNum: attrs.frDocNum,
        allowLateComments: attrs.allowLateComments,
        openForComment: attrs.openForComment,
        objectId: attrs.objectId,
        highlightedContent: attrs.highlightedContent,
        summary: attrs.summary,
        link: doc.id
          ? `https://www.regulations.gov/document/${doc.id}`
          : null
      };
    });

    // Regulations.gov uses cursor-based pagination with meta info
    const meta = data.meta || {};
    const total = meta.totalElements || documents.length;
    const totalPages = meta.totalPages || Math.ceil(total / pageSize);

    console.log(`Regulations.gov returned ${documents.length} documents (page ${page})`);

    return Response.json({
      documents,
      total,
      page,
      pageSize,
      totalPages,
      hasMorePages: meta.hasNextPage || page < totalPages,
      source: 'regulations.gov'
    });

  } catch (error) {
    console.error('Regulations.gov API Error:', error.name, error.message);

    let userMessage;
    if (error.name === 'AbortError') {
      userMessage = 'Regulations.gov search timed out - try a more specific search term';
    } else if (error.message?.includes('Rate limit')) {
      userMessage = error.message;
    } else {
      userMessage = `Regulations.gov search temporarily unavailable: ${error.message}`;
    }

    return Response.json({
      error: userMessage,
      documents: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
      source: 'regulations.gov'
    });
  }
}

/**
 * Get detailed document with attachments
 */
export async function POST(request) {
  const apiKey = process.env.REGULATIONS_GOV_API_KEY;

  if (!apiKey) {
    return Response.json({
      error: 'Regulations.gov API key not configured',
      document: null,
      source: 'regulations.gov'
    });
  }

  try {
    const body = await request.json();
    const documentId = body.documentId;

    if (!documentId) {
      return Response.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const params = new URLSearchParams({
      'api_key': apiKey,
      'include': 'attachments'
    });

    const apiUrl = `https://api.regulations.gov/v4/documents/${documentId}?${params.toString()}`;

    console.log(`Regulations.gov document lookup: id="${documentId}"`);

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Regulations.gov API error: ${response.status}`);
    }

    const data = await response.json();
    const attrs = data.data?.attributes || {};
    const included = data.included || [];

    const document = {
      id: data.data?.id,
      ...attrs,
      attachments: included
        .filter(item => item.type === 'attachments')
        .map(att => ({
          id: att.id,
          title: att.attributes?.title,
          fileFormats: att.attributes?.fileFormats,
          size: att.attributes?.size
        })),
      link: `https://www.regulations.gov/document/${data.data?.id}`
    };

    return Response.json({
      document,
      source: 'regulations.gov'
    });

  } catch (error) {
    console.error('Regulations.gov Document Lookup Error:', error.message);
    return Response.json({
      error: `Failed to fetch document: ${error.message}`,
      document: null,
      source: 'regulations.gov'
    });
  }
}
