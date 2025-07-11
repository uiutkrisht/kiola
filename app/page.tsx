'use client';

import AlignaUI from './components/AlignaUI';
import EnhancedResultViewer from './components/EnhancedResultViewer';
import type { Issue } from './components/EnhancedResultViewer';

// Mock data for demo/testing
const visualData = {
  figmaScreenshot: '',
  liveScreenshot: '',
  diffs: [],
  metadata: {
    figmaDimensions: { width: 800, height: 600 },
    liveDimensions: { width: 800, height: 600 }
  }
};
const issues: Issue[] = [
  {
    id: '1',
    type: 'content',
    severity: 'high',
    figmaBox: { x: 640, y: 200, width: 200, height: 40 },
    domBox: { x: 640, y: 190, width: 200, height: 40 },
    figmaSelector: '.main-header .title',
    liveSelector: '.main-header .title',
    element: 'header',
    issue: 'Text mismatch',
    suggestion: 'Update text to match Figma',
    figmaValue: 'Day workshop',
    liveValue: 'Missing'
  }
  // Add more issues as needed
];

export default function Home() {
  return (
    <>
      <AlignaUI />
      <EnhancedResultViewer
        visualData={visualData}
        issues={issues}
        figmaUrl={process.env.NEXT_PUBLIC_FIGMA_URL || 'https://www.figma.com/file/your-file-id'}
        liveUrl={process.env.NEXT_PUBLIC_LIVE_URL || 'https://your-live-website.com'}
      />
    </>
  );
} 