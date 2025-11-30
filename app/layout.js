import './globals.css'

export const metadata = {
  title: 'Grant Search | Kayden & Co Data Solutions',
  description: 'Enterprise grant intelligence platform. Search 10+ federal and state databases including Grants.gov, SAM.gov, NIH, NSF, and more.',
  keywords: 'grants, federal grants, government funding, grant search, SAM.gov, Grants.gov, NIH grants, NSF grants',
  authors: [{ name: 'Kayden & Co Data Solutions' }],
  openGraph: {
    title: 'Grant Search | Kayden & Co Data Solutions',
    description: 'Enterprise grant intelligence platform. Search 10+ federal and state databases.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
