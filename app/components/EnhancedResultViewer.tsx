'use client';

import React, { useState, useRef, useEffect } from 'react';
import { VisualComparisonData, VisualDiff } from '@/app/types';
import HybridVisualOverlay from './HybridVisualOverlay';
import ScreenshotWithOverlays from './ScreenshotWithOverlays';
import IframeWithHighlight from './IframeWithHighlight';
import FigmaDesignRenderer, { FigmaNode } from './FigmaDesignRenderer';

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
  figmaUrl: string;
  liveUrl: string;
}

const FIGMA_TOKEN = process.env.NEXT_PUBLIC_FIGMA_TOKEN || '';
const FIGMA_FILE_ID = process.env.NEXT_PUBLIC_FIGMA_FILE_ID || '';

const fetchFigmaNodes = async (fileId: string, token: string): Promise<FigmaNode[]> => {
  const res = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
    headers: { 'X-Figma-Token': token }
  });
  const data = await res.json();
  // Recursively parse the document node tree into FigmaNode[]
  function parseNode(node: any): FigmaNode {
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      absoluteBoundingBox: node.absoluteBoundingBox,
      style: node.style,
      characters: node.characters,
      children: node.children ? node.children.map(parseNode) : []
    };
  }
  return data.document.children.map(parseNode);
};

const EnhancedResultViewer: React.FC<EnhancedResultViewerProps> = ({
  visualData,
  issues,
  figmaUrl,
  liveUrl
}) => {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'figma' | 'live'>('figma');
  const figmaContainerRef = useRef<HTMLDivElement>(null);
  const liveContainerRef = useRef<HTMLDivElement>(null);
  const figmaObjectUrlRef = React.useRef<string | null>(null);
  const liveObjectUrlRef = React.useRef<string | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [zoom, setZoom] = useState(1);

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

  const [figmaSrc, setFigmaSrc] = React.useState<string | null>(null);
  const [liveSrc, setLiveSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const f = await getObjectUrl(visualData.figmaScreenshot, figmaObjectUrlRef);
      const l = await getObjectUrl(visualData.liveScreenshot, liveObjectUrlRef);
      setFigmaSrc(f);
      setLiveSrc(l);
      
      console.log('🖼️ Image sources updated:', {
        figmaSrc: f ? `${f.substring(0, 50)}...` : 'null',
        liveSrc: l ? `${l.substring(0, 50)}...` : 'null',
        originalFigma: visualData.figmaScreenshot ? `${visualData.figmaScreenshot.substring(0, 50)}...` : 'null',
        originalLive: visualData.liveScreenshot ? `${visualData.liveScreenshot.substring(0, 50)}...` : 'null'
      });
    })();
    return () => {
      if (figmaObjectUrlRef.current) URL.revokeObjectURL(figmaObjectUrlRef.current);
      if (liveObjectUrlRef.current) URL.revokeObjectURL(liveObjectUrlRef.current);
    };
  }, [visualData.figmaScreenshot, visualData.liveScreenshot]);

  // Debug logging
  React.useEffect(() => {
    console.log('EnhancedResultViewer mounted with:', {
      figmaScreenshot: visualData.figmaScreenshot ? `present (${(visualData.figmaScreenshot.length / 1024 / 1024).toFixed(2)}MB)` : 'missing',
      liveScreenshot: visualData.liveScreenshot ? `present (${(visualData.liveScreenshot.length / 1024 / 1024).toFixed(2)}MB)` : 'missing',
      figmaScreenshotPreview: visualData.figmaScreenshot ? visualData.figmaScreenshot.substring(0, 50) + '...' : 'missing',
      liveScreenshotPreview: visualData.liveScreenshot ? visualData.liveScreenshot.substring(0, 50) + '...' : 'missing',
      issuesCount: issues.length,
      activeView,
      selectedIssue
    });
  }, [visualData, issues, activeView, selectedIssue]);

  const containerWidth = 600;
  const containerHeight = 800;

  const getSeverityColor = (severity: 'high' | 'medium' | 'low'): string => {
    switch (severity) {
      case 'high':
        return 'bg-red-500 border-red-600';
      case 'medium':
        return 'bg-yellow-500 border-yellow-600';
      case 'low':
        return 'bg-blue-500 border-blue-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'content':
        return '📝';
      case 'typography':
        return '🔤';
      case 'color':
        return '🎨';
      case 'layout':
        return '📐';
      case 'spacing':
        return '📏';
      default:
        return '⚠️';
    }
  };

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

  const calculateScaledBox = (
    box: { x: number; y: number; width: number; height: number },
    originalDimensions: { width: number; height: number },
    displayDimensions: { width: number; height: number }
  ) => {
    const scaleX = displayDimensions.width / originalDimensions.width;
    const scaleY = displayDimensions.height / originalDimensions.height;

    return {
      x: box.x * scaleX,
      y: box.y * scaleY,
      width: box.width * scaleX,
      height: box.height * scaleY,
    };
  };

  const handleIssueClick = (issueId: string) => {
    console.log('Issue clicked:', issueId, 'Current selected:', selectedIssue);
    setSelectedIssue(selectedIssue === issueId ? null : issueId);
  };

  const renderHighlight = (issue: Issue, box: { x: number; y: number; width: number; height: number }, side: 'figma' | 'live') => {
    if (!box) return null;

    const scaledBox = calculateScaledBox(
      box,
      side === 'figma' ? visualData.metadata.figmaDimensions : visualData.metadata.liveDimensions,
      { width: containerWidth, height: containerHeight }
    );

    const isSelected = selectedIssue === issue.id;
    const minWidth = Math.max(scaledBox.width, 20);
    const minHeight = Math.max(scaledBox.height, 20);

    return (
      <div
        key={`${issue.id}-${side}`}
        data-issue-id={issue.id}
        className={`absolute border-4 rounded-md transition-all ${getSeverityColor(issue.severity)} ${
          isSelected 
            ? 'bg-opacity-60 border-8 animate-pulse z-30 shadow-lg' 
            : 'bg-opacity-40 hover:bg-opacity-50 z-20 border-4'
        }`}
        style={{
          left: `${scaledBox.x}px`,
          top: `${scaledBox.y}px`,
          width: `${minWidth}px`,
          height: `${minHeight}px`,
          pointerEvents: 'none',
          boxShadow: isSelected ? '0 0 0 4px rgba(59, 130, 246, 0.5)' : '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {/* Always show icon for better visibility */}
        <div className={`absolute -top-8 -left-1 px-2 py-1 text-xs font-bold text-white rounded shadow-lg z-40 ${getSeverityColor(issue.severity).split(' ')[0]} border-2 border-white ${
          isSelected ? 'text-base' : ''
        }`}>
          {getTypeIcon(issue.type)}
        </div>
        
        {/* Issue ID for debugging */}
        {isSelected && (
          <div className="absolute -bottom-6 -left-1 px-1 py-0.5 text-xs bg-gray-900 text-white rounded">
            #{issue.id.split('-').pop()}
          </div>
        )}
      </div>
    );
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

  // Auto-scroll highlight into view when issue changes or view switches
  React.useEffect(() => {
    if (!selectedIssue) return;
    const container = activeView === 'figma' ? figmaContainerRef.current : liveContainerRef.current;
    if (!container) return;
    const highlightEl = container.querySelector(`[data-issue-id="${selectedIssue}"]`) as HTMLElement | null;
    if (!highlightEl) return;
    // Center the highlight vertically with some padding
    const containerRect = container.getBoundingClientRect();
    const highlightRect = highlightEl.getBoundingClientRect();
    const offset = highlightRect.top - containerRect.top;
    const scrollTarget = offset - containerRect.height / 2 + highlightRect.height / 2;
    container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  }, [selectedIssue, activeView]);

  // Map issues to overlay box format for Figma and Live
  const figmaBoxes = issues
    .filter(issue => issue.figmaBox && typeof issue.figmaBox.x === 'number' && typeof issue.figmaBox.y === 'number' && typeof issue.figmaBox.width === 'number' && typeof issue.figmaBox.height === 'number')
    .map(issue => ({
      x: issue.figmaBox!.x,
      y: issue.figmaBox!.y,
      width: issue.figmaBox!.width,
      height: issue.figmaBox!.height,
      issueId: issue.id,
      severity: issue.severity,
      label: issue.type,
      type: issue.type,
      description: issue.issue,
    }));
  const liveBoxes = issues
    .filter(issue => issue.domBox && typeof issue.domBox.x === 'number' && typeof issue.domBox.y === 'number' && typeof issue.domBox.width === 'number' && typeof issue.domBox.height === 'number')
    .map(issue => ({
      x: issue.domBox!.x,
      y: issue.domBox!.y,
      width: issue.domBox!.width,
      height: issue.domBox!.height,
      issueId: issue.id,
      severity: issue.severity,
      label: issue.type,
      type: issue.type,
      description: issue.issue,
    }));

  // Find the selected issue object
  const selected = issues.find(issue => issue.id === selectedIssue) || null;

  // Use selector fields from your issues (adjust field names as needed)
  const figmaSelector = selected?.figmaSelector || null;
  const liveSelector = selected?.liveSelector || null;

  // For highlights, use the bounding box of the selected issue
  const figmaHighlights = selected && selected.figmaBox ? [{
    id: selected.id,
    box: selected.figmaBox,
    color: selected.severity === 'high' ? '#f00' : selected.severity === 'medium' ? '#ff0' : '#00f',
    isSelected: true
  }] : [];

  const [figmaNodes, setFigmaNodes] = useState<FigmaNode[]>([]);
  useEffect(() => {
    if (!FIGMA_TOKEN || !FIGMA_FILE_ID) return;
    fetchFigmaNodes(FIGMA_FILE_ID, FIGMA_TOKEN).then(setFigmaNodes);
  }, []);

  return (
    <div className="flex h-[90vh] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-[400px] border-r border-gray-200 bg-gray-50 flex flex-col max-h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <h4 className="font-semibold text-gray-900">Issues Found</h4>
          <p className="text-xs text-gray-600 mt-1">Click to highlight on image</p>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {issues.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm">No issues found!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue, index) => (
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
          {/* Overlay toggle and zoom controls (optional, can be removed for iframe version) */}
        </div>
      </div>
      {/* Main: Figma and Live iframes side by side */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center bg-gray-50">
        <div className="w-full max-w-6xl mx-auto px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-center flex-1">
            <h4 className="font-semibold text-gray-900">Visual Comparison</h4>
            <p className="text-sm text-gray-600">Figma (Recreated) vs Live Website</p>
          </div>
        </div>
        <div className="flex-1 w-full flex flex-row justify-center items-start overflow-y-auto py-6 gap-8">
          {/* Figma Design Renderer */}
          <FigmaDesignRenderer
            nodes={figmaNodes}
            highlights={figmaHighlights}
            selectedId={selected?.id}
          />
          {/* Live Iframe */}
          <IframeWithHighlight
            url={liveUrl}
            selectedSelector={liveSelector}
            iframeId="live-iframe"
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedResultViewer; 