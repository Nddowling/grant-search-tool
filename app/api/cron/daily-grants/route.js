/**
 * Daily Cron Job for Grant Matching & Notifications
 *
 * This endpoint:
 * 1. Fetches new grants from all sources
 * 2. Matches them against agency profiles
 * 3. Sends email notifications to users
 *
 * Set up in vercel.json or call via external cron service
 */

import { NextResponse } from 'next/server';

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request) {
  // Verify the request is from Vercel Cron or has correct secret
  const authHeader = request.headers.get('authorization');

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    // Also check for Vercel's cron header
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    if (!isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const results = {
    timestamp: new Date().toISOString(),
    steps: [],
    errors: [],
  };

  try {
    // Step 1: Fetch grants from a sample search (you can customize this)
    console.log('Step 1: Fetching grants...');

    // Search for common grant topics to get a variety of results
    const searchTerms = ['education', 'health', 'environment', 'technology', 'community'];
    const allGrants = [];

    for (const term of searchTerms) {
      try {
        const searchResponse = await fetch(`${getBaseUrl(request)}/api/search/grants?keywords=${term}&limit=20`);
        if (searchResponse.ok) {
          const data = await searchResponse.json();
          if (data.opportunities) {
            allGrants.push(...data.opportunities.map(g => ({
              ...g,
              source: 'grants_gov',
              normalizedId: g.id || g.opportunityId,
              normalizedTitle: g.title || g.opportunityTitle,
              normalizedAgency: g.agency || g.agencyName,
              normalizedAmount: g.awardCeiling || g.awardFloor,
              normalizedDeadline: g.closeDate,
              normalizedDescription: g.synopsis?.synopsisDesc || g.description,
              normalizedLink: g.link || `https://www.grants.gov/search-results-detail/${g.opportunityId}`,
            })));
          }
        }
      } catch (e) {
        console.error(`Error fetching grants for "${term}":`, e);
      }
    }

    // Deduplicate grants by ID
    const uniqueGrants = Array.from(
      new Map(allGrants.map(g => [g.normalizedId, g])).values()
    );

    results.steps.push({
      step: 'fetch_grants',
      success: true,
      count: uniqueGrants.length,
    });

    // Step 2: Run grant matching
    console.log('Step 2: Matching grants against profiles...');

    const matchResponse = await fetch(`${getBaseUrl(request)}/api/match-grants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grants: uniqueGrants }),
    });

    const matchResult = await matchResponse.json();
    results.steps.push({
      step: 'match_grants',
      success: matchResult.success,
      profilesProcessed: matchResult.profilesProcessed,
      totalMatches: matchResult.totalMatches,
    });

    // Step 3: Send daily notifications
    console.log('Step 3: Sending notifications...');

    const notifyResponse = await fetch(`${getBaseUrl(request)}/api/send-notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frequency: 'daily' }),
    });

    const notifyResult = await notifyResponse.json();
    results.steps.push({
      step: 'send_notifications',
      success: notifyResult.success,
      emailsSent: notifyResult.emailsSent,
    });

    results.success = true;
    console.log('Cron job completed:', results);

    return NextResponse.json(results);

  } catch (error) {
    console.error('Cron job error:', error);
    results.errors.push(error.message);
    results.success = false;

    return NextResponse.json(results, { status: 500 });
  }
}

function getBaseUrl(request) {
  // Get the base URL from the request
  const host = request.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}
