/**
 * Grant Application Template Library
 *
 * Each template includes:
 * - Metadata (name, description, price, grant types it applies to)
 * - Sections with guidance and sample content
 * - Checklist of required documents
 */

export const TEMPLATE_LIBRARY = [
  {
    id: 'federal-general',
    name: 'Federal Grant Application Template',
    description: 'Comprehensive template for federal grants including Grants.gov, SAM.gov, and agency-specific opportunities. Includes all standard SF-424 form guidance.',
    price: 849, // $8.49 in cents
    category: 'federal',
    applicableSources: ['grants_gov', 'sam_gov', 'usaspending'],
    popular: true,
    sections: [
      {
        title: 'Executive Summary',
        guidance: 'A 1-page overview of your project that captures the essence of your proposal. This is often the first (and sometimes only) section reviewers read carefully.',
        prompts: [
          'What problem are you solving?',
          'What is your proposed solution?',
          'Who will benefit and how?',
          'What are your key objectives and timeline?',
          'What is your total budget request?'
        ]
      },
      {
        title: 'Statement of Need',
        guidance: 'Demonstrate the problem exists, is significant, and requires intervention. Use data, statistics, and real examples.',
        prompts: [
          'What data proves this problem exists?',
          'Who is affected and how severely?',
          'What happens if nothing is done?',
          'Why is your organization positioned to address this?'
        ]
      },
      {
        title: 'Project Narrative',
        guidance: 'Detailed description of what you will do, how, and why this approach will work.',
        prompts: [
          'What specific activities will you undertake?',
          'What is your methodology?',
          'What evidence supports this approach?',
          'How does this align with the funder\'s priorities?'
        ]
      },
      {
        title: 'Goals, Objectives & Outcomes',
        guidance: 'SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) with clear success metrics.',
        prompts: [
          'What are your 2-3 main goals?',
          'What specific objectives support each goal?',
          'How will you measure success?',
          'What outcomes do you expect at 6 months, 1 year, 3 years?'
        ]
      },
      {
        title: 'Project Timeline',
        guidance: 'Month-by-month or quarter-by-quarter breakdown of activities and milestones.',
        prompts: [
          'What are your major milestones?',
          'What activities happen in each phase?',
          'Who is responsible for each activity?',
          'What are your go/no-go decision points?'
        ]
      },
      {
        title: 'Organizational Capacity',
        guidance: 'Prove your organization can successfully execute this project.',
        prompts: [
          'What is your organization\'s mission and history?',
          'What relevant experience do you have?',
          'Who are your key personnel and what are their qualifications?',
          'What infrastructure/resources do you have in place?'
        ]
      },
      {
        title: 'Budget & Budget Narrative',
        guidance: 'Detailed line-item budget with justification for each expense.',
        prompts: [
          'Personnel costs (salaries, benefits, % time)',
          'Equipment and supplies',
          'Travel and training',
          'Contractual/consultant costs',
          'Indirect costs (if applicable)',
          'Cost share/matching funds (if required)'
        ]
      },
      {
        title: 'Evaluation Plan',
        guidance: 'How you will track progress and measure impact.',
        prompts: [
          'What data will you collect?',
          'How and when will you collect it?',
          'Who will analyze the data?',
          'How will you use findings to improve?'
        ]
      },
      {
        title: 'Sustainability Plan',
        guidance: 'How the project/impact will continue after grant funding ends.',
        prompts: [
          'What funding sources will you pursue?',
          'How will activities be maintained?',
          'What partnerships support long-term success?'
        ]
      }
    ],
    checklist: [
      'SF-424 Application for Federal Assistance',
      'SF-424A Budget Information (Non-Construction)',
      'SF-424B Assurances (Non-Construction)',
      'Project Narrative (max pages per NOFO)',
      'Budget Narrative/Justification',
      'Organizational Chart',
      'Key Personnel Resumes/CVs',
      'Letters of Support/Commitment',
      'Indirect Cost Rate Agreement (if applicable)',
      'SAM.gov registration confirmation',
      'Grants.gov registration confirmation'
    ]
  },
  {
    id: 'nih-research',
    name: 'NIH Research Grant Template (R01/R21)',
    description: 'Specialized template for NIH research grants. Includes guidance on Specific Aims, Research Strategy, and NIH-specific requirements.',
    price: 849, // $8.49
    category: 'research',
    applicableSources: ['nih', 'federal_reporter'],
    popular: true,
    sections: [
      {
        title: 'Specific Aims',
        guidance: 'One page that hooks reviewers and clearly states what you will do. This is the most important page of your application.',
        prompts: [
          'Opening paragraph: What is the problem and why does it matter?',
          'What is the gap in knowledge your research addresses?',
          'What is your central hypothesis?',
          'What are your 2-3 specific aims?',
          'What is the expected impact/payoff?'
        ]
      },
      {
        title: 'Research Strategy - Significance',
        guidance: 'Why does this research matter? What will change if you succeed?',
        prompts: [
          'What important problem does this address?',
          'How will scientific knowledge advance?',
          'What is the potential clinical/practical impact?',
          'How does this fit NIH priorities?'
        ]
      },
      {
        title: 'Research Strategy - Innovation',
        guidance: 'What is new and creative about your approach?',
        prompts: [
          'How does this challenge existing paradigms?',
          'What new methods, technologies, or concepts are you using?',
          'How is this different from what others are doing?'
        ]
      },
      {
        title: 'Research Strategy - Approach',
        guidance: 'Detailed description of your experimental design and methods.',
        prompts: [
          'Preliminary data supporting feasibility',
          'Detailed methods for each aim',
          'Expected outcomes and interpretation',
          'Potential problems and alternative approaches',
          'Timeline and milestones'
        ]
      },
      {
        title: 'Vertebrate Animals / Human Subjects',
        guidance: 'Required sections if your research involves animals or human participants.',
        prompts: [
          'Species and justification',
          'Procedures and minimizing discomfort',
          'IACUC/IRB approval status'
        ]
      }
    ],
    checklist: [
      'SF-424 (R&R) Cover Page',
      'Project Summary/Abstract (30 lines max)',
      'Project Narrative (2-3 sentences for public)',
      'Specific Aims (1 page)',
      'Research Strategy (R01: 12 pages, R21: 6 pages)',
      'Bibliography & References Cited',
      'Facilities & Other Resources',
      'Equipment',
      'Biographical Sketches (all key personnel)',
      'Budget and Justification',
      'Letters of Support',
      'Resource Sharing Plan',
      'Authentication of Key Biological Resources'
    ]
  },
  {
    id: 'nsf-research',
    name: 'NSF Research Grant Template',
    description: 'Template for National Science Foundation proposals. Includes guidance on Broader Impacts and Intellectual Merit criteria.',
    price: 849, // $8.49
    category: 'research',
    applicableSources: ['nsf'],
    sections: [
      {
        title: 'Project Summary',
        guidance: 'One-page summary with three distinct sections: Overview, Intellectual Merit, and Broader Impacts.',
        prompts: [
          'Overview: What will you do? (1 paragraph)',
          'Intellectual Merit: What is the potential to advance knowledge?',
          'Broader Impacts: What is the potential benefit to society?'
        ]
      },
      {
        title: 'Project Description',
        guidance: 'The main body of your proposal (15 pages max for most programs).',
        prompts: [
          'Introduction and background',
          'Specific objectives',
          'Research plan and methods',
          'Timeline and milestones',
          'Broader impacts activities',
          'Results from prior NSF support (if applicable)'
        ]
      },
      {
        title: 'Broader Impacts',
        guidance: 'NSF weighs this equally with Intellectual Merit. Be specific and creative.',
        prompts: [
          'How will this benefit society?',
          'Education and outreach activities',
          'Broadening participation of underrepresented groups',
          'Infrastructure for research and education',
          'Dissemination to enhance scientific understanding'
        ]
      }
    ],
    checklist: [
      'Cover Sheet',
      'Project Summary (1 page)',
      'Project Description (15 pages)',
      'References Cited',
      'Biographical Sketches (2 pages each)',
      'Budget and Justification',
      'Current and Pending Support',
      'Facilities, Equipment & Other Resources',
      'Data Management Plan (2 pages)',
      'Postdoctoral Mentoring Plan (if applicable)',
      'Letters of Collaboration'
    ]
  },
  {
    id: 'nonprofit-foundation',
    name: 'Foundation Grant Template',
    description: 'Template for private foundation grants. Shorter format focused on impact, outcomes, and organizational credibility.',
    price: 849, // $8.49
    category: 'nonprofit',
    applicableSources: ['propublica'],
    sections: [
      {
        title: 'Letter of Inquiry (LOI)',
        guidance: 'Many foundations require a brief LOI before full proposal. Keep it to 1-2 pages.',
        prompts: [
          'Brief organizational description',
          'Problem you\'re addressing',
          'Proposed solution (high-level)',
          'Amount requested and project timeline',
          'Why this foundation is a good fit'
        ]
      },
      {
        title: 'Organizational Background',
        guidance: 'Who you are and why you\'re credible.',
        prompts: [
          'Mission and history',
          'Key accomplishments',
          'Geographic reach and population served',
          'Annual budget and funding sources'
        ]
      },
      {
        title: 'Problem Statement',
        guidance: 'The need your project addresses. Use local data when possible.',
        prompts: [
          'What is the problem?',
          'Who is affected?',
          'What are the root causes?',
          'What data supports the need?'
        ]
      },
      {
        title: 'Project Description',
        guidance: 'What you will do with the grant funds.',
        prompts: [
          'Specific activities and services',
          'Target population and how you\'ll reach them',
          'Staff and partners involved',
          'Timeline'
        ]
      },
      {
        title: 'Outcomes & Evaluation',
        guidance: 'How you\'ll know if you succeeded.',
        prompts: [
          'What will change as a result?',
          'How many people will be served?',
          'What metrics will you track?',
          'How will you collect data?'
        ]
      },
      {
        title: 'Budget',
        guidance: 'Simple budget showing how funds will be used.',
        prompts: [
          'Personnel',
          'Program costs',
          'Administrative/overhead',
          'Other funding sources for this project'
        ]
      }
    ],
    checklist: [
      'Cover letter',
      'Proposal narrative',
      'Project budget',
      'Organizational budget',
      'Board of Directors list',
      '501(c)(3) determination letter',
      'Most recent audit or financial statements',
      'Annual report (if available)',
      'Key staff resumes'
    ]
  },
  {
    id: 'sbir-sttr',
    name: 'SBIR/STTR Application Template',
    description: 'Template for Small Business Innovation Research and Small Business Technology Transfer grants. Phase I and II guidance included.',
    price: 849, // $8.49
    category: 'business',
    applicableSources: ['grants_gov', 'sam_gov', 'nih', 'nsf'],
    sections: [
      {
        title: 'Specific Aims / Technical Objectives',
        guidance: 'Clear statement of what you will accomplish and how it addresses the agency\'s needs.',
        prompts: [
          'What problem are you solving?',
          'What is your proposed innovation?',
          'What are your specific technical objectives?',
          'What is the commercial potential?'
        ]
      },
      {
        title: 'Significance & Background',
        guidance: 'Why this matters and what exists today.',
        prompts: [
          'Current state of the art',
          'Limitations of existing solutions',
          'Your unique approach',
          'Why now? (market timing, technology readiness)'
        ]
      },
      {
        title: 'Research Plan',
        guidance: 'Technical details of what you will do.',
        prompts: [
          'Technical approach and methods',
          'Preliminary data or proof of concept',
          'Key milestones and go/no-go criteria',
          'Risk mitigation strategies'
        ]
      },
      {
        title: 'Commercialization Plan',
        guidance: 'How you will bring this to market (especially important for Phase II).',
        prompts: [
          'Target market and size',
          'Competitive landscape',
          'Business model',
          'Path to market (regulatory, partnerships, etc.)',
          'Team\'s commercialization experience'
        ]
      },
      {
        title: 'Company & Team',
        guidance: 'Demonstrate you can execute.',
        prompts: [
          'Company background and capabilities',
          'Key personnel qualifications',
          'Facilities and equipment',
          'Prior SBIR/STTR awards and outcomes'
        ]
      }
    ],
    checklist: [
      'Cover page with SBIR/STTR designation',
      'Technical proposal',
      'Commercialization plan',
      'Budget and justification',
      'Biographical sketches',
      'Current and pending support',
      'Facilities and equipment',
      'Subcontractor documents (STTR: research institution)',
      'Letters of support/commitment',
      'Company registration documents',
      'SBA company registry confirmation'
    ]
  },
  {
    id: 'fema-disaster',
    name: 'FEMA Disaster & Mitigation Grant Template',
    description: 'Template for FEMA programs including BRIC, HMGP, and PDM. Includes benefit-cost analysis guidance.',
    price: 849, // $8.49
    category: 'government',
    applicableSources: ['fema'],
    sections: [
      {
        title: 'Project Description',
        guidance: 'Clear description of the mitigation activity and scope.',
        prompts: [
          'What hazard(s) are you mitigating?',
          'What is the proposed project?',
          'What is the project location and scope?',
          'What is the current condition?'
        ]
      },
      {
        title: 'Hazard Analysis',
        guidance: 'Document the risk your project addresses.',
        prompts: [
          'Historical hazard events',
          'Probability of future events',
          'Vulnerable structures and population',
          'Current level of protection'
        ]
      },
      {
        title: 'Scope of Work',
        guidance: 'Detailed work breakdown.',
        prompts: [
          'Specific activities and tasks',
          'Engineering/technical specifications',
          'Timeline and milestones',
          'Responsible parties'
        ]
      },
      {
        title: 'Benefit-Cost Analysis',
        guidance: 'FEMA requires BCA showing benefits exceed costs (BCR > 1.0).',
        prompts: [
          'Estimated project cost',
          'Expected damage reduction',
          'Lives protected',
          'Economic benefits',
          'Useful life of project'
        ]
      },
      {
        title: 'Environmental & Historic Preservation',
        guidance: 'Required for all FEMA projects.',
        prompts: [
          'Environmental impacts',
          'Historic properties affected',
          'Required permits',
          'Mitigation measures'
        ]
      }
    ],
    checklist: [
      'SF-424 Application',
      'Project narrative',
      'Scope of work',
      'Cost estimate with backup documentation',
      'Benefit-Cost Analysis',
      'Property data/inventory',
      'Maps (FIRM, project location)',
      'Photos of existing conditions',
      'Environmental/historic documentation',
      'Local mitigation plan documentation',
      'State/local approvals'
    ]
  }
];

// Helper to find applicable templates for a grant
export function getTemplatesForGrant(grant) {
  const source = grant.source?.toLowerCase() || '';

  return TEMPLATE_LIBRARY.filter(template =>
    template.applicableSources.some(s => source.includes(s))
  );
}

// Get template by ID
export function getTemplateById(id) {
  return TEMPLATE_LIBRARY.find(t => t.id === id);
}

// Get all templates in a category
export function getTemplatesByCategory(category) {
  return TEMPLATE_LIBRARY.filter(t => t.category === category);
}

// Format price for display
export function formatTemplatePrice(priceInCents) {
  return `$${(priceInCents / 100).toFixed(2)}`;
}
