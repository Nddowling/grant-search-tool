/**
 * AI-Powered Natural Language Grant Search
 *
 * Takes a user's description of their organization and needs,
 * uses Claude to extract search terms and understand intent,
 * then searches all grant databases in parallel.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const { description, userEmail } = await request.json();

    if (!description || description.trim().length < 10) {
      return Response.json({
        error: 'Please provide a more detailed description of your organization and needs.',
        success: false,
      }, { status: 400 });
    }

    // Step 1: Use Claude to analyze the description and extract search parameters
    const analysisPrompt = `You are a grant research assistant. Analyze this organization description and extract search parameters for finding relevant grants.

User's description:
"${description}"

Return a JSON object with:
{
  "organizationType": "nonprofit|municipality|school|tribal|faith-based|other",
  "keywords": ["array", "of", "5-8", "search", "keywords"],
  "focusAreas": ["primary focus area", "secondary focus"],
  "eligibilityTypes": ["25-State governments", "99-Others", etc - use grants.gov codes if applicable],
  "fundingRange": { "min": number or null, "max": number or null },
  "summary": "2-3 sentence summary of what they're looking for",
  "searchStrategies": [
    { "source": "grants", "keywords": "specific keywords for grants.gov" },
    { "source": "sam", "keywords": "specific keywords for SAM.gov" },
    { "source": "fema", "keywords": "specific keywords for FEMA" }
  ]
}

Focus on extracting actionable search terms. Be specific about the type of funding they need.
Return ONLY valid JSON, no markdown or explanation.`;

    const analysisResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    let analysis;
    try {
      const responseText = analysisResponse.content[0].text;
      // Clean up any markdown formatting
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse AI analysis:', parseError);
      // Fallback to basic keyword extraction
      analysis = {
        keywords: description.split(' ').filter(w => w.length > 4).slice(0, 5),
        summary: description.slice(0, 200),
        searchStrategies: [{ source: 'grants', keywords: description.slice(0, 50) }],
      };
    }

    // Step 2: Build the base URL for API calls
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Step 3: Search all sources in parallel using the AI-generated keywords
    const primaryKeyword = analysis.keywords?.[0] || description.split(' ')[0];
    const searchPromises = [];

    // Grants.gov
    searchPromises.push(
      fetchSource(`${baseUrl}/api/grants?keyword=${encodeURIComponent(primaryKeyword)}&limit=15`)
        .then(data => ({ source: 'grants', data }))
    );

    // SAM.gov
    searchPromises.push(
      fetchSource(`${baseUrl}/api/sam?keyword=${encodeURIComponent(primaryKeyword)}&limit=15`)
        .then(data => ({ source: 'sam', data }))
    );

    // USASpending
    searchPromises.push(
      fetchSource(`${baseUrl}/api/usaspending?keyword=${encodeURIComponent(primaryKeyword)}&limit=15`)
        .then(data => ({ source: 'usaspending', data }))
    );

    // NIH Reporter
    searchPromises.push(
      fetchSource(`${baseUrl}/api/nih-reporter?keyword=${encodeURIComponent(primaryKeyword)}&limit=15`)
        .then(data => ({ source: 'nihReporter', data }))
    );

    // NSF
    searchPromises.push(
      fetchSource(`${baseUrl}/api/nsf?keyword=${encodeURIComponent(primaryKeyword)}&limit=15`)
        .then(data => ({ source: 'nsf', data }))
    );

    // Federal Reporter
    searchPromises.push(
      fetchSource(`${baseUrl}/api/federal-reporter?keyword=${encodeURIComponent(primaryKeyword)}&limit=15`)
        .then(data => ({ source: 'federalReporter', data }))
    );

    // ProPublica
    searchPromises.push(
      fetchSource(`${baseUrl}/api/propublica?keyword=${encodeURIComponent(primaryKeyword)}&limit=15`)
        .then(data => ({ source: 'propublica', data }))
    );

    // FEMA
    searchPromises.push(
      fetchSource(`${baseUrl}/api/fema?keyword=${encodeURIComponent(primaryKeyword)}&limit=15`)
        .then(data => ({ source: 'fema', data }))
    );

    // California Grants (if relevant)
    if (description.toLowerCase().includes('california') || description.toLowerCase().includes('ca')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/california?keyword=${encodeURIComponent(primaryKeyword)}&limit=15`)
          .then(data => ({ source: 'california', data }))
      );
    }

    // Wait for all searches to complete
    const searchResults = await Promise.allSettled(searchPromises);

    // Compile results by source
    const results = {};
    let totalResults = 0;

    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value.data) {
        const { source, data } = result.value;
        const items = data.opportunities || data.awards || data.projects ||
                     data.organizations || data.grants || data.documents || [];
        results[source] = {
          items,
          total: data.total || items.length,
          page: data.page || 1,
          totalPages: data.totalPages || 1,
        };
        totalResults += items.length;
      }
    }

    // Step 4: Create a profile object from the analysis
    const profile = {
      description: description,
      organizationType: analysis.organizationType,
      focusAreas: analysis.focusAreas || [],
      keywords: analysis.keywords || [],
      summary: analysis.summary,
      createdAt: new Date().toISOString(),
    };

    return Response.json({
      success: true,
      analysis: {
        summary: analysis.summary,
        keywords: analysis.keywords,
        organizationType: analysis.organizationType,
        focusAreas: analysis.focusAreas,
      },
      profile,
      results,
      totalResults,
      searchedKeyword: primaryKeyword,
    });

  } catch (error) {
    console.error('AI Search error:', error);
    return Response.json({
      error: 'Search failed. Please try again.',
      success: false,
    }, { status: 500 });
  }
}

async function fetchSource(url, timeout = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
