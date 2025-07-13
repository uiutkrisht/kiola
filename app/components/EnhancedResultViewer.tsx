'use client';

import React, { useState, useRef, useEffect } from 'react';
import { VisualComparisonData } from '../types';

export interface Issue {
  id: string;
  type: 'content' | 'typography' | 'layout' | 'color' | 'spacing';
  severity: 'high' | 'medium' | 'low';
  element: string;
  issue: string;
  suggestion: string;
  figmaValue: string;
  liveValue: string;
  figmaBox?: { x: number; y: number; width: number; height: number };
  domBox?: { x: number; y: number; width: number; height: number };
  figmaSelector?: string;
  liveSelector?: string;
}

interface EnhancedResultViewerProps {
  visualData: VisualComparisonData;
  issues: Issue[];
  figmaUrl?: string;
  liveUrl?: string;
}

const EnhancedResultViewer: React.FC<EnhancedResultViewerProps> = ({
  visualData,
  issues = []
}) => {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const figmaObjectUrlRef = useRef<string | null>(null);
  const liveObjectUrlRef = useRef<string | null>(null);
  const [figmaSrc, setFigmaSrc] = useState<string | null>(null);
  const [liveSrc, setLiveSrc] = useState<string | null>(null);

  const getObjectUrl = async (dataUrl: string, ref: React.MutableRefObject<string | null>) => {
    if (!dataUrl) return null;
    if (ref.current) return ref.current;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      ref.current = url;
      return url;
    } catch (e) {
      console.error('Failed to create object URL', e);
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      const f = visualData?.figmaScreenshot 
        ? await getObjectUrl(visualData.figmaScreenshot, figmaObjectUrlRef) 
        : null;
      const l = visualData?.liveScreenshot 
        ? await getObjectUrl(visualData.liveScreenshot, liveObjectUrlRef) 
        : null;
      setFigmaSrc(f);
      setLiveSrc(l);
    })();
    
    return () => {
      if (figmaObjectUrlRef.current) URL.revokeObjectURL(figmaObjectUrlRef.current);
      if (liveObjectUrlRef.current) URL.revokeObjectURL(liveObjectUrlRef.current);
    };
  }, [visualData?.figmaScreenshot, visualData?.liveScreenshot]);

  const getSeverityIcon = (severity: string): string => {
    switch (severity) {
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      case 'low':
        return 'ℹ️';
      default:
        return '📋';
    }
  };

  const getIssueTypeColor = (type: string): string => {
    switch (type) {
      case 'content':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'typography':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'color':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'layout':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'spacing':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="flex h-[90vh] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-[400px] border-r border-gray-200 bg-gray-50 flex flex-col max-h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <h4 className="font-semibold text-gray-900">Issues Found</h4>
          <p className="text-xs text-gray-600 mt-1">Click to highlight on image</p>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {!issues?.length ? (
            <div className="p-6 text-center text-gray-500">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm">No issues found!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue.id === selectedIssue ? null : issue.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedIssue === issue.id
                      ? 'ring-4 ring-blue-500 border-blue-400 bg-blue-100 shadow-lg transform scale-105'
                      : getIssueTypeColor(issue.type)
                  }`}
                  style={{
                    borderWidth: selectedIssue === issue.id ? '2px' : '1px'
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 text-lg">
                      {getSeverityIcon(issue.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium uppercase tracking-wide">
                          {issue.type}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-white bg-opacity-60">
                          {issue.element}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-2 leading-tight">
                        {issue.issue}
                      </p>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expected:</span>
                          <span className="font-mono truncate ml-2">{issue.figmaValue}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Actual:</span>
                          <span className="font-mono truncate ml-2">{issue.liveValue}</span>
                        </div>
                      </div>
                      {selectedIssue === issue.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-700">
                            <span className="font-medium">💡 Fix:</span> {issue.suggestion}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Figma Design */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Figma Design</h3>
            </div>
            <div className="p-4">
              {figmaSrc ? (
                <img 
                  src={figmaSrc} 
                  alt="Figma Design" 
                  className="w-full h-auto rounded"
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No Figma design available
                </div>
              )}
            </div>
          </div>

          {/* Live Website */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Live Website</h3>
            </div>
            <div className="p-4">
              {liveSrc ? (
                <img 
                  src={liveSrc} 
                  alt="Live Website" 
                  className="w-full h-auto rounded"
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No live website screenshot available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedResultViewer; 