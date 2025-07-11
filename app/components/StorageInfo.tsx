'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

export default function StorageInfo() {
  const { isSignedIn } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        🔒 Data Storage & Privacy
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-600">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSignedIn ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <strong>Figma Token:</strong> {isSignedIn 
                ? 'Stored securely with your user account (encrypted)' 
                : 'Stored locally in your browser (encrypted)'
              }
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSignedIn ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
              <strong>Analysis Results:</strong> {isSignedIn 
                ? 'Can be saved to your account history (coming soon)' 
                : 'Temporary (not saved - sign in to save history)'
              }
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <strong>Screenshots:</strong> Generated on-demand (not stored)
            </div>
            <div className="mt-3 text-gray-500">
              {isSignedIn ? (
                <>
                  <strong>✅ Signed In:</strong> Your settings and tokens are saved securely across all your devices.
                  <br />
                  <strong>Coming Soon:</strong> Analysis history, team sharing, and project management.
                </>
              ) : (
                <>
                  <strong>Privacy:</strong> Data currently stays in your browser only.
                  <br />
                  <strong>Sign In:</strong> For secure cloud storage and cross-device access.
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 