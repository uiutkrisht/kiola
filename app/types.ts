export interface ComparisonResult {
  type: 'text' | 'layout' | 'style' | 'missing';
  element: string;
  figmaValue: any;
  liveValue: any;
  severity: 'low' | 'medium' | 'high';
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

// New types for visual comparison
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ElementRole = 'heading' | 'paragraph' | 'button' | 'label' | 'other';

export interface VisualDiff {
  id: string;
  type: "text" | "font-size" | "font-weight" | "color" | "image" | "spacing" | "missing";
  figmaBox: BoundingBox;
  domBox: BoundingBox;
  figmaValue: string;
  liveValue: string;
  severity: 'low' | 'medium' | 'high';
  description?: string;
  role?: ElementRole;
}

export interface VisualComparisonData {
  figmaScreenshot: string; // base64 or URL
  liveScreenshot: string; // base64 or URL
  diffs: VisualDiff[];
  metadata: {
    figmaDimensions: { width: number; height: number };
    liveDimensions: { width: number; height: number };
  };
} 