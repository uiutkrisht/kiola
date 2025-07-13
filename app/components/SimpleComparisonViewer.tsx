'use client';

import React, { useState } from 'react';
import { VisualComparisonData } from '../types';

interface SimpleComparisonViewerProps {
  visualData: VisualComparisonData;
}

const SimpleComparisonViewer: React.FC<SimpleComparisonViewerProps> = ({ visualData }) => {
  const [figmaImageLoaded, setFigmaImageLoaded] = useState(false);
  const [liveImageLoaded, setLiveImageLoaded] = useState(false);
  const [figmaImageError, setFigmaImageError] = useState(false);
  const [liveImageError, setLiveImageError] = useState(false);

  const handleFigmaImageLoad = () => {
    setFigmaImageLoaded(true);
    setFigmaImageError(false);
  };

  const handleFigmaImageError = () => {
    setFigmaImageError(true);
    setFigmaImageLoaded(false);
  };

  const handleLiveImageLoad = () => {
    setLiveImageLoaded(true);
    setLiveImageError(false);
  };

  const handleLiveImageError = () => {
    setLiveImageError(true);
    setLiveImageLoaded(false);
  };

  // Focus on copy/text changes only
  const textAndCopyDiffs = visualData.diffs?.filter(d => 
    d.type === 'text' || d.type === 'font-size' || d.type === 'font-weight' || d.type === 'color' || d.type === 'missing'
  ) || [];

  // Debug: Log all diff types being generated
  React.useEffect(() => {
    if (visualData.diffs) {
      console.log('All diffs:', visualData.diffs.length);
      const typeCount = visualData.diffs.reduce((acc, diff) => {
        acc[diff.type] = (acc[diff.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('Diff types breakdown:', typeCount);
      console.log('Filtered textAndCopyDiffs:', textAndCopyDiffs.length);
      
      // Show first few text diffs for debugging
      const textDiffs = visualData.diffs.filter(d => d.type === 'text').slice(0, 3);
      console.log('Sample text diffs:', textDiffs);
    }
  }, [visualData.diffs, textAndCopyDiffs.length]);

  // Utility to clean and compact raw diff values for display
  const cleanValue = (value: string): string => {
    if (!value) return '';
    let cleaned = value;
    // Strip HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');
    // Remove CSS blocks and braces
    cleaned = cleaned.replace(/[{}]/g, ' ');
    // Collapse whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Truncate overly long strings
    const MAX_LEN = 120;
    if (cleaned.length > MAX_LEN) {
      return cleaned.substring(0, MAX_LEN - 3) + '...';
    }
    return cleaned;
  };

  // Validate data
  if (!visualData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">No comparison data available</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Copy Differences Found
        </h1>
        <p className="text-gray-600">
          {textAndCopyDiffs.length} text/styling differences detected
        </p>
      </div>

      {/* Side by Side Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Figma Design */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Figma Design</h2>
          </div>
          
          <div className="p-2 min-h-[200px] flex items-center justify-center">
            {visualData.figmaScreenshot ? (
              !figmaImageError ? (
                <>
                  <img
                    src={visualData.figmaScreenshot}
                    alt="Figma Design"
                    className={`w-full object-contain rounded transition-opacity ${figmaImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={handleFigmaImageLoad}
                    onError={handleFigmaImageError}
                  />
                  {!figmaImageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm">Loading Figma design...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-red-500 p-4">
                  <p className="text-sm">❌ Failed to load Figma image</p>
                  <p className="text-xs mt-1">The screenshot may be corrupted</p>
                </div>
              )
            ) : (
              <div className="text-center text-gray-500 p-4">
                <p className="text-sm">📷 No Figma screenshot available</p>
                <p className="text-xs mt-1">Screenshot capture may have failed</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Website */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Live Website</h2>
          </div>
          
          <div className="p-2 min-h-[200px] flex items-center justify-center relative">
            {visualData.liveScreenshot ? (
              !liveImageError ? (
                <>
                  <img
                    src={visualData.liveScreenshot}
                    alt="Live Website"
                    className={`w-full object-contain rounded transition-opacity ${liveImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={handleLiveImageLoad}
                    onError={handleLiveImageError}
                  />
                  {!liveImageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm">Loading website...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-red-500 p-4">
                  <p className="text-sm">❌ Failed to load website image</p>
                  <p className="text-xs mt-1">The screenshot may be corrupted</p>
                </div>
              )
            ) : (
              <div className="text-center text-gray-500 p-4">
                <p className="text-sm">📷 No website screenshot available</p>
                <p className="text-xs mt-1">Screenshot capture may have failed</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simple Differences List */}
      {textAndCopyDiffs.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Differences to Fix</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {textAndCopyDiffs.map((diff, index) => {
              // Validate diff data
              if (!diff.figmaValue || !diff.liveValue) {
                return (
                  <div key={diff.id || index} className="p-4 bg-yellow-50">
                    <p className="text-sm text-yellow-800">⚠️ Incomplete difference data for item #{index + 1}</p>
                  </div>
                );
              }

              return (
                <div key={diff.id || index} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      diff.type === 'text' ? 'bg-blue-100 text-blue-800' :
                      diff.type === 'font-size' ? 'bg-purple-100 text-purple-800' :
                      diff.type === 'font-weight' ? 'bg-indigo-100 text-indigo-800' :
                      diff.type === 'missing' ? 'bg-red-100 text-red-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {diff.type.replace('-', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="text-xs font-medium text-green-800 mb-1">Expected</div>
                      <div className="text-sm text-green-900 font-mono break-all">
                        {cleanValue(diff.figmaValue)}
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="text-xs font-medium text-red-800 mb-1">Actual</div>
                      <div className="text-sm text-red-900 font-mono break-all">
                        {cleanValue(diff.liveValue)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-300 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">✅</div>
          <h3 className="font-bold text-green-900 mb-1">Perfect Match!</h3>
          <p className="text-green-700 text-sm">All text and styling matches exactly.</p>
        </div>
      )}
    </div>
  );
};

export default SimpleComparisonViewer; 