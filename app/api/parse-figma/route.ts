import { NextResponse } from 'next/server';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

interface FigmaUrlInfo {
  fileKey: string;
  nodeId: string;
}

function parseFigmaUrl(figmaUrl: string): FigmaUrlInfo {
  // Try to match both file/design key and node-id
  const fileKeyMatch = figmaUrl.match(/(?:file|design)\/([a-zA-Z0-9]+)/);
  const nodeIdMatch = figmaUrl.match(/node-id=([^&]+)/);

  if (!fileKeyMatch) {
    throw new Error('Invalid Figma URL format: Could not find file/design key');
  }

  if (!nodeIdMatch) {
    throw new Error('Invalid Figma URL format: Could not find node-id');
  }

  return {
    fileKey: fileKeyMatch[1],
    nodeId: nodeIdMatch[1]
  };
}

export async function POST(request: Request) {
  try {
    const { figmaUrl } = await request.json();
    const figmaAccessToken = process.env.FIGMA_ACCESS_TOKEN;

    if (!figmaAccessToken) {
      return NextResponse.json(
        { error: 'Figma access token not configured' },
        { status: 500 }
      );
    }

    const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);

    // Fetch specific node/frame data
    const response = await fetch(
      `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${nodeId}`,
      {
        headers: {
          'X-Figma-Token': figmaAccessToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Figma frame data');
    }

    const data = await response.json();
    
    if (!data.nodes[nodeId]) {
      throw new Error('Frame not found in Figma file');
    }

    // Extract all the necessary design information
    const frameData = data.nodes[nodeId];
    const designSystem = extractDesignSystem(frameData);

    return NextResponse.json({
      frame: frameData,
      designSystem
    });
  } catch (error) {
    console.error('Error processing Figma data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

function extractDesignSystem(frameData: any) {
  const styles: any = {
    colors: new Set(),
    typography: new Set(),
    spacing: new Set(),
  };

  function processNode(node: any) {
    // Extract colors
    if (node.fills) {
      node.fills.forEach((fill: any) => {
        if (fill.type === 'SOLID' && fill.color) {
          styles.colors.add(rgbToHex(fill.color));
        }
      });
    }

    // Extract typography
    if (node.style) {
      styles.typography.add(JSON.stringify({
        fontFamily: node.style.fontFamily,
        fontSize: node.style.fontSize,
        fontWeight: node.style.fontWeight,
        lineHeight: node.style.lineHeightPx,
        letterSpacing: node.style.letterSpacing,
      }));
    }

    // Extract spacing
    if (node.absoluteBoundingBox) {
      if (node.paddingLeft) styles.spacing.add(node.paddingLeft);
      if (node.paddingRight) styles.spacing.add(node.paddingRight);
      if (node.paddingTop) styles.spacing.add(node.paddingTop);
      if (node.paddingBottom) styles.spacing.add(node.paddingBottom);
      if (node.itemSpacing) styles.spacing.add(node.itemSpacing);
    }

    // Recursively process children
    if (node.children) {
      node.children.forEach((child: any) => processNode(child));
    }
  }

  processNode(frameData);

  // Convert Sets to Arrays
  return {
    colors: Array.from(styles.colors),
    typography: Array.from(styles.typography).map((t) => JSON.parse(t as string)),
    spacing: Array.from(styles.spacing),
  };
}

function rgbToHex(color: { r: number; g: number; b: number; a?: number }) {
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  const hex = `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  if (color.a !== undefined && color.a !== 1) {
    return hex + toHex(color.a);
  }
  return hex;
} 