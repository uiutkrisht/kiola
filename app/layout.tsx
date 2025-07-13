'use client';

import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';
import { ErrorBoundary } from 'react-error-boundary';

const inter = Inter({ subsets: ['latin'] });

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 bg-red-50 text-red-700 rounded-lg">
      <h2 className="font-bold">Something went wrong:</h2>
      <p className="mb-2">{error.message}</p>
      <button 
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Reload Page
      </button>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Providers>
            <div className="min-h-screen">
              {children}
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}