'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import type { Issue } from './components/EnhancedResultViewer';

// Types
interface VisualData {
  diffs: any[];
  diffImage: string;
  similarity: number;
  figmaScreenshot: string;
  liveScreenshot: string;
  metadata: {
    width: number;
    height: number;
    figmaDimensions: { width: number; height: number };
    liveDimensions: { width: number; height: number };
  };
  width: number;
  height: number;
}

// Dynamically import client components with no SSR
const AlignaUI = dynamic(() => import('./components/AlignaUI'), { 
  ssr: false,
  loading: () => (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-100 rounded w-full"></div>
        <div className="h-4 bg-gray-100 rounded w-5/6"></div>
      </div>
    </div>
  )
});

const ClientResultViewer = dynamic(
  () => import('./components/client/ClientResultViewer'),
  { 
    ssr: false,
    loading: () => (
      <div className="p-6 border rounded-lg bg-white shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }
);

// Default visual data
const defaultVisualData: VisualData = {
  diffs: [],
  diffImage: '',
  similarity: 0,
  figmaScreenshot: '',
  liveScreenshot: '',
  metadata: {
    width: 0,
    height: 0,
    figmaDimensions: { width: 0, height: 0 },
    liveDimensions: { width: 0, height: 0 }
  },
  width: 0,
  height: 0
};

const defaultIssues: Issue[] = [];

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visualData] = useState<VisualData>(defaultVisualData);
  const [issues] = useState<Issue[]>(defaultIssues);
  const [hasAnalysisRun, setHasAnalysisRun] = useState(false);
  
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  
  const figmaUrl = process.env.NEXT_PUBLIC_FIGMA_URL || 'https://www.figma.com/file/your-file-id';
  const liveUrl = process.env.NEXT_PUBLIC_LIVE_URL || 'https://your-live-website.com';

  // Check authentication and load initial data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (!isLoaded) return;
        
        // Redirect to sign-in if not authenticated
        if (!userId) {
          router.push('/sign-in');
          return;
        }
        
        // Load initial data here if needed
        // await loadInitialData();
        
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize application. Please refresh the page.');
      } finally {
        setIsMounted(true);
        setIsLoading(false);
      }
    };
    
    initializeApp();
  }, [isLoaded, userId, router]);

  // Handle errors in child components
  const handleError = useCallback((error: Error) => {
    console.error('Error in component:', error);
    setError(error.message);
  }, []);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Show loading state
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md p-6 bg-red-50 rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-700 mb-4">Something went wrong</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={resetError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <div className="container mx-auto px-4 py-8 min-h-0">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Design to Code Validation</h1>
          <p className="text-gray-600 mt-1">Compare and validate your designs against live websites</p>
        </header>
        
        <div className="space-y-6">
          <section className="bg-white rounded-lg shadow-sm border p-5">
            <h2 className="text-lg font-semibold mb-3">Configuration</h2>
            <AlignaUI onAnalysisComplete={() => setHasAnalysisRun(true)} />
          </section>
          
          {hasAnalysisRun && (
            <section className="bg-white rounded-lg shadow-sm border p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Results</h2>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Refresh Results
                </button>
              </div>
              <ClientResultViewer
                visualData={visualData}
                issues={issues}
                figmaUrl={figmaUrl}
                liveUrl={liveUrl}
              />
            </section>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}