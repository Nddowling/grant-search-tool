/**
 * Download Template API
 * Converts template JSON to a downloadable Word document format
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dataParam = searchParams.get('data');

  if (!dataParam) {
    return new Response('Template data required', { status: 400 });
  }

  try {
    const templateData = JSON.parse(decodeURIComponent(dataParam));

    // Generate a simple HTML document that can be opened in Word
    const htmlContent = generateWordCompatibleHTML(templateData);

    // Set headers for Word document download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    headers.set('Content-Disposition', `attachment; filename="Grant_Template_${Date.now()}.doc"`);

    return new Response(htmlContent, { headers });
  } catch (error) {
    console.error('Download template error:', error);
    return new Response('Failed to generate document', { status: 500 });
  }
}

function generateWordCompatibleHTML(template) {
  const {
    templateTitle,
    grantSummary,
    keyRequirements,
    sections,
    checklist,
    timeline,
    budgetGuidance,
    agencyInsights,
    grantMetadata
  } = template;

  // Build sections HTML
  const sectionsHTML = (sections || []).map((section, index) => `
    <h2 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 8px; margin-top: 30px;">
      ${index + 1}. ${section.title}
    </h2>
    <div style="background-color: #ebf8ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <strong style="color: #2c5282;">Guidance:</strong>
      <p style="margin: 10px 0; color: #2d3748;">${section.guidance}</p>
    </div>
    ${section.prompts && section.prompts.length > 0 ? `
    <div style="margin: 15px 0;">
      <strong style="color: #2c5282;">Questions to Address:</strong>
      <ul style="margin: 10px 0;">
        ${section.prompts.map(p => `<li style="margin: 5px 0; color: #4a5568;">${p}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    ${section.tips ? `
    <div style="background-color: #fffff0; border-left: 4px solid #ecc94b; padding: 15px; margin: 15px 0;">
      <strong style="color: #744210;">💡 Pro Tip:</strong>
      <p style="margin: 10px 0; color: #744210;">${section.tips}</p>
    </div>
    ` : ''}
    ${section.estimatedLength ? `
    <p style="color: #718096; font-style: italic;">Recommended length: ${section.estimatedLength}</p>
    ` : ''}
    <div style="border: 2px dashed #cbd5e0; padding: 40px; margin: 20px 0; text-align: center; color: #a0aec0;">
      [Your content here]
    </div>
  `).join('');

  // Build checklist HTML
  const checklistHTML = (checklist || []).length > 0 ? `
    <h2 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 8px; margin-top: 30px;">
      Document Checklist
    </h2>
    <ul style="list-style-type: none; padding: 0;">
      ${checklist.map(item => `
        <li style="margin: 10px 0; padding: 10px; background-color: #f7fafc; border-radius: 4px;">
          ☐ ${item}
        </li>
      `).join('')}
    </ul>
  ` : '';

  // Build timeline HTML
  const timelineHTML = (timeline || []).length > 0 ? `
    <h2 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 8px; margin-top: 30px;">
      Recommended Timeline
    </h2>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background-color: #edf2f7;">
          <th style="padding: 12px; text-align: left; border: 1px solid #cbd5e0;">Milestone</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #cbd5e0;">Weeks Before Deadline</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #cbd5e0;">Description</th>
        </tr>
      </thead>
      <tbody>
        ${timeline.map(item => `
          <tr>
            <td style="padding: 12px; border: 1px solid #cbd5e0; font-weight: bold;">${item.milestone}</td>
            <td style="padding: 12px; border: 1px solid #cbd5e0;">${item.weeksBeforeDeadline} weeks</td>
            <td style="padding: 12px; border: 1px solid #cbd5e0;">${item.description}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  // Build budget guidance HTML
  const budgetHTML = budgetGuidance && budgetGuidance.overview ? `
    <h2 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 8px; margin-top: 30px;">
      Budget Guidance
    </h2>
    <p style="margin: 15px 0; color: #4a5568;">${budgetGuidance.overview}</p>
    ${budgetGuidance.categories && budgetGuidance.categories.length > 0 ? `
    <div style="margin: 15px 0;">
      <strong style="color: #2c5282;">Typical Budget Categories:</strong>
      <ul style="margin: 10px 0;">
        ${budgetGuidance.categories.map(cat => `<li style="margin: 5px 0; color: #4a5568;">${cat}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    ${budgetGuidance.tips && budgetGuidance.tips.length > 0 ? `
    <div style="background-color: #f0fff4; border-left: 4px solid #48bb78; padding: 15px; margin: 15px 0;">
      <strong style="color: #276749;">Budget Tips:</strong>
      <ul style="margin: 10px 0;">
        ${budgetGuidance.tips.map(tip => `<li style="margin: 5px 0; color: #276749;">${tip}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${templateTitle || 'Grant Application Template'}</title>
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      line-height: 1.6;
      color: #2d3748;
    }
    @page {
      margin: 1in;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="color: #1a365d; margin-bottom: 10px; font-size: 28px;">
      ${templateTitle || 'Grant Application Template'}
    </h1>
    <p style="color: #718096; font-size: 14px;">
      Generated by Kayden & Co AI Template Engine
    </p>
  </div>

  <!-- Grant Info Box -->
  ${grantMetadata ? `
  <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
    <h3 style="margin-top: 0; color: #2c5282;">Grant Information</h3>
    <table style="width: 100%;">
      <tr>
        <td style="padding: 5px 10px 5px 0; color: #718096; width: 120px;">Agency:</td>
        <td style="padding: 5px 0; font-weight: bold;">${grantMetadata.agency || 'Not specified'}</td>
      </tr>
      <tr>
        <td style="padding: 5px 10px 5px 0; color: #718096;">Award Amount:</td>
        <td style="padding: 5px 0; font-weight: bold;">${grantMetadata.amount || 'Not specified'}</td>
      </tr>
      <tr>
        <td style="padding: 5px 10px 5px 0; color: #718096;">Deadline:</td>
        <td style="padding: 5px 0; font-weight: bold; color: #c53030;">${grantMetadata.deadline || 'Not specified'}</td>
      </tr>
      <tr>
        <td style="padding: 5px 10px 5px 0; color: #718096;">Source:</td>
        <td style="padding: 5px 0;">${grantMetadata.source || 'Federal'}</td>
      </tr>
    </table>
  </div>
  ` : ''}

  <!-- Summary -->
  ${grantSummary ? `
  <div style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 15px; margin-bottom: 30px;">
    <strong style="color: #2c5282;">About This Grant:</strong>
    <p style="margin: 10px 0 0 0; color: #2d3748;">${grantSummary}</p>
  </div>
  ` : ''}

  <!-- Key Requirements -->
  ${keyRequirements && keyRequirements.length > 0 ? `
  <div style="margin-bottom: 30px;">
    <h3 style="color: #2c5282;">Key Requirements</h3>
    <ul>
      ${keyRequirements.map(req => `<li style="margin: 8px 0;">${req}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <!-- Agency Insights -->
  ${agencyInsights ? `
  <div style="background-color: #faf5ff; border-left: 4px solid #805ad5; padding: 15px; margin-bottom: 30px;">
    <strong style="color: #553c9a;">Agency Insights:</strong>
    <p style="margin: 10px 0 0 0; color: #553c9a;">${agencyInsights}</p>
  </div>
  ` : ''}

  <!-- Sections -->
  ${sectionsHTML}

  <!-- Checklist -->
  ${checklistHTML}

  <!-- Timeline -->
  ${timelineHTML}

  <!-- Budget -->
  ${budgetHTML}

  <!-- Footer -->
  <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #a0aec0; font-size: 12px;">
    <p>This template was generated by Kayden & Co Data Solutions AI.</p>
    <p>For questions or support, contact us at support@kaydenco.org</p>
  </div>
</body>
</html>
  `.trim();
}
