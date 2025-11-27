/**
 * Leads API Route
 * Stores lead capture data to Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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

    const normalizedEmail = email.toLowerCase().trim();

    // Check if Supabase is configured
    if (!supabase) {
      console.warn('Supabase not configured - storing lead in logs only');
      console.log('Lead data:', { email: normalizedEmail, firstName, lastName, company });

      // Return success anyway for development
      return Response.json({
        success: true,
        message: 'Account created (Supabase not configured)',
        user: {
          email: normalizedEmail,
          firstName: firstName.trim(),
          lastName: lastName?.trim() || null,
          company: company?.trim() || null,
          createdAt: new Date().toISOString(),
        }
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('leads')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      // User already exists - return their data
      return Response.json({
        success: true,
        message: 'Welcome back!',
        user: {
          email: existingUser.email,
          firstName: existingUser.first_name,
          lastName: existingUser.last_name,
          company: existingUser.company,
          createdAt: existingUser.created_at,
        },
        isExisting: true,
      });
    }

    // Create new lead record
    const leadData = {
      email: normalizedEmail,
      first_name: firstName.trim(),
      last_name: lastName?.trim() || null,
      company: company?.trim() || null,
      source: 'search_gate',
      user_agent: request.headers.get('user-agent'),
      referrer: request.headers.get('referer'),
    };

    const { data: newLead, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return Response.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    // Generate a simple token for the user session
    const userToken = Buffer.from(JSON.stringify({
      email: newLead.email,
      firstName: newLead.first_name,
      createdAt: newLead.created_at
    })).toString('base64');

    return Response.json({
      success: true,
      message: 'Account created successfully',
      user: {
        email: newLead.email,
        firstName: newLead.first_name,
        lastName: newLead.last_name,
        company: newLead.company,
        createdAt: newLead.created_at,
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

// GET endpoint to check if email exists (for login)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return Response.json({ error: 'Email required' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if Supabase is configured
  if (!supabase) {
    return Response.json({
      exists: false,
      message: 'Supabase not configured'
    });
  }

  try {
    const { data: user, error } = await supabase
      .from('leads')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error || !user) {
      return Response.json({
        exists: false,
        message: 'Email not found'
      });
    }

    return Response.json({
      exists: true,
      user: {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        createdAt: user.created_at,
      },
      message: 'User found'
    });
  } catch (error) {
    console.error('Email lookup error:', error);
    return Response.json({
      exists: false,
      message: 'Lookup failed'
    });
  }
}
