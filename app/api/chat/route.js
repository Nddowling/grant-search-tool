/**
 * Conversational Grant Assistant API
 *
 * Simplified version that:
 * 1. Takes user's query
 * 2. Calls the AI search endpoint ONCE
 * 3. Returns results to main grid
 * 4. Shows summary in chat
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const { messages, userProfile } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Messages array required' }, { status: 400 });
    }

    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return Response.json({ error: 'No user message found' }, { status: 400 });
    }

    const userQuery = lastUserMessage.content;

    // Build the base URL for internal API calls
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            content: 'Searching grant databases...'
          })}\n\n`));

          // Call the AI search endpoint ONCE
          const searchResponse = await fetch(`${baseUrl}/api/ai-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: userQuery,
              userEmail: userProfile?.email || 'pro-user',
            }),
          });

          if (!searchResponse.ok) {
            throw new Error('Search failed');
          }

          const searchData = await searchResponse.json();

          if (!searchData.success) {
            throw new Error(searchData.error || 'Search failed');
          }

          // Format results for the main page
          const formattedResults = {
            totalFound: searchData.totalResults,
            results: searchData.results,
            analysis: searchData.analysis,
            hasAiRecommendations: searchData.hasAiRecommendations,
          };

          // Send search results to populate the main grid
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'search_results',
            content: formattedResults
          })}\n\n`));

          // Generate a brief summary for the chat
          const topGrants = [];
          for (const [source, data] of Object.entries(searchData.results || {})) {
            for (const item of (data.items || []).slice(0, 3)) {
              topGrants.push({
                title: item.title || item.opportunityTitle || item.name || 'Untitled',
                agency: item.agency || item.agencyName || 'Unknown',
                source: source,
              });
            }
          }

          // Create summary message
          let summaryText = `I found ${searchData.totalResults} grants matching your search.\n\n`;

          if (searchData.analysis?.understoodIntent) {
            summaryText += `**What I understood:** ${searchData.analysis.understoodIntent}\n\n`;
          }

          if (searchData.hasAiRecommendations) {
            summaryText += `I've included AI-recommended programs (shown with purple badges) that may not appear in standard database searches.\n\n`;
          }

          if (topGrants.length > 0) {
            summaryText += `**Top matches include:**\n`;
            topGrants.slice(0, 5).forEach((grant, i) => {
              summaryText += `${i + 1}. ${grant.title.slice(0, 60)}${grant.title.length > 60 ? '...' : ''}\n`;
            });
            summaryText += `\nAll ${searchData.totalResults} results are displayed in the main grid. Click any grant to see details or get a custom template.`;
          } else {
            summaryText += `No grants found. Try describing your organization differently or broadening your search.`;
          }

          // Send the summary text
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'text',
            content: summaryText
          })}\n\n`));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();

        } catch (error) {
          console.error('Chat stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            content: 'Sorry, I encountered an error searching for grants. Please try again.'
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
