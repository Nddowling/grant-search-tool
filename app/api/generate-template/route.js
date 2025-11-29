/**
 * AI-Powered Custom Grant Template Generator
 * Uses Claude to create tailored proposal templates based on specific grant details
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Pricing for custom templates
const CUSTOM_TEMPLATE_PRICE = 9949; // $99.49

export async function POST(request) {
  try {
    const body = await request.json();
    const { grant, email } = body;

    if (!grant) {
      return Response.json({ error: 'Grant data required' }, { status: 400 });
    }

    if (!anthropic) {
      console.error('Anthropic API key not configured');
      return Response.json({
        error: 'AI service not configured',
        message: 'Please add ANTHROPIC_API_KEY to environment variables'
      }, { status: 500 });
    }

    // Build context about the grant
    const grantContext = buildGrantContext(grant);

    // Generate the custom template using Claude
    const templateContent = await generateCustomTemplate(grantContext);

    return Response.json({
      success: true,
      template: templateContent,
      grantTitle: grant.normalizedTitle,
      grantId: grant.normalizedId,
      price: CUSTOM_TEMPLATE_PRICE,
    });

  } catch (error) {
    console.error('Template generation error:', error);
    return Response.json(
      { error: 'Failed to generate template', details: error.message },
      { status: 500 }
    );
  }
}

function buildGrantContext(grant) {
  return {
    title: grant.normalizedTitle || 'Unknown Grant',
    agency: grant.normalizedAgency || 'Unknown Agency',
    description: grant.normalizedDescription || '',
    amount: grant.normalizedAmount || 'Not specified',
    deadline: grant.normalizedDeadline || 'Not specified',
    source: grant.source || 'federal',
    link: grant.normalizedLink || '',
    // Additional fields that might be available
    eligibility: grant.eligibility || grant.applicantTypes || '',
    category: grant.category || grant.fundingCategory || '',
    cfda: grant.cfdaNumber || grant.programNumber || '',
  };
}

async function generateCustomTemplate(grantContext) {
  const prompt = `You are an expert grant writer helping create a customized grant application template.

Based on the following grant opportunity, create a comprehensive, tailored proposal template that applicants can use to write a winning application.

GRANT DETAILS:
- Title: ${grantContext.title}
- Agency: ${grantContext.agency}
- Funding Amount: ${grantContext.amount}
- Deadline: ${grantContext.deadline}
- Source: ${grantContext.source}
- Description: ${grantContext.description}
${grantContext.eligibility ? `- Eligibility: ${grantContext.eligibility}` : ''}
${grantContext.category ? `- Category: ${grantContext.category}` : ''}
${grantContext.cfda ? `- CFDA/Program Number: ${grantContext.cfda}` : ''}

Create a JSON response with the following structure:
{
  "templateTitle": "Custom template title including grant name",
  "grantSummary": "2-3 sentence summary of the opportunity",
  "keyRequirements": ["list of key requirements or focus areas based on the grant"],
  "sections": [
    {
      "title": "Section name",
      "guidance": "Specific guidance for this section tailored to THIS grant",
      "prompts": ["Specific questions to address for THIS grant opportunity"],
      "tips": "Pro tips specific to this agency/grant type",
      "estimatedLength": "Recommended length (e.g., '1-2 pages')"
    }
  ],
  "checklist": ["List of documents likely required for this type of grant"],
  "timeline": [
    {"milestone": "milestone name", "weeksBeforeDeadline": number, "description": "what to complete"}
  ],
  "budgetGuidance": {
    "overview": "Budget approach for this grant",
    "categories": ["typical budget categories for this type of grant"],
    "tips": ["budget-specific tips"]
  },
  "agencyInsights": "Insights about what this agency typically looks for"
}

Make the template HIGHLY SPECIFIC to this grant opportunity. Reference the actual agency, program goals, and likely evaluation criteria. Don't be generic - this should feel like it was written by someone who deeply understands this specific funding opportunity.

For federal grants, include relevant SF-424 form guidance. For NIH, include R01/R21 specific sections. For NSF, emphasize Broader Impacts. Tailor everything to the source and agency.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  // Extract the text content
  const textContent = response.content.find(block => block.type === 'text');
  if (!textContent) {
    throw new Error('No text content in response');
  }

  // Parse the JSON from the response
  let templateData;
  try {
    // Find JSON in the response (it might be wrapped in markdown code blocks)
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      templateData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (parseError) {
    console.error('Failed to parse template JSON:', parseError);
    // Return a fallback structure with the raw content
    templateData = {
      templateTitle: `Custom Template for ${grantContext.title}`,
      grantSummary: grantContext.description.slice(0, 200),
      sections: [
        {
          title: 'AI-Generated Content',
          guidance: textContent.text,
          prompts: [],
          tips: '',
          estimatedLength: 'Variable'
        }
      ],
      checklist: ['Review grant requirements', 'Prepare budget', 'Gather supporting documents'],
      timeline: [],
      budgetGuidance: { overview: '', categories: [], tips: [] },
      agencyInsights: ''
    };
  }

  // Add grant metadata to the template
  templateData.grantMetadata = {
    title: grantContext.title,
    agency: grantContext.agency,
    amount: grantContext.amount,
    deadline: grantContext.deadline,
    source: grantContext.source,
    link: grantContext.link,
  };

  return templateData;
}
