import './globals.css'

export const metadata = {
  title: 'Federal Grant Search | Grants.gov & SAM.gov',
  description: 'Search federal grants and contract opportunities from Grants.gov and SAM.gov in one place',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
