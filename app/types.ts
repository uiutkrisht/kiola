// Common types
export type Severity = 'low' | 'medium' | 'high';

export type StyleIssueType = 'font-size' | 'font-weight' | 'color' | 'spacing' | 'other';
export type IssueType = 'text' | 'layout' | 'style' | 'missing' | StyleIssueType;

// Helper type to check if a string is a valid StyleIssueType
export function isStyleIssueType(type: string): type is StyleIssueType {
  return ['font-size', 'font-weight', 'color', 'spacing', 'other'].includes(type);
}

export interface ComparisonResult {
  type: IssueType;
  element: string;
  figmaValue: any;
  liveValue: any;
  severity: Severity;
  confidence: number;
  recommendation?: string;
}

export interface ComparisonSummary {
  total: number;
  matched: number;
  score: number;
  byType: {
    text: number;
    layout: number;
    style: number;
    missing: number;
  };
  bySeverity: {
    high: number;
    medium: number;
    low: number;
  };
}

// Visual comparison types
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ElementRole = 'heading' | 'paragraph' | 'button' | 'label' | 'other';

export interface VisualDiff {
  id: string;
  type: IssueType;
  figmaBox: BoundingBox;
  domBox: BoundingBox;
  figmaValue: string;
  liveValue: string;
  severity: Severity;
  description?: string;
  role?: ElementRole;
}

export interface VisualDiffInput extends Omit<VisualDiff, 'id'> {
  // Same as VisualDiff but without the id (it's added later)
}

export interface VisualComparisonData {
  figmaScreenshot: string; // base64 or URL
  liveScreenshot: string; // base64 or URL
  diffImage?: string; // base64 or URL for the diff image
  diffs: VisualDiff[];
  similarity?: number; // Similarity score between 0 and 1
  metadata: {
    figmaDimensions: { width: number; height: number };
    liveDimensions: { width: number; height: number };
  };
}