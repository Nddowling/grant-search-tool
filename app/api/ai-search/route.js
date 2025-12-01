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
  "organizationType": "nonprofit|municipality|school|tribal|faith-based|small-business|other",
  "keywords": ["array", "of", "5-8", "highly specific", "search", "keywords"],
  "focusAreas": ["primary focus area", "secondary focus"],
  "eligibilityTypes": ["25-State governments", "99-Others", etc - use grants.gov codes if applicable],
  "fundingRange": { "min": number or null, "max": number or null },
  "summary": "2-3 sentence summary of what they're looking for",
  "primarySearchTerms": "the 2-3 most important search terms combined (e.g., 'veteran mental health' or 'youth STEM education')",
  "excludeCategories": ["disaster relief", "weather", etc - categories that are NOT relevant],
  "relevantSources": ["grants", "sam", "nihReporter"] - which database sources are most likely to have relevant results
}

IMPORTANT:
- Focus on extracting SPECIFIC, actionable search terms related to their actual mission/goals
- The primarySearchTerms should be a focused phrase that captures their core need
- excludeCategories should list types of grants that would NOT be relevant (e.g., if they're a tech nonprofit, exclude "disaster relief", "agriculture", etc.)
- relevantSources should only include databases that would actually have relevant grants (e.g., don't include FEMA for a wellness app, don't include NIH for construction projects)

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
        primarySearchTerms: description.split(' ').filter(w => w.length > 4).slice(0, 3).join(' '),
        relevantSources: ['grants', 'sam'],
        excludeCategories: [],
      };
    }

    // Step 2: Build the base URL for API calls
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Step 3: Search only RELEVANT sources using AI-generated search terms
    // Use the primarySearchTerms which is more specific than just the first keyword
    const searchTerms = analysis.primarySearchTerms || analysis.keywords?.slice(0, 3).join(' ') || description.split(' ')[0];
    const relevantSources = analysis.relevantSources || ['grants', 'sam', 'usaspending'];
    const excludeCategories = (analysis.excludeCategories || []).map(c => c.toLowerCase());

    console.log('AI Search - Terms:', searchTerms, 'Relevant sources:', relevantSources);

    const searchPromises = [];

    // Only search sources that the AI determined are relevant
    // Grants.gov - almost always relevant for grant seekers
    if (relevantSources.includes('grants')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/grants?keyword=${encodeURIComponent(searchTerms)}&limit=15`)
          .then(data => ({ source: 'grants', data }))
      );
    }

    // SAM.gov - usually relevant
    if (relevantSources.includes('sam')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/sam?keyword=${encodeURIComponent(searchTerms)}&limit=15`)
          .then(data => ({ source: 'sam', data }))
      );
    }

    // USASpending - for award history
    if (relevantSources.includes('usaspending')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/usaspending?keyword=${encodeURIComponent(searchTerms)}&limit=15`)
          .then(data => ({ source: 'usaspending', data }))
      );
    }

    // NIH Reporter - only for health/medical/research
    if (relevantSources.includes('nihReporter')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/nih-reporter?keyword=${encodeURIComponent(searchTerms)}&limit=15`)
          .then(data => ({ source: 'nihReporter', data }))
      );
    }

    // NSF - only for science/education/research
    if (relevantSources.includes('nsf')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/nsf?keyword=${encodeURIComponent(searchTerms)}&limit=15`)
          .then(data => ({ source: 'nsf', data }))
      );
    }

    // Federal Reporter - only for research grants
    if (relevantSources.includes('federalReporter')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/federal-reporter?keyword=${encodeURIComponent(searchTerms)}&limit=15`)
          .then(data => ({ source: 'federalReporter', data }))
      );
    }

    // ProPublica - for nonprofit research
    if (relevantSources.includes('propublica')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/propublica?keyword=${encodeURIComponent(searchTerms)}&limit=15`)
          .then(data => ({ source: 'propublica', data }))
      );
    }

    // FEMA - ONLY if disaster/emergency related
    if (relevantSources.includes('fema')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/fema?keyword=${encodeURIComponent(searchTerms)}&limit=15`)
          .then(data => ({ source: 'fema', data }))
      );
    }

    // California Grants - only if California-based
    if (relevantSources.includes('california') || description.toLowerCase().includes('california') || description.toLowerCase().includes('ca')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/california?keyword=${encodeURIComponent(searchTerms)}&limit=15`)
          .then(data => ({ source: 'california', data }))
      );
    }

    // Wait for all searches to complete
    const searchResults = await Promise.allSettled(searchPromises);

    // Compile results by source with relevance filtering
    const results = {};
    let totalResults = 0;

    // Keywords to filter out if they appear in excluded categories
    const irrelevantPatterns = excludeCategories.flatMap(cat => {
      if (cat.includes('disaster') || cat.includes('weather') || cat.includes('storm')) {
        return ['severe storm', 'tornado', 'flooding', 'hurricane', 'earthquake', 'wildfire', 'disaster declaration'];
      }
      if (cat.includes('agriculture') || cat.includes('farming')) {
        return ['crop insurance', 'farm bill', 'agricultural commodity'];
      }
      return [cat];
    });

    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value.data) {
        const { source, data } = result.value;
        let items = data.opportunities || data.awards || data.projects ||
                     data.organizations || data.grants || data.documents || [];

        // Filter out irrelevant results based on title/description
        if (irrelevantPatterns.length > 0) {
          items = items.filter(item => {
            const title = (item.title || item.opportunityTitle || item.projectTitle || '').toLowerCase();
            const desc = (item.description || item.synopsis || item.abstract || '').toLowerCase();
            const combined = title + ' ' + desc;

            // Check if any irrelevant pattern matches
            const isIrrelevant = irrelevantPatterns.some(pattern => combined.includes(pattern.toLowerCase()));
            return !isIrrelevant;
          });
        }

        // Also filter out grants with deadlines that have passed (more than 30 days ago)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        items = items.filter(item => {
          const deadline = item.closeDate || item.applicationDeadline || item.deadline;
          if (!deadline) return true; // Keep if no deadline specified
          const deadlineDate = new Date(deadline);
          return deadlineDate > thirtyDaysAgo; // Keep if deadline is in future or within last 30 days
        });

        results[source] = {
          items,
          total: items.length,
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
