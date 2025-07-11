import { NextRequest, NextResponse } from 'next/server';
import { getFigmaService } from '../../services/figma';
import { getScreenshotService } from '../../services/screenshot';
import { getDOMAnalysisService } from '../../services/domAnalysis';
import { getFigmaAnalysisService } from '../../services/figmaAnalysis';
import { getDetailedComparisonService } from '../../services/detailedComparison';

export async function POST(request: NextRequest) {
  try {
    const { figmaUrl, liveUrl } = await request.json();

    if (!figmaUrl || !liveUrl) {
      return NextResponse.json(
        { error: 'Both Figma URL and live website URL are required' },
        { status: 400 }
      );
    }

    console.log('=== STARTING DETAILED QA COMPARISON ===');
    console.log('Figma URL:', figmaUrl);
    console.log('Live URL:', liveUrl);

    // Step 1: Get Figma frame data and image
    console.log('=== STEP 1: ANALYZING FIGMA DESIGN ===');
    const figmaService = getFigmaService();
    const figmaDetails = await figmaService.getFrameImage(figmaUrl);
    
    if (!figmaDetails.nodeData) {
      throw new Error('Could not retrieve Figma frame data for detailed analysis');
    }

    // Step 2: Analyze Figma frame for detailed element information
    console.log('=== STEP 2: EXTRACTING FIGMA ELEMENTS ===');
    const figmaAnalysisService = getFigmaAnalysisService();
    const figmaAnalysis = figmaAnalysisService.analyzeFrame(
      figmaDetails.nodeData, 
      figmaDetails.fileKey, 
      figmaDetails.nodeId
    );

    // Step 3: Analyze live website DOM for detailed element information
    console.log('=== STEP 3: ANALYZING LIVE WEBSITE ===');
    const domAnalysisService = getDOMAnalysisService();
    const websiteAnalysis = await domAnalysisService.analyzeWebsite(liveUrl);

    // Step 4: Perform detailed element-by-element comparison
    console.log('=== STEP 4: DETAILED ELEMENT COMPARISON ===');
    const detailedComparisonService = getDetailedComparisonService();
    const comparisonResult = detailedComparisonService.compare(figmaAnalysis, websiteAnalysis);

    // Step 5: Still take screenshots for visual reference
    console.log('=== STEP 5: CAPTURING VISUAL REFERENCE ===');
    const screenshotService = getScreenshotService();
    const websiteScreenshot = await screenshotService.takeScreenshot(liveUrl);
    const websiteScreenshotBase64 = `data:image/png;base64,${websiteScreenshot.toString('base64')}`;

    // Step 6: Format detailed response
    console.log('=== FORMATTING DETAILED RESULTS ===');
    
    // Convert element matches to actionable issues format
    const detailedIssues = comparisonResult.elementMatches
      .filter(match => match.differences.length > 0)
      .flatMap(match => 
        match.differences.map(diff => ({
          type: diff.type === 'text' ? 'content' : 
                diff.type === 'missing' ? 'content' :
                diff.type.includes('font') || diff.type === 'color' ? 'typography' : 'layout',
          severity: diff.severity === 'critical' ? 'high' : 
                   diff.severity === 'high' ? 'medium' : 'low',
          element: match.figmaElement.name,
          issue: diff.description,
          suggestion: diff.suggestion,
          details: {
            expected: diff.expected,
            actual: diff.actual,
            figmaText: match.figmaElement.text,
            websiteText: match.websiteElement?.textContent || 'Not found',
            figmaFont: match.figmaElement.styles.fontFamily,
            websiteFont: match.websiteElement?.styles.fontFamily || 'Not found',
            figmaFontSize: `${match.figmaElement.styles.fontSize}px`,
            websiteFontSize: match.websiteElement?.styles.fontSize || 'Not found',
            figmaColor: match.figmaElement.fills[0]?.hex || 'Not specified',
            websiteColor: match.websiteElement?.styles.color || 'Not found'
          }
        }))
      );

    const responseData = {
      figmaDetails: {
        fileKey: figmaDetails.fileKey,
        nodeId: figmaDetails.nodeId,
        imageUrl: figmaDetails.imageUrl,
        nodeData: figmaDetails.nodeData,
        elementsAnalyzed: figmaAnalysis.textElements.length
      },
      liveUrl,
      websiteScreenshot: websiteScreenshotBase64,
      comparison: {
        overallScore: Math.round(comparisonResult.overallScore * 100) / 100,
        issuesFound: detailedIssues.length,
        analysisType: 'detailed-element-comparison',
        qualityReport: comparisonResult.qualityReport
      },
      detailedAnalysis: {
        totalElements: comparisonResult.summary.totalElements,
        matchedElements: comparisonResult.summary.matchedElements,
        missingElements: comparisonResult.summary.missingElements,
        textMismatches: comparisonResult.summary.textMismatches,
        styleMismatches: comparisonResult.summary.styleMismatches,
        contentAccuracy: Math.round(comparisonResult.qualityReport.contentAccuracy),
        typographyAccuracy: Math.round(comparisonResult.qualityReport.typographyAccuracy),
        colorAccuracy: Math.round(comparisonResult.qualityReport.colorAccuracy),
        layoutAccuracy: Math.round(comparisonResult.qualityReport.layoutAccuracy)
      },
      designIssues: detailedIssues,
      elementMatches: comparisonResult.elementMatches.map(match => ({
        figmaElement: {
          name: match.figmaElement.name,
          text: match.figmaElement.text,
          fontFamily: match.figmaElement.styles.fontFamily,
          fontSize: match.figmaElement.styles.fontSize,
          fontWeight: match.figmaElement.styles.fontWeight,
          color: match.figmaElement.fills[0]?.hex
        },
        websiteElement: match.websiteElement ? {
          tagName: match.websiteElement.tagName,
          text: match.websiteElement.textContent,
          fontFamily: match.websiteElement.styles.fontFamily,
          fontSize: match.websiteElement.styles.fontSize,
          fontWeight: match.websiteElement.styles.fontWeight,
          color: match.websiteElement.styles.color
        } : null,
        matchScore: Math.round(match.matchScore * 100) / 100,
        issues: match.differences.length
      })),
      summary: {
        totalElements: comparisonResult.summary.totalElements,
        fonts: figmaAnalysis.designTokens.fonts,
        colors: figmaAnalysis.designTokens.colors,
        figmaElements: figmaAnalysis.textElements.length,
        websiteElements: websiteAnalysis.elements.length
      },
      timestamp: new Date().toISOString()
    };

    console.log('=== QA ANALYSIS COMPLETE ===');
    console.log(`Overall Score: ${comparisonResult.overallScore.toFixed(1)}%`);
    console.log(`Quality Status: ${comparisonResult.qualityReport.overallReadiness}`);
    console.log(`Issues Found: ${detailedIssues.length}`);
    console.log(`Critical Issues: ${comparisonResult.criticalIssues.length}`);

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error in detailed comparison:', error);
    return NextResponse.json(
      { 
        error: 'Detailed comparison failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 