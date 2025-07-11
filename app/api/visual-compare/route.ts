import { NextRequest, NextResponse } from 'next/server';
import { getVisualComparisonService } from '@/services/visualComparisonService';
import { getDOMAnalysisService } from '@/services/domAnalysis';

export async function POST(request: NextRequest) {
  let visualService = null;
  let domService = null;

  try {
    const body = await request.json();
    const { figmaToken, figmaFileId, figmaFrameId, websiteUrl } = body;

    // Validate input
    if (!figmaToken || !figmaFileId || !figmaFrameId || !websiteUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters: figmaToken, figmaFileId, figmaFrameId, or websiteUrl' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(websiteUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid website URL format' },
        { status: 400 }
      );
    }

    // Validate token format
    if (!figmaToken.startsWith('figd_')) {
      return NextResponse.json(
        { 
          error: 'Invalid Figma token format. Token should start with "figd_"',
          hint: 'Get your token from https://www.figma.com/developers/api#access-tokens'
        },
        { status: 400 }
      );
    }

    // Validate Figma IDs
    if (!figmaFileId.match(/^[a-zA-Z0-9]+$/)) {
      return NextResponse.json(
        { error: 'Invalid Figma file ID format' },
        { status: 400 }
      );
    }

    if (!figmaFrameId.includes(':')) {
      return NextResponse.json(
        { 
          error: 'Invalid Figma frame ID format. Frame ID should contain a colon (e.g., "123:456")',
          hint: 'Make sure you copied the URL with a selected frame'
        },
        { status: 400 }
      );
    }

    console.log('Starting visual comparison for:', { 
      figmaFileId, 
      figmaFrameId, 
      websiteUrl,
      frameIdType: typeof figmaFrameId,
      frameIdLength: figmaFrameId?.length 
    });

    // Get services
    visualService = getVisualComparisonService();
    domService = getDOMAnalysisService();

    // Set up timeout for the entire operation (5 minutes)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out after 5 minutes')), 5 * 60 * 1000);
    });

    const comparisonPromise = (async () => {
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

      return comparisonData;
    })();

    const comparisonData = await Promise.race([comparisonPromise, timeoutPromise]);

    console.log('Visual comparison completed successfully');

    return NextResponse.json({
      success: true,
      data: comparisonData
    });

  } catch (error) {
    console.error('Visual comparison failed:', error);
    
    let errorMessage = 'An unknown error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Categorize errors for better user experience
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMessage = 'The analysis is taking longer than expected. Please try again with a simpler website or check if the website is accessible.';
        statusCode = 408; // Request Timeout
      } else if (error.message.includes('Failed to load website') || error.message.includes('navigation')) {
        errorMessage = 'Could not load the website. Please check the URL and make sure the website is accessible.';
        statusCode = 400;
      } else if (error.message.includes('Figma') && error.message.includes('403')) {
        errorMessage = 'Invalid Figma token or insufficient permissions. Please check your token.';
        statusCode = 401;
      } else if (error.message.includes('Figma') && error.message.includes('404')) {
        errorMessage = 'Figma file or frame not found. Please check your URL and frame ID.';
        statusCode = 404;
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
        statusCode = 503;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      },
      { status: statusCode }
    );
  } finally {
    // Clean up services
    try {
      if (visualService) await visualService.close();
      if (domService) await domService.close();
    } catch (cleanupError) {
      console.warn('Error during cleanup:', cleanupError);
    }
  }
} 