import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { figmaToken, figmaFileId } = await request.json();

    // Validate input
    if (!figmaToken || !figmaFileId) {
      return NextResponse.json(
        { error: 'Missing figmaToken or figmaFileId' },
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

    console.log(`Testing Figma API access for file: ${figmaFileId}`);

    // Test basic file access
    const response = await fetch(
      `https://api.figma.com/v1/files/${figmaFileId}`,
      {
        headers: {
          'X-Figma-Token': figmaToken,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Figma API Error:', errorText);
      
      if (response.status === 403) {
        return NextResponse.json({
          error: 'Figma API access denied',
          details: 'Your token does not have access to this file. Please check:\n1. Token is valid and active\n2. You have access to the file\n3. File ID is correct',
          status: 403
        }, { status: 403 });
      } else if (response.status === 404) {
        return NextResponse.json({
          error: 'Figma file not found',
          details: 'File not found. Please check that the file ID is correct.',
          status: 404
        }, { status: 404 });
      } else {
        return NextResponse.json({
          error: `Figma API error (${response.status})`,
          details: errorText,
          status: response.status
        }, { status: response.status });
      }
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Figma API access successful',
      fileInfo: {
        name: data.name,
        lastModified: data.lastModified,
        thumbnailUrl: data.thumbnailUrl,
        version: data.version
      }
    });

  } catch (error) {
    console.error('Validation failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 