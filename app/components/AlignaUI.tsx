'use client';

import React, { useState } from 'react';
import { VisualComparisonData } from '../types';
import EnhancedResultViewer from './EnhancedResultViewer';
import { usePersistedState } from '../hooks/usePersistedState';
import { useUser } from '@clerk/nextjs';
import { UserButton, SignInButton } from '@clerk/nextjs';

interface AlignaUIProps {
  onAnalysisComplete?: () => void;
}

export default function AlignaUI({ onAnalysisComplete }: AlignaUIProps) {
  const { isSignedIn, user } = useUser();
  const [figmaUrl, setFigmaUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  
  // Create a stable token key that doesn't change frequently
  const tokenKey = user?.id ? `figma-token-${user.id}` : "figma-token-guest";
  const [figmaToken, setFigmaToken, clearFigmaToken] = usePersistedState(tokenKey, "", true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visualData, setVisualData] = useState<VisualComparisonData | null>(null);

  // Debug effect to show when token is loaded
  React.useEffect(() => {
    if (figmaToken) {
      console.log('🔑 Figma token loaded from storage:', `${figmaToken.substring(0, 15)}...`);
    }
  }, [figmaToken]);

  // Migrate guest token to user-specific storage after sign-in
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // When the user has just signed in and their personal token key is empty,
    // try to copy the token that might have been saved under the guest key.
    if (isSignedIn && !figmaToken) {
      try {
        const guestTokenEncoded = window.localStorage.getItem('figma-token-guest');
        if (guestTokenEncoded && guestTokenEncoded !== 'undefined' && guestTokenEncoded !== '') {
          // decode base64-encoded token (same logic as in usePersistedState)
          const decoded = decodeURIComponent(atob(guestTokenEncoded));
          if (decoded) {
            setFigmaToken(decoded);
            // Also remove the guest entry to avoid duplication
            window.localStorage.removeItem('figma-token-guest');
            console.log('🔄 Migrated guest token to user scope');
          }
        }
      } catch (err) {
        console.warn('Token migration failed:', err);
      }
    }
  }, [isSignedIn, figmaToken, setFigmaToken]);

  // Extract Figma file ID and frame ID from URL
  const parseFigmaUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Find file ID - it comes after 'design' or 'file' in the path
      let fileId = '';
      const designIndex = pathParts.indexOf('design');
      const fileIndex = pathParts.indexOf('file');
      
      if (designIndex !== -1 && designIndex + 1 < pathParts.length) {
        fileId = pathParts[designIndex + 1];
      } else if (fileIndex !== -1 && fileIndex + 1 < pathParts.length) {
        fileId = pathParts[fileIndex + 1];
      }
      
      // Extract frame ID from URL fragment or search params
      let frameId = '';
      
      // Check URL hash first (most common)
      if (urlObj.hash) {
        const hashContent = urlObj.hash.substring(1);
        
        // Try to parse as query parameters
        try {
          const hashParams = new URLSearchParams(hashContent);
          frameId = hashParams.get('node-id') || hashParams.get('nodeid') || '';
        } catch (e) {
          // If parsing fails, the hash might be the frame ID directly
        }
        
        // Sometimes the node-id is directly in the hash without query params
        // Look for patterns like "123:456" or "123-456"
        if (!frameId && hashContent) {
          // Match frame ID patterns (number:number or number-number)
          const frameMatch = hashContent.match(/(\d+[:-]\d+)/);
          if (frameMatch) {
            frameId = frameMatch[1].replace('-', ':'); // Convert - to :
          } else {
            // Fallback: use the entire hash if it looks like a frame ID
            frameId = hashContent;
          }
        }
      }
      
      // Check search params as fallback
      if (!frameId) {
        frameId = urlObj.searchParams.get('node-id') || 
                  urlObj.searchParams.get('nodeid') || 
                  urlObj.searchParams.get('frame-id') || '';
      }
      
      // Clean up frame ID (remove any URL encoding and normalize)
      frameId = decodeURIComponent(frameId);
      
      // Normalize frame ID format (ensure it uses : not -)
      if (frameId && frameId.includes('-') && !frameId.includes(':')) {
        frameId = frameId.replace('-', ':');
      }
      
      if (!fileId) {
        throw new Error('Could not extract Figma file ID from URL. Make sure you\'re using a valid Figma file URL.');
      }
      
      if (!frameId) {
        throw new Error('Could not extract frame/node ID from URL. Make sure you\'re copying the URL with a selected frame.');
      }
      
      return { fileId, frameId };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Invalid Figma URL format. Please use a valid Figma file or frame URL.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!figmaUrl.trim()) {
      setError('Please enter a Figma URL');
      return;
    }
    
    if (!liveUrl.trim()) {
      setError('Please enter a website URL');
      return;
    }
    
    if (!figmaToken.trim()) {
      setError('Please enter your Figma access token');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVisualData(null);

    try {
      // Parse and validate Figma URL
      const { fileId, frameId } = parseFigmaUrl(figmaUrl);
      
      if (!fileId || !frameId) {
        throw new Error('Could not extract file ID or frame ID from Figma URL. Make sure the URL includes the frame/node ID.');
      }

      // Call visual comparison API
      const response = await fetch('/api/visual-compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          figmaToken,
          figmaFileId: fileId,
          figmaFrameId: frameId,
          websiteUrl: liveUrl
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to generate visual comparison');
      }

      if (!data.success || !data.data) {
        throw new Error('Invalid response from comparison service');
      }

      setVisualData(data.data);
      
      // Notify parent component that analysis is complete
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Comparison failed:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Aligna - QA Automation</h1>
              <p className="text-gray-600">Pixel-perfect design-to-code validation</p>
            </div>
            <div className="flex items-center space-x-4">
              {isSignedIn ? (
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-600">
                    <div className="font-medium">Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}!</div>
                    <div className="text-xs text-green-600">✓ Tokens & history saved securely</div>
                  </div>
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: 'w-10 h-10'
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="text-xs">Sign in to save tokens & history</div>
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className="text-blue-600 hover:underline focus:outline-none text-xs font-medium"
                    >
                      Sign&nbsp;in
                    </button>
                  </SignInButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Figma Frame URL
                </label>
                <input
                  type="url"
                  placeholder="https://www.figma.com/design/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Live Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-website.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Figma Access Token
              </label>
              <input
                type="password"
                placeholder="figd_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={figmaToken}
                onChange={(e) => setFigmaToken(e.target.value)}
                required
                disabled={isLoading}
              />
              <div className="flex items-center justify-between text-xs">
                <p className="text-gray-500">
                  {figmaToken ? (
                    <span className="text-green-600">✅ Token saved - won't need to enter again</span>
                  ) : (
                    <>
                      Get from{' '}
                      <a 
                        href="https://www.figma.com/developers/api#access-tokens" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Figma Settings
                      </a>
                    </>
                  )}
                </p>
                {figmaToken && (
                  <button
                    type="button"
                    onClick={() => clearFigmaToken()}
                    className="text-red-600 hover:text-red-800"
                  >
                    Clear Token
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </div>
                ) : (
                  'Start Analysis'
                )}
              </button>
            </div>
          </form>

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex flex-col items-center justify-center z-50">
              <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-white text-lg">
                Taking screenshots and analyzing differences...
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Results */}
        {visualData && (
          <div className="space-y-6">
            {/* Debug Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Debug: Visual Data Received</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Figma Screenshot:</strong> {visualData.figmaScreenshot ? `Present (${(visualData.figmaScreenshot.length / 1024).toFixed(0)}KB)` : 'Missing'}</p>
                <p><strong>Live Screenshot:</strong> {visualData.liveScreenshot ? `Present (${(visualData.liveScreenshot.length / 1024).toFixed(0)}KB)` : 'Missing'}</p>
                <p><strong>Diffs Count:</strong> {visualData.diffs?.length || 0}</p>
                <p><strong>Sample Diff Types:</strong> {visualData.diffs?.slice(0, 3).map(d => d.type).join(', ') || 'None'}</p>
                <p><strong>Sample Diffs:</strong></p>
                <div className="bg-gray-50 p-2 rounded text-xs max-h-32 overflow-y-auto">
                  {visualData.diffs?.slice(0, 5).map((diff, i) => (
                    <div key={i} className="mb-1">
                      <span className="font-medium">{diff.type}:</span> {diff.description || 'No description'}
                    </div>
                  )) || 'No diffs available'}
                </div>
              </div>
            </div>

            {/* Enhanced interactive viewer */}
            <EnhancedResultViewer
              visualData={visualData}
              figmaUrl={figmaUrl}
              liveUrl={liveUrl}
              issues={visualData.diffs?.map((diff, index) => ({
                id: diff.id || `diff-${index}`,
                type: diff.type === 'text'
                  ? 'content'
                  : diff.type === 'font-size' || diff.type === 'color'
                  ? 'typography'
                  : diff.type === 'missing'
                  ? 'layout'
                  : 'layout',
                severity: diff.severity || 'medium',
                element: diff.role || diff.type || 'element',
                issue: diff.description || `${diff.type} mismatch`,
                suggestion: `Update ${diff.type} to match design`,
                figmaValue: diff.figmaValue || '',
                liveValue: diff.liveValue || '',
                figmaBox: diff.figmaBox,
                domBox: diff.domBox,
              })) || []}
            />
          </div>
        )}
      </div>
    </main>
  );
} 