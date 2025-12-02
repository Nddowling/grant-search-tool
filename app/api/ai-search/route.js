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

    // Step 1: Use Claude to deeply understand the search intent
    const analysisPrompt = `You are an expert grant researcher. Your job is to understand EXACTLY what kind of grants this organization needs.

User's search query:
"${description}"

Analyze this carefully and return a JSON object:
{
  "understoodIntent": "One sentence describing what they're ACTUALLY looking for",
  "organizationType": "municipality|nonprofit|tribal|school|small-business|for-profit|individual|other",
  "specificEntity": "e.g., 'small police department', 'rural fire department', 'community health clinic'",
  "primarySearchTerms": ["array of 2-4 SPECIFIC search phrases to try"],
  "mustHaveKeywords": ["words that MUST appear in relevant grants"],
  "excludeKeywords": ["words that indicate an IRRELEVANT grant"],
  "relevantSources": ["grants", "sam"] - only include sources that make sense,
  "eligibleFor": ["law enforcement", "public safety", "local government", etc - grant categories they qualify for]
}

EXAMPLES:

Query: "grants for small police departments"
{
  "understoodIntent": "Looking for federal grants to fund small/rural police department operations, equipment, or programs",
  "organizationType": "municipality",
  "specificEntity": "small police department",
  "primarySearchTerms": ["police department grant", "law enforcement funding", "COPS grant", "BJA police"],
  "mustHaveKeywords": ["police", "law enforcement", "public safety", "COPS"],
  "excludeKeywords": ["disaster", "weather", "agriculture", "health research", "education K-12", "nonprofit only"],
  "relevantSources": ["grants", "sam"],
  "eligibleFor": ["law enforcement", "public safety", "local government", "criminal justice"]
}

Query: "veteran wellness nonprofit"
{
  "understoodIntent": "Looking for grants for a nonprofit focused on veteran mental health and wellness programs",
  "organizationType": "nonprofit",
  "specificEntity": "veteran wellness nonprofit",
  "primarySearchTerms": ["veteran mental health", "veteran wellness program", "VA community grant"],
  "mustHaveKeywords": ["veteran", "mental health", "wellness", "nonprofit"],
  "excludeKeywords": ["disaster", "weather", "agriculture", "for-profit only", "construction"],
  "relevantSources": ["grants", "sam", "nihReporter"],
  "eligibleFor": ["veteran services", "mental health", "nonprofit", "community programs"]
}

Return ONLY valid JSON for the user's query above.`;

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
      // Fallback to basic extraction
      analysis = {
        understoodIntent: description,
        primarySearchTerms: [description],
        mustHaveKeywords: description.split(' ').filter(w => w.length > 3),
        excludeKeywords: [],
        relevantSources: ['grants', 'sam'],
        eligibleFor: [],
      };
    }

    console.log('AI Search Analysis:', JSON.stringify(analysis, null, 2));

    // Step 2: Build the base URL for API calls
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Step 3: Search using MULTIPLE search terms for better coverage
    const searchTermsArray = Array.isArray(analysis.primarySearchTerms)
      ? analysis.primarySearchTerms
      : [analysis.primarySearchTerms || description];
    const relevantSources = analysis.relevantSources || ['grants', 'sam'];
    const mustHaveKeywords = (analysis.mustHaveKeywords || []).map(k => k.toLowerCase());
    const excludeKeywords = (analysis.excludeKeywords || []).map(k => k.toLowerCase());

    console.log('AI Search - Terms:', searchTermsArray, 'Must have:', mustHaveKeywords);

    const searchPromises = [];

    // Search each term across relevant sources
    for (const searchTerm of searchTermsArray.slice(0, 3)) { // Max 3 search terms
      // Grants.gov
      if (relevantSources.includes('grants')) {
        searchPromises.push(
          fetchSource(`${baseUrl}/api/grants?keyword=${encodeURIComponent(searchTerm)}&limit=20`)
            .then(data => ({ source: 'grants', searchTerm, data }))
        );
      }

      // SAM.gov
      if (relevantSources.includes('sam')) {
        searchPromises.push(
          fetchSource(`${baseUrl}/api/sam?keyword=${encodeURIComponent(searchTerm)}&limit=20`)
            .then(data => ({ source: 'sam', searchTerm, data }))
        );
      }
    }

    // Only add specialized sources if explicitly relevant
    if (relevantSources.includes('nihReporter')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/nih-reporter?keyword=${encodeURIComponent(searchTermsArray[0])}&limit=15`)
          .then(data => ({ source: 'nihReporter', data }))
      );
    }

    // California Grants - only if California-based
    if (relevantSources.includes('california') || description.toLowerCase().includes('california')) {
      searchPromises.push(
        fetchSource(`${baseUrl}/api/california?keyword=${encodeURIComponent(searchTermsArray[0])}&limit=15`)
          .then(data => ({ source: 'california', data }))
      );
    }

    // Wait for all searches to complete
    const searchResults = await Promise.allSettled(searchPromises);

    // Step 4: Compile and FILTER results with relevance scoring
    const results = {};
    const seenIds = new Set(); // Deduplicate across search terms
    let totalResults = 0;

    // Helper function to calculate relevance score
    const calculateRelevance = (item) => {
      const title = (item.title || item.opportunityTitle || item.projectTitle || '').toLowerCase();
      const desc = (item.description || item.synopsis || item.abstract || '').toLowerCase();
      const agency = (item.agency || item.agencyName || '').toLowerCase();
      const combined = title + ' ' + desc + ' ' + agency;

      let score = 0;

      // Boost for must-have keywords (each match = +10 points)
      for (const keyword of mustHaveKeywords) {
        if (combined.includes(keyword)) {
          score += 10;
          // Extra boost if in title
          if (title.includes(keyword)) score += 5;
        }
      }

      // Penalty for exclude keywords (each match = -20 points)
      for (const keyword of excludeKeywords) {
        if (combined.includes(keyword)) {
          score -= 20;
        }
      }

      // Bonus for active/open grants
      const deadline = item.closeDate || item.applicationDeadline || item.deadline;
      if (deadline) {
        const deadlineDate = new Date(deadline);
        const now = new Date();
        if (deadlineDate > now) {
          score += 5; // Bonus for still open
        } else {
          score -= 50; // Big penalty for closed
        }
      }

      return score;
    };

    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value.data) {
        const { source, data } = result.value;
        let items = data.opportunities || data.awards || data.projects ||
                     data.organizations || data.grants || data.documents || [];

        // Calculate relevance and filter
        items = items
          .map(item => ({
            ...item,
            _relevanceScore: calculateRelevance(item),
            _id: item.id || item.opportunityId || item.projectNum || JSON.stringify(item.title || '').slice(0, 50),
          }))
          // Filter out low relevance (negative scores) and duplicates
          .filter(item => {
            if (item._relevanceScore < 0) return false;
            if (seenIds.has(item._id)) return false;
            seenIds.add(item._id);
            return true;
          })
          // Sort by relevance
          .sort((a, b) => b._relevanceScore - a._relevanceScore)
          // Take top results
          .slice(0, 15);

        // Filter out grants with deadlines more than 30 days past
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        items = items.filter(item => {
          const deadline = item.closeDate || item.applicationDeadline || item.deadline;
          if (!deadline) return true;
          const deadlineDate = new Date(deadline);
          return deadlineDate > thirtyDaysAgo;
        });

        // Merge into existing results for this source
        if (results[source]) {
          // Combine and re-sort
          const combined = [...results[source].items, ...items]
            .filter((item, index, self) =>
              index === self.findIndex(t => t._id === item._id)
            )
            .sort((a, b) => b._relevanceScore - a._relevanceScore)
            .slice(0, 20);
          results[source] = {
            items: combined,
            total: combined.length,
            page: 1,
            totalPages: 1,
          };
        } else {
          results[source] = {
            items,
            total: items.length,
            page: data.page || 1,
            totalPages: data.totalPages || 1,
          };
        }
      }
    }

    // Recalculate total
    totalResults = Object.values(results).reduce((sum, r) => sum + r.items.length, 0);

    // Step 5: Create response
    const profile = {
      description: description,
      organizationType: analysis.organizationType,
      specificEntity: analysis.specificEntity,
      eligibleFor: analysis.eligibleFor || [],
      createdAt: new Date().toISOString(),
    };

    return Response.json({
      success: true,
      analysis: {
        understoodIntent: analysis.understoodIntent,
        organizationType: analysis.organizationType,
        specificEntity: analysis.specificEntity,
        eligibleFor: analysis.eligibleFor,
      },
      profile,
      results,
      totalResults,
      searchedKeyword: searchTermsArray[0],
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
