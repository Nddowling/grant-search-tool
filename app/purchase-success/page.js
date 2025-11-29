'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTemplateById } from '../../lib/templates';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

// Inner component that uses useSearchParams
function PurchaseSuccessContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [template, setTemplate] = useState(null);
  const [customTemplate, setCustomTemplate] = useState(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    const templateId = searchParams.get('template');
    const sessionId = searchParams.get('session_id');
    const isMock = searchParams.get('mock');
    const promoCode = searchParams.get('promo');
    const type = searchParams.get('type');
    const encodedData = searchParams.get('data');

    // Check if this is a custom template
    if (type === 'custom') {
      setIsCustom(true);

      // Try to get custom template from URL params first (for promo/mock)
      if (encodedData) {
        try {
          const templateData = JSON.parse(decodeURIComponent(encodedData));
          setCustomTemplate(templateData);
          setStatus('success');
          setDownloadReady(true);
          return;
        } catch (e) {
          console.error('Failed to parse custom template data:', e);
        }
      }

      // Try localStorage (for Stripe redirect)
      const storedTemplate = localStorage.getItem('pendingCustomTemplate');
      if (storedTemplate) {
        try {
          const templateData = JSON.parse(storedTemplate);
          setCustomTemplate(templateData);
          // Clean up localStorage after retrieving
          localStorage.removeItem('pendingCustomTemplate');
        } catch (e) {
          console.error('Failed to parse stored custom template:', e);
        }
      }
    } else if (templateId) {
      // Standard template
      const templateData = getTemplateById(templateId);
      setTemplate(templateData);
    }

    // If mock mode (Stripe not configured), show success immediately
    if (isMock) {
      setStatus('success');
      setDownloadReady(true);
      return;
    }

    // If promo code was used (free checkout), show success immediately
    if (promoCode) {
      console.log(`Template accessed with promo code: ${promoCode}`);
      setStatus('success');
      setDownloadReady(true);
      return;
    }

    // Verify payment with Stripe
    if (sessionId) {
      fetch(`/api/checkout?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStatus('success');
            setDownloadReady(true);
          } else {
            setStatus('error');
          }
        })
        .catch(() => setStatus('error'));
    } else if (!templateId && !type) {
      setStatus('error');
    }
  }, [searchParams]);

  const handleDownload = async () => {
    try {
      let doc;
      let filename;

      if (isCustom && customTemplate) {
        doc = generateCustomWordDocument(customTemplate);
        filename = `custom-grant-template-${Date.now()}.docx`;
      } else if (template) {
        doc = generateWordDocument(template);
        filename = `${template.id}-template.docx`;
      } else {
        alert('No template data available');
        return;
      }

      const blob = await Packer.toBlob(doc);
      saveAs(blob, filename);
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Error generating document. Please try again.');
    }
  };

  const displayTemplate = isCustom ? customTemplate : template;
  const hasTemplate = isCustom ? !!customTemplate : !!template;

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
      {status === 'loading' && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Confirming your purchase...</p>
        </div>
      )}

      {status === 'success' && hasTemplate && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            {isCustom ? (
              <span className="text-3xl">✨</span>
            ) : (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isCustom ? 'Your Custom Template is Ready!' : 'Purchase Successful!'}
          </h1>
          <p className="text-gray-600 mb-8">
            {isCustom
              ? 'Your AI-generated custom template is ready for download.'
              : 'Thank you for your purchase. Your template is ready for download.'
            }
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <h2 className="font-semibold text-gray-900 mb-2">
              {isCustom ? customTemplate?.templateTitle : template?.name}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {isCustom ? customTemplate?.grantSummary : template?.description}
            </p>

            <div className="text-sm text-gray-500">
              {isCustom ? (
                <>
                  <p>{customTemplate?.sections?.length || 0} custom sections</p>
                  <p>{customTemplate?.checklist?.length || 0} checklist items</p>
                  {customTemplate?.timeline?.length > 0 && (
                    <p>{customTemplate.timeline.length} timeline milestones</p>
                  )}
                </>
              ) : (
                <>
                  <p>{template?.sections?.length} guided sections</p>
                  <p>{template?.checklist?.length} checklist items</p>
                </>
              )}
            </div>

            {/* Show grant metadata for custom templates */}
            {isCustom && customTemplate?.grantMetadata && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Created for:</p>
                <p className="text-sm font-medium text-gray-700">
                  {customTemplate.grantMetadata.agency} - {customTemplate.grantMetadata.title?.slice(0, 50)}...
                </p>
              </div>
            )}
          </div>

          {downloadReady && (
            <button
              onClick={handleDownload}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold mb-4 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Word Document (.docx)
            </button>
          )}

          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Grant Search
          </a>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">
            We couldn't confirm your purchase. If you were charged, please contact support.
          </p>

          <a
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium"
          >
            Back to Home
          </a>
        </div>
      )}
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function PurchaseSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      <Suspense fallback={<LoadingFallback />}>
        <PurchaseSuccessContent />
      </Suspense>
    </main>
  );
}

// Generate a Word document from a standard template
function generateWordDocument(template) {
  const children = [];

  children.push(
    new Paragraph({
      text: template.name,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: template.description,
          italics: true,
          color: '666666',
        }),
      ],
      spacing: { after: 400 },
    })
  );

  template.sections.forEach((section, index) => {
    children.push(
      new Paragraph({
        text: `${index + 1}. ${section.title}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Guidance: ', bold: true, color: '1e40af' }),
          new TextRun({ text: section.guidance, color: '1e40af' }),
        ],
        spacing: { after: 200 },
        shading: { fill: 'e0f2fe' },
        indent: { left: 200, right: 200 },
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Key Questions to Address:', bold: true })],
        spacing: { before: 200, after: 100 },
      })
    );

    section.prompts.forEach(prompt => {
      children.push(
        new Paragraph({
          text: prompt,
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
    });

    children.push(
      new Paragraph({
        children: [new TextRun({ text: '[Write your response here]', italics: true, color: '999999' })],
        spacing: { before: 200, after: 100 },
        border: {
          top: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
          bottom: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
          left: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
          right: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
        },
      })
    );

    for (let i = 0; i < 10; i++) {
      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    }
  });

  children.push(
    new Paragraph({
      text: 'Required Documents Checklist',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 200 },
    })
  );

  template.checklist.forEach(item => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '☐  ', font: 'Segoe UI Symbol' }),
          new TextRun({ text: item }),
        ],
        spacing: { after: 100 },
      })
    );
  });

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Template provided by Grant Search Tool. Good luck with your application!',
          italics: true,
          color: '999999',
          size: 20,
        }),
      ],
      spacing: { before: 600 },
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'dddddd' } },
    })
  );

  return new Document({ sections: [{ properties: {}, children }] });
}

// Generate a Word document from a custom AI-generated template
function generateCustomWordDocument(template) {
  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: template.templateTitle || 'Custom Grant Application Template',
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  // Grant metadata
  if (template.grantMetadata) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Grant: ', bold: true }),
          new TextRun({ text: template.grantMetadata.title || 'N/A' }),
        ],
        spacing: { after: 50 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Agency: ', bold: true }),
          new TextRun({ text: template.grantMetadata.agency || 'N/A' }),
        ],
        spacing: { after: 50 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Deadline: ', bold: true }),
          new TextRun({ text: template.grantMetadata.deadline || 'N/A' }),
        ],
        spacing: { after: 50 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Funding: ', bold: true }),
          new TextRun({ text: template.grantMetadata.amount || 'N/A' }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Summary
  if (template.grantSummary) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: template.grantSummary, italics: true, color: '666666' })],
        spacing: { after: 400 },
      })
    );
  }

  // Key Requirements
  if (template.keyRequirements?.length > 0) {
    children.push(
      new Paragraph({
        text: 'Key Requirements',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 },
      })
    );
    template.keyRequirements.forEach(req => {
      children.push(
        new Paragraph({
          text: req,
          bullet: { level: 0 },
          spacing: { after: 50 },
        })
      );
    });
  }

  // Agency Insights
  if (template.agencyInsights) {
    children.push(
      new Paragraph({
        text: 'Agency Insights',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 100 },
      })
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: template.agencyInsights, color: '7c3aed' })],
        spacing: { after: 200 },
        shading: { fill: 'faf5ff' },
        indent: { left: 200, right: 200 },
      })
    );
  }

  // Sections
  if (template.sections?.length > 0) {
    template.sections.forEach((section, index) => {
      children.push(
        new Paragraph({
          text: `${index + 1}. ${section.title}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 100 },
        })
      );

      if (section.estimatedLength) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Recommended length: ${section.estimatedLength}`, italics: true, color: '6b7280' })],
            spacing: { after: 100 },
          })
        );
      }

      // Guidance
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Guidance: ', bold: true, color: '1e40af' }),
            new TextRun({ text: section.guidance, color: '1e40af' }),
          ],
          spacing: { after: 150 },
          shading: { fill: 'e0f2fe' },
          indent: { left: 200, right: 200 },
        })
      );

      // Tips
      if (section.tips) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '💡 Pro Tip: ', bold: true, color: '059669' }),
              new TextRun({ text: section.tips, color: '059669' }),
            ],
            spacing: { after: 150 },
            shading: { fill: 'ecfdf5' },
            indent: { left: 200, right: 200 },
          })
        );
      }

      // Prompts
      if (section.prompts?.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'Key Questions to Address:', bold: true })],
            spacing: { before: 150, after: 100 },
          })
        );
        section.prompts.forEach(prompt => {
          children.push(
            new Paragraph({
              text: prompt,
              bullet: { level: 0 },
              spacing: { after: 50 },
            })
          );
        });
      }

      // Writing area
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '[Write your response here]', italics: true, color: '999999' })],
          spacing: { before: 200, after: 100 },
          border: {
            top: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
            bottom: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
            left: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
            right: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
          },
        })
      );

      for (let i = 0; i < 8; i++) {
        children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      }
    });
  }

  // Timeline
  if (template.timeline?.length > 0) {
    children.push(
      new Paragraph({
        text: 'Suggested Timeline',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 200 },
      })
    );
    template.timeline.forEach(item => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Week ${item.weeksBeforeDeadline}: `, bold: true }),
            new TextRun({ text: item.milestone }),
            item.description ? new TextRun({ text: ` - ${item.description}`, italics: true, color: '6b7280' }) : new TextRun({ text: '' }),
          ],
          spacing: { after: 100 },
        })
      );
    });
  }

  // Budget Guidance
  if (template.budgetGuidance?.overview) {
    children.push(
      new Paragraph({
        text: 'Budget Guidance',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 200 },
      })
    );
    children.push(
      new Paragraph({
        text: template.budgetGuidance.overview,
        spacing: { after: 150 },
      })
    );
    if (template.budgetGuidance.categories?.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Typical Budget Categories:', bold: true })],
          spacing: { after: 100 },
        })
      );
      template.budgetGuidance.categories.forEach(cat => {
        children.push(
          new Paragraph({
            text: cat,
            bullet: { level: 0 },
            spacing: { after: 50 },
          })
        );
      });
    }
    if (template.budgetGuidance.tips?.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Budget Tips:', bold: true })],
          spacing: { before: 150, after: 100 },
        })
      );
      template.budgetGuidance.tips.forEach(tip => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${tip}`, color: '059669' })],
            spacing: { after: 50 },
          })
        );
      });
    }
  }

  // Checklist
  if (template.checklist?.length > 0) {
    children.push(
      new Paragraph({
        text: 'Required Documents Checklist',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 200 },
      })
    );
    template.checklist.forEach(item => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '☐  ', font: 'Segoe UI Symbol' }),
            new TextRun({ text: item }),
          ],
          spacing: { after: 100 },
        })
      );
    });
  }

  // Footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Custom template generated by Grant Search Tool AI. Good luck with your application!',
          italics: true,
          color: '999999',
          size: 20,
        }),
      ],
      spacing: { before: 600 },
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'dddddd' } },
    })
  );

  return new Document({ sections: [{ properties: {}, children }] });
}
