'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { VisualComparisonData } from '../../types';
import type { Issue } from '../EnhancedResultViewer';

// Dynamically import the EnhancedResultViewer with no SSR and error handling
const EnhancedResultViewer = dynamic(
  () => import('../EnhancedResultViewer').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => <div className="p-4 text-gray-500">Loading viewer...</div>
  }
);

interface ClientResultViewerProps {
  visualData: VisualComparisonData;
  issues: Issue[];
  figmaUrl: string;
  liveUrl: string;
}

export default function ClientResultViewer({
  visualData,
  issues,
  figmaUrl,
  liveUrl,
}: ClientResultViewerProps) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set mounted state after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle potential errors in the child component
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        <p>Error loading viewer: {error}</p>
        <button 
          onClick={() => setError(null)}
          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Only render the component on the client side
  if (!mounted) {
    return <div className="p-4 text-gray-500">Initializing viewer...</div>;
  }

  return (
    <div className="w-full h-full">
      <EnhancedResultViewer
        visualData={visualData}
        issues={issues}
        figmaUrl={figmaUrl}
        liveUrl={liveUrl}
      />
    </div>
  );
}
