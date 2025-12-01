/**
 * Conversational Grant Assistant API
 *
 * Pro users get an interactive Claude chat that:
 * - Asks clarifying questions about their organization
 * - Searches grants in real-time during conversation
 * - Explains why grants are a good fit
 * - Remembers context throughout the session
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for the grant assistant
const GRANT_ASSISTANT_PROMPT = `You are an expert grant research assistant helping organizations find and apply for grants. You have access to search multiple federal and state grant databases.

Your role:
1. Understand the user's organization, mission, and funding needs
2. Ask clarifying questions to narrow down the best grants (organization type, budget, timeline, etc.)
3. Search for grants using the search_grants tool when you have enough information
4. Explain why specific grants are good matches
5. Help evaluate eligibility and fit
6. Guide them toward the application process

Guidelines:
- Be conversational and helpful, not robotic
- Ask 2-3 clarifying questions before searching (don't ask too many at once)
- When presenting grants, explain WHY each one is relevant to their specific situation
- If no good matches are found, suggest alternative search terms or approaches
- Remember what they've told you throughout the conversation

Key questions to understand their needs:
- Organization type (nonprofit 501c3, for-profit, government, tribal, etc.)
- Primary mission/focus area
- Stage (startup, established, expanding)
- Funding amount needed
- Any existing partnerships or track record
- Geographic focus (national, state-specific, local)
- Timeline urgency

When you call search_grants, use specific, targeted search terms based on what you've learned about them.`;

// Tool definition for searching grants
const SEARCH_GRANTS_TOOL = {
  name: "search_grants",
  description: "Search federal and state grant databases for funding opportunities. Use specific, targeted search terms based on the organization's needs.",
  input_schema: {
    type: "object",
    properties: {
      searchTerms: {
        type: "string",
        description: "The search terms to use (e.g., 'veteran mental health technology' or 'youth STEM education nonprofit')"
      },
      organizationType: {
        type: "string",
        enum: ["nonprofit", "for-profit", "government", "tribal", "educational", "individual", "other"],
        description: "Type of organization seeking funding"
      },
      focusAreas: {
        type: "array",
        items: { type: "string" },
        description: "Key focus areas (e.g., ['mental health', 'veterans', 'technology'])"
      }
    },
    required: ["searchTerms"]
  }
};

export async function POST(request) {
  try {
    const { messages, userProfile } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Messages array required' }, { status: 400 });
    }

    // Build the base URL for internal API calls
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Add user profile context if available
    let systemPrompt = GRANT_ASSISTANT_PROMPT;
    if (userProfile) {
      systemPrompt += `\n\nUser's saved profile information:
- Organization: ${userProfile.organizationName || 'Not specified'}
- Type: ${userProfile.organizationType || 'Not specified'}
- Focus areas: ${userProfile.focusAreas?.join(', ') || 'Not specified'}
- Description: ${userProfile.description || 'Not specified'}

Use this information to personalize your responses and grant recommendations.`;
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Initial Claude call with tools
          let response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: systemPrompt,
            tools: [SEARCH_GRANTS_TOOL],
            messages: messages.map(m => ({
              role: m.role,
              content: m.content
            })),
          });

          // Handle tool use loop
          while (response.stop_reason === 'tool_use') {
            const toolUseBlock = response.content.find(block => block.type === 'tool_use');

            if (toolUseBlock && toolUseBlock.name === 'search_grants') {
              // Send status update
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'status',
                content: 'Searching grant databases...'
              })}\n\n`));

              // Execute the search
              const searchResults = await executeGrantSearch(baseUrl, toolUseBlock.input);

              // Send any text content before tool use
              const textContent = response.content.find(block => block.type === 'text');
              if (textContent) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'text',
                  content: textContent.text
                })}\n\n`));
              }

              // Send search results
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'search_results',
                content: searchResults
              })}\n\n`));

              // Continue conversation with tool result
              const updatedMessages = [
                ...messages.map(m => ({ role: m.role, content: m.content })),
                { role: 'assistant', content: response.content },
                {
                  role: 'user',
                  content: [{
                    type: 'tool_result',
                    tool_use_id: toolUseBlock.id,
                    content: JSON.stringify(searchResults)
                  }]
                }
              ];

              response = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2048,
                system: systemPrompt,
                tools: [SEARCH_GRANTS_TOOL],
                messages: updatedMessages,
              });
            } else {
              break;
            }
          }

          // Send final text response
          const finalText = response.content.find(block => block.type === 'text');
          if (finalText) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'text',
              content: finalText.text
            })}\n\n`));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();

        } catch (error) {
          console.error('Chat stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            content: 'Sorry, I encountered an error. Please try again.'
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Chat failed' }, { status: 500 });
  }
}

// Execute grant search using existing APIs
async function executeGrantSearch(baseUrl, params) {
  const { searchTerms, organizationType, focusAreas } = params;

  const searchPromises = [
    // Grants.gov
    fetch(`${baseUrl}/api/grants?keyword=${encodeURIComponent(searchTerms)}&limit=10`)
      .then(r => r.json())
      .then(data => ({ source: 'grants', items: data.opportunities || [] }))
      .catch(() => ({ source: 'grants', items: [] })),

    // SAM.gov
    fetch(`${baseUrl}/api/sam?keyword=${encodeURIComponent(searchTerms)}&limit=10`)
      .then(r => r.json())
      .then(data => ({ source: 'sam', items: data.opportunities || [] }))
      .catch(() => ({ source: 'sam', items: [] })),
  ];

  // Add NIH for health-related searches
  if (focusAreas?.some(f => ['health', 'medical', 'mental health', 'wellness', 'healthcare'].includes(f.toLowerCase()))) {
    searchPromises.push(
      fetch(`${baseUrl}/api/nih-reporter?keyword=${encodeURIComponent(searchTerms)}&limit=5`)
        .then(r => r.json())
        .then(data => ({ source: 'nihReporter', items: data.projects || [] }))
        .catch(() => ({ source: 'nihReporter', items: [] }))
    );
  }

  // Add SBIR for small business/startup
  if (organizationType === 'for-profit' || focusAreas?.some(f => f.toLowerCase().includes('startup'))) {
    searchPromises.push(
      fetch(`${baseUrl}/api/grants?keyword=${encodeURIComponent('SBIR ' + searchTerms)}&limit=5`)
        .then(r => r.json())
        .then(data => ({ source: 'sbir', items: data.opportunities || [] }))
        .catch(() => ({ source: 'sbir', items: [] }))
    );
  }

  const results = await Promise.all(searchPromises);

  // Combine and format results
  const allGrants = [];
  for (const result of results) {
    for (const item of result.items.slice(0, 5)) {
      allGrants.push({
        source: result.source,
        title: item.title || item.opportunityTitle || item.projectTitle || 'Untitled',
        agency: item.agency || item.agencyName || item.organization?.name || 'Unknown Agency',
        deadline: item.closeDate || item.applicationDeadline || 'Not specified',
        amount: item.awardAmount || item.awardCeiling || item.totalCost || 'Varies',
        description: (item.description || item.synopsis || item.abstract || '').slice(0, 300),
        url: item.url || item.opportunityUrl || null,
        id: item.id || item.opportunityId || item.projectNum || Math.random().toString(36).slice(2),
      });
    }
  }

  return {
    totalFound: allGrants.length,
    grants: allGrants.slice(0, 10), // Return top 10
    searchTerms,
  };
}
