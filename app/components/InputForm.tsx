'use client';

import { useState } from 'react';
import { ComparisonResult } from '../types';
import ResultViewer from './ResultViewer';

export default function InputForm() {
  const [figmaUrl, setFigmaUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    differences: ComparisonResult[];
    summary: any;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      // Parse Figma frame URL
      const figmaResponse = await fetch('/api/parse-figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameUrl: figmaUrl })
      });

      if (!figmaResponse.ok) {
        throw new Error('Failed to parse Figma design');
      }

      const figmaData = await figmaResponse.json();

      // Analyze live website
      const liveResponse = await fetch('/api/snapshot-dom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: liveUrl })
      });

      if (!liveResponse.ok) {
        throw new Error('Failed to analyze live website');
      }

      const liveData = await liveResponse.json();

      // Compare designs
      const compareResponse = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figmaData, liveData })
      });

      if (!compareResponse.ok) {
        throw new Error('Failed to compare designs');
      }

      const results = await compareResponse.json();
      setResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="url"
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            placeholder="Paste Figma frame URL"
            className="w-full px-4 py-3 text-base rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
            required
          />
        </div>
        <div>
          <input
            type="url"
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
            placeholder="Paste Live Website URL"
            className="w-full px-4 py-3 text-base rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD3] text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
        >
          Compare Designs
        </button>
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {results && !isLoading && (
        <div className="mt-8">
          <ResultViewer
            differences={results.differences}
            summary={results.summary}
          />
        </div>
      )}
    </div>
  );
} 