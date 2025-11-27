/**
 * Leads API Route
 * Stores lead capture data from the signup gate
 *
 * In production, this should:
 * - Store to database (Supabase, PostgreSQL)
 * - Send to email service (Resend, SendGrid)
 * - Trigger welcome email sequence
 * - Log to analytics
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, company } = body;

    // Validate required fields
    if (!email || !firstName) {
      return Response.json(
        { error: 'Email and first name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create lead record
    const lead = {
      email: email.toLowerCase().trim(),
      firstName: firstName.trim(),
      lastName: lastName?.trim() || null,
      company: company?.trim() || null,
      source: 'search_gate',
      createdAt: new Date().toISOString(),
      metadata: {
        userAgent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
      }
    };

    // Log the lead (for now - replace with database storage)
    console.log('New lead captured:', JSON.stringify(lead, null, 2));

    // TODO: Store in database
    // const { data, error } = await supabase.from('leads').insert(lead);

    // TODO: Send welcome email
    // await sendWelcomeEmail(lead);

    // TODO: Add to email marketing list
    // await addToMailingList(lead);

    // Generate a simple token for the user session
    // In production, this would create a real user account
    const userToken = Buffer.from(JSON.stringify({
      email: lead.email,
      firstName: lead.firstName,
      createdAt: lead.createdAt
    })).toString('base64');

    return Response.json({
      success: true,
      message: 'Account created successfully',
      user: {
        email: lead.email,
        firstName: lead.firstName,
        token: userToken
      }
    });

  } catch (error) {
    console.error('Lead capture error:', error);
    return Response.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if email exists (for future use)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return Response.json({ error: 'Email required' }, { status: 400 });
  }

  // TODO: Check database for existing user
  // const { data } = await supabase.from('leads').select().eq('email', email.toLowerCase());

  return Response.json({
    exists: false, // Replace with actual check
    message: 'Email check complete'
  });
}
