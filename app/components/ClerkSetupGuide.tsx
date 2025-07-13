'use client';

import { useState } from 'react';

export default function ClerkSetupGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-colors"
      >
        ⚙️
      </button>
      
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🔧 Clerk Setup Guide</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4 text-sm">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="font-medium text-yellow-800 mb-2">⚠️ Environment Setup Required</p>
              <p className="text-yellow-700">To use authentication, you need to set up Clerk environment variables.</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900 mb-2">📋 Steps to Set Up Clerk:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Go to <a href="https://clerk.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">clerk.com</a> and create an account</li>
                  <li>Create a new application</li>
                  <li>Copy your API keys from the dashboard</li>
                  <li>Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in your project root</li>
                  <li>Add the following environment variables:</li>
                </ol>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900 mb-2">🔑 Required Environment Variables:</p>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
{`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional: Customize sign-in/sign-up URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`}
                </pre>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-medium text-green-800 mb-1">✅ Benefits After Setup:</p>
                <ul className="text-green-700 text-xs space-y-1">
                  <li>• Secure token storage across devices</li>
                  <li>• Analysis history (coming soon)</li>
                  <li>• Team collaboration features</li>
                  <li>• Project management</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 