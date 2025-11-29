/**
 * Send Notifications API
 * Sends email notifications for grant matches
 * Should be called by cron job (daily/weekly based on preferences)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Email configuration (using Resend - you'll need to add RESEND_API_KEY)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'grants@yourdomain.com';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * Generate email HTML for grant matches
 */
function generateEmailHTML(profile, matches) {
  const matchesHTML = matches.slice(0, 10).map(match => `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <h3 style="margin: 0; font-size: 16px; color: #1f2937; line-height: 1.4;">
          ${match.grant_title}
        </h3>
        <span style="background: ${getScoreColor(match.match_score)}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; white-space: nowrap; margin-left: 12px;">
          ${match.match_score}% Match
        </span>
      </div>

      <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
        <strong>Agency:</strong> ${match.grant_agency || 'Not specified'} |
        <strong>Amount:</strong> ${match.grant_amount || 'Not specified'} |
        <strong>Deadline:</strong> ${match.grant_deadline || 'Not specified'}
      </div>

      ${match.grant_description ? `
        <p style="font-size: 14px; color: #4b5563; margin: 8px 0; line-height: 1.5;">
          ${match.grant_description.slice(0, 200)}${match.grant_description.length > 200 ? '...' : ''}
        </p>
      ` : ''}

      <div style="margin-top: 12px;">
        <span style="font-size: 12px; color: #059669;">
          Why it matches: ${(match.match_reasons || []).slice(0, 3).join(' • ')}
        </span>
      </div>

      <div style="margin-top: 12px;">
        ${match.grant_link ? `
          <a href="${match.grant_link}" style="display: inline-block; background: #3b82f6; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; margin-right: 8px;">
            View Grant →
          </a>
        ` : ''}
        <a href="${BASE_URL}?highlight=${match.grant_id}" style="display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
          Get Template
        </a>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">
            New Grant Matches for ${profile.organization_name}
          </h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">
            We found ${matches.length} grant${matches.length !== 1 ? 's' : ''} matching your profile
          </p>
        </div>

        <!-- Content -->
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px;">
          ${matchesHTML}

          ${matches.length > 10 ? `
            <div style="text-align: center; margin-top: 16px;">
              <a href="${BASE_URL}?tab=matches" style="color: #7c3aed; font-weight: 500; text-decoration: none;">
                View ${matches.length - 10} more matches →
              </a>
            </div>
          ` : ''}

          <!-- Footer -->
          <div style="border-top: 1px solid #e5e7eb; margin-top: 24px; padding-top: 24px; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0 0 8px 0;">
              You're receiving this because you enabled grant alerts for ${profile.organization_name}
            </p>
            <a href="${BASE_URL}?settings=notifications" style="font-size: 12px; color: #6b7280; text-decoration: underline;">
              Manage notification preferences
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getScoreColor(score) {
  if (score >= 80) return '#059669'; // green
  if (score >= 60) return '#3b82f6'; // blue
  if (score >= 40) return '#f59e0b'; // yellow
  return '#6b7280'; // gray
}

/**
 * Send email via Resend API
 */
async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.log('Resend API key not configured. Email would be sent to:', to);
    console.log('Subject:', subject);
    return { success: true, mock: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email');
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// POST - Send notifications (called by cron)
export async function POST(request) {
  try {
    const body = await request.json();
    const { frequency, profileId, testMode } = body;

    // frequency: 'daily', 'weekly', 'monthly'
    // If profileId provided, only send for that profile
    // testMode: if true, don't actually send emails, just preview

    if (!supabase) {
      return Response.json({
        success: true,
        message: 'Supabase not configured - notification preview only',
        emailsSent: 0,
      });
    }

    // Get profiles that need notifications
    let query = supabase
      .from('agency_profiles')
      .select('*')
      .eq('email_notifications', true);

    if (profileId) {
      query = query.eq('id', profileId);
    } else if (frequency) {
      query = query.eq('notification_frequency', frequency);
    }

    const { data: profiles, error: profileError } = await query;

    if (profileError) {
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      return Response.json({
        success: true,
        message: 'No profiles need notifications',
        emailsSent: 0,
      });
    }

    let emailsSent = 0;
    let errors = [];

    for (const profile of profiles) {
      // Get unsent matches for this profile
      const { data: matches, error: matchError } = await supabase
        .from('grant_matches')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('status', 'new')
        .order('match_score', { ascending: false })
        .limit(20);

      if (matchError) {
        console.error('Error fetching matches for profile:', profile.id, matchError);
        errors.push({ profileId: profile.id, error: matchError.message });
        continue;
      }

      if (!matches || matches.length === 0) {
        continue; // No new matches for this profile
      }

      // Generate and send email
      const subject = `${matches.length} New Grant${matches.length !== 1 ? 's' : ''} Match Your Profile - Grant Search Tool`;
      const html = generateEmailHTML(profile, matches);

      if (testMode) {
        console.log('Test mode - would send email to:', profile.email);
        emailsSent++;
      } else {
        const emailResult = await sendEmail(profile.email, subject, html);

        if (emailResult.success) {
          // Update matches as sent
          const matchIds = matches.map(m => m.id);
          await supabase
            .from('grant_matches')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .in('id', matchIds);

          // Log the notification
          await supabase.from('notification_log').insert({
            profile_id: profile.id,
            email: profile.email,
            notification_type: frequency || 'manual',
            grants_included: matches.length,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          // Update last notification time
          await supabase
            .from('agency_profiles')
            .update({ last_notification_sent: new Date().toISOString() })
            .eq('id', profile.id);

          emailsSent++;
        } else {
          errors.push({ profileId: profile.id, error: emailResult.error });

          // Log failed notification
          await supabase.from('notification_log').insert({
            profile_id: profile.id,
            email: profile.email,
            notification_type: frequency || 'manual',
            grants_included: matches.length,
            status: 'failed',
            error_message: emailResult.error,
          });
        }
      }
    }

    return Response.json({
      success: true,
      profilesProcessed: profiles.length,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sent ${emailsSent} notification${emailsSent !== 1 ? 's' : ''}`,
    });

  } catch (error) {
    console.error('Notification error:', error);
    return Response.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}

// GET - Preview notification for a profile
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return Response.json({ error: 'Email required' }, { status: 400 });
  }

  if (!supabase) {
    return Response.json({
      preview: '<p>Supabase not configured</p>',
      matchCount: 0,
    });
  }

  try {
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('agency_profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (profileError || !profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get recent matches
    const { data: matches } = await supabase
      .from('grant_matches')
      .select('*')
      .eq('profile_id', profile.id)
      .order('match_score', { ascending: false })
      .limit(10);

    const html = generateEmailHTML(profile, matches || []);

    return Response.json({
      preview: html,
      matchCount: matches?.length || 0,
      profile: {
        organizationName: profile.organization_name,
        notificationFrequency: profile.notification_frequency,
        lastNotificationSent: profile.last_notification_sent,
      },
    });

  } catch (error) {
    console.error('Preview error:', error);
    return Response.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}
