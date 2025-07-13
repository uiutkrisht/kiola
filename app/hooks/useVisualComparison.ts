'use client';

import { useState, useCallback } from 'react';
import { VisualComparisonData } from '../types';
import { getVisualComparisonService } from '@/app/services/visualComparisonService';
import { getDOMAnalysisService } from '@/app/services/domAnalysis';

interface UseVisualComparisonProps {
  figmaToken?: string;
  figmaFileId?: string;
  figmaFrameId?: string;
  websiteUrl?: string;
}

interface UseVisualComparisonReturn {
  isLoading: boolean;
  error: string | null;
  data: VisualComparisonData | null;
  generateComparison: () => Promise<void>;
  clear: () => void;
}

export function useVisualComparison({
  figmaToken,
  figmaFileId,
  figmaFrameId,
  websiteUrl
}: UseVisualComparisonProps = {}): UseVisualComparisonReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VisualComparisonData | null>(null);

  const generateComparison = useCallback(async () => {
    if (!figmaToken || !figmaFileId || !figmaFrameId || !websiteUrl) {
      setError('Missing required parameters: figmaToken, figmaFileId, figmaFrameId, or websiteUrl');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting visual comparison generation...');

      // Get services
      const visualService = getVisualComparisonService();
      const domService = getDOMAnalysisService();

      // First, analyze the DOM structure
      console.log('Analyzing DOM structure...');
      const domAnalysis = await domService.analyzeWebsite(websiteUrl);

      // Then generate the visual comparison
      console.log('Generating visual comparison...');
      const comparisonData = await visualService.generateVisualComparison(
        websiteUrl,
        figmaToken,
        figmaFileId,
        figmaFrameId,
        domAnalysis
      );

      setData(comparisonData);
      console.log('Visual comparison completed successfully');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Visual comparison failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [figmaToken, figmaFileId, figmaFrameId, websiteUrl]);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    generateComparison,
    clear
  };
}

// Helper function to validate inputs
export function validateVisualComparisonInputs(
  figmaToken: string,
  figmaFileId: string,
  figmaFrameId: string,
  websiteUrl: string
): string[] {
  const errors: string[] = [];

  if (!figmaToken || figmaToken.trim().length === 0) {
    errors.push('Figma token is required');
  }

  if (!figmaFileId || figmaFileId.trim().length === 0) {
    errors.push('Figma file ID is required');
  }

  if (!figmaFrameId || figmaFrameId.trim().length === 0) {
    errors.push('Figma frame ID is required');
  }

  if (!websiteUrl || websiteUrl.trim().length === 0) {
    errors.push('Website URL is required');
  } else {
    try {
      new URL(websiteUrl);
    } catch {
      errors.push('Website URL must be a valid URL');
    }
  }

  return errors;
} 