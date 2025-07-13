import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { figmaUrl } = await request.json();

    if (!figmaUrl) {
      return NextResponse.json(
        { error: 'Missing figmaUrl parameter' },
        { status: 400 }
      );
    }

    // Parse the Figma URL using the same logic as the main component
    const parseFigmaUrl = (url: string) => {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        // Find file ID - it comes after 'design' or 'file' in the path
        let fileId = '';
        const designIndex = pathParts.indexOf('design');
        const fileIndex = pathParts.indexOf('file');
        
        if (designIndex !== -1 && designIndex + 1 < pathParts.length) {
          fileId = pathParts[designIndex + 1];
        } else if (fileIndex !== -1 && fileIndex + 1 < pathParts.length) {
          fileId = pathParts[fileIndex + 1];
        }
        
        // Extract frame ID from URL fragment or search params
        let frameId = '';
        
        // Check URL hash first (most common)
        if (urlObj.hash) {
          const hashContent = urlObj.hash.substring(1);
          
          // Try to parse as query parameters
          try {
            const hashParams = new URLSearchParams(hashContent);
            frameId = hashParams.get('node-id') || hashParams.get('nodeid') || '';
          } catch (e) {
            // If parsing fails, the hash might be the frame ID directly
          }
          
          // Sometimes the node-id is directly in the hash without query params
          // Look for patterns like "123:456" or "123-456"
          if (!frameId && hashContent) {
            // Match frame ID patterns (number:number or number-number)
            const frameMatch = hashContent.match(/(\d+[:-]\d+)/);
            if (frameMatch) {
              frameId = frameMatch[1].replace('-', ':'); // Convert - to :
            } else {
              // Fallback: use the entire hash if it looks like a frame ID
              frameId = hashContent;
            }
          }
        }
        
        // Check search params as fallback
        if (!frameId) {
          frameId = urlObj.searchParams.get('node-id') || 
                    urlObj.searchParams.get('nodeid') || 
                    urlObj.searchParams.get('frame-id') || '';
        }
        
        // Clean up frame ID (remove any URL encoding and normalize)
        frameId = decodeURIComponent(frameId);
        
        // Normalize frame ID format (ensure it uses : not -)
        if (frameId && frameId.includes('-') && !frameId.includes(':')) {
          frameId = frameId.replace('-', ':');
        }
        
        return { fileId, frameId };
      } catch (error) {
        throw new Error('Invalid Figma URL format');
      }
    };

    const result = parseFigmaUrl(figmaUrl);

    return NextResponse.json({
      success: true,
      url: figmaUrl,
      parsed: {
        fileId: result.fileId,
        frameId: result.frameId,
        fileIdValid: !!result.fileId,
        frameIdValid: !!result.frameId,
        frameIdFormat: result.frameId?.includes(':') ? 'colon-separated' : 
                      result.frameId?.includes('-') ? 'dash-separated' : 'unknown'
      },
      debug: {
        urlObject: {
          pathname: new URL(figmaUrl).pathname,
          hash: new URL(figmaUrl).hash,
          searchParams: Object.fromEntries(new URL(figmaUrl).searchParams)
        }
      }
    });

  } catch (error) {
    console.error('URL parsing failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false
      },
      { status: 400 }
    );
  }
} 