// Type definitions for your application
declare module '@/app/types' {
  export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export type IssueType = 'layout' | 'content' | 'typography' | 'color' | 'spacing' | 'text' | 'font-size' | 'missing' | 'other';
  export type Severity = 'low' | 'medium' | 'high';

  // Base interface for visual differences
  export interface VisualDiff extends BoundingBox {
    id: string;
    type: IssueType;
    confidence: number;
    difference?: number;
    severity: Severity;
    role: string;
    description: string;
    element: string;
    issue?: string;
    suggestion?: string;
    figmaValue?: any;
    liveValue?: any;
    figmaBox: BoundingBox;
    domBox: BoundingBox;
  }

  // Partial version for creating new diffs
  export interface VisualDiffInput extends Partial<VisualDiff> {
    id: string;
    type: IssueType;
    severity: Severity;
    role: string;
    description: string;
    element: string;
    figmaBox: BoundingBox;
    domBox: BoundingBox;
    confidence?: number;
  }

  export interface Issue {
    id: string;
    type: IssueType;
    severity: Severity;
    element: string;
    issue: string;
    suggestion: string;
    figmaValue?: any;
    liveValue?: any;
    figmaBox?: BoundingBox;
    domBox?: BoundingBox;
    message?: string;
    expected?: string;
    actual?: string;
  }

  export interface Dimensions {
    width: number;
    height: number;
  }

  export interface VisualComparisonData {
    diffs: VisualDiff[];
    diffImage: string;
    similarity: number;
    figmaScreenshot?: string;
    liveScreenshot?: string;
    metadata: {
      width: number;
      height: number;
      figmaDimensions?: Dimensions;
      liveDimensions?: Dimensions;
    };
  }

  export interface EnhancedResultViewerProps {
    visualData: VisualComparisonData;
    issues: Issue[];
    figmaUrl: string;
    liveUrl: string;
  }

  export interface ImageMetadata {
    width: number;
    height: number;
    // Add other metadata properties as needed
  }
}

// Add global type declarations
declare namespace JSX {
  interface IntrinsicElements {
    // Add any custom JSX elements here
    [elemName: string]: any;
  }
}

// Add other global type declarations as needed
