'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTemplateById } from '../../lib/templates';

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

  const handleDownload = () => {
    if (!template) return;

    const content = generateTemplateDocument(template);
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.id}-template.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              Download Template
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

// Generate an HTML document from the template
function generateTemplateDocument(template) {
  const sectionsHtml = template.sections.map(section => `
    <div class="section">
      <h2>${section.title}</h2>
      <div class="guidance">
        <strong>Guidance:</strong> ${section.guidance}
      </div>
      <div class="prompts">
        <strong>Key Questions to Address:</strong>
        <ul>
          ${section.prompts.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>
      <div class="writing-area">
        <p><em>[Write your response here]</em></p>
        <br><br><br><br>
      </div>
    </div>
  `).join('');

  const checklistHtml = template.checklist.map(item =>
    `<li><input type="checkbox"> ${item}</li>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${template.name}</title>
  <style>
    body {
      font-family: 'Georgia', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #1e40af;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 10px;
    }
    h2 {
      color: #1e40af;
      margin-top: 40px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
    }
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .guidance {
      background: #f0f9ff;
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
      border-left: 4px solid #1e40af;
    }
    .prompts {
      background: #fefce8;
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
    }
    .prompts ul {
      margin: 10px 0 0 0;
      padding-left: 20px;
    }
    .prompts li {
      margin-bottom: 8px;
    }
    .writing-area {
      border: 1px dashed #ccc;
      padding: 20px;
      border-radius: 8px;
      min-height: 150px;
      background: #fafafa;
    }
    .checklist {
      background: #f0fdf4;
      padding: 20px;
      border-radius: 8px;
    }
    .checklist h2 {
      margin-top: 0;
    }
    .checklist ul {
      list-style: none;
      padding: 0;
    }
    .checklist li {
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .checklist input {
      width: 18px;
      height: 18px;
    }
    @media print {
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>${template.name}</h1>
  <p><em>${template.description}</em></p>

  ${sectionsHtml}

  <div class="checklist">
    <h2>Required Documents Checklist</h2>
    <ul>
      ${checklistHtml}
    </ul>
  </div>

  <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
    <p>Template provided by Grant Search Tool. Good luck with your application!</p>
  </footer>
</body>
</html>
  `;
}
