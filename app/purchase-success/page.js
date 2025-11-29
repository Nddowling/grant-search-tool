'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTemplateById } from '../../lib/templates';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, CheckBox } from 'docx';
import { saveAs } from 'file-saver';

// Inner component that uses useSearchParams
function PurchaseSuccessContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [template, setTemplate] = useState(null);
  const [downloadReady, setDownloadReady] = useState(false);

  useEffect(() => {
    const templateId = searchParams.get('template');
    const sessionId = searchParams.get('session_id');
    const isMock = searchParams.get('mock');
    const promoCode = searchParams.get('promo');

    if (templateId) {
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
    } else if (!templateId) {
      setStatus('error');
    }
  }, [searchParams]);

  const handleDownload = async () => {
    if (!template) return;

    try {
      const doc = generateWordDocument(template);
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${template.id}-template.docx`);
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Error generating document. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
      {status === 'loading' && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Confirming your purchase...</p>
        </div>
      )}

      {status === 'success' && template && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Successful!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for your purchase. Your template is ready for download.
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <h2 className="font-semibold text-gray-900 mb-2">{template.name}</h2>
            <p className="text-sm text-gray-600 mb-4">{template.description}</p>

            <div className="text-sm text-gray-500">
              <p>{template.sections.length} guided sections</p>
              <p>{template.checklist.length} checklist items</p>
            </div>
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
            &larr; Back to Grant Search
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

// Generate a Word document from the template
function generateWordDocument(template) {
  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: template.name,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  // Description
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

  // Sections
  template.sections.forEach((section, index) => {
    // Section heading
    children.push(
      new Paragraph({
        text: `${index + 1}. ${section.title}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Guidance box
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Guidance: ',
            bold: true,
            color: '1e40af',
          }),
          new TextRun({
            text: section.guidance,
            color: '1e40af',
          }),
        ],
        spacing: { after: 200 },
        shading: { fill: 'e0f2fe' },
        indent: { left: 200, right: 200 },
      })
    );

    // Prompts header
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Key Questions to Address:',
            bold: true,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    // Prompts as bullet points
    section.prompts.forEach(prompt => {
      children.push(
        new Paragraph({
          text: prompt,
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
    });

    // Writing area placeholder
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '[Write your response here]',
            italics: true,
            color: '999999',
          }),
        ],
        spacing: { before: 200, after: 100 },
        border: {
          top: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
          bottom: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
          left: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
          right: { style: BorderStyle.DASHED, size: 1, color: 'cccccc' },
        },
      })
    );

    // Empty lines for writing
    for (let i = 0; i < 10; i++) {
      children.push(
        new Paragraph({
          text: '',
          spacing: { after: 100 },
        })
      );
    }
  });

  // Checklist section
  children.push(
    new Paragraph({
      text: 'Required Documents Checklist',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 200 },
    })
  );

  // Checklist items with checkboxes
  template.checklist.forEach(item => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '☐  ',
            font: 'Segoe UI Symbol',
          }),
          new TextRun({
            text: item,
          }),
        ],
        spacing: { after: 100 },
      })
    );
  });

  // Footer
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
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'dddddd' },
      },
    })
  );

  return new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });
}
