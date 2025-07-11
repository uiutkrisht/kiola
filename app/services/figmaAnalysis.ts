export interface FigmaTextElement {
  id: string;
  name: string;
  type: string;
  text: string;
  styles: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    textAlign: string;
    textDecoration: string;
  };
  fills: {
    type: string;
    color: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
    hex: string;
  }[];
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  hierarchy: string[];
}

export interface FigmaFrameElement {
  id: string;
  name: string;
  type: string;
  backgroundColor?: {
    r: number;
    g: number;
    b: number;
    a: number;
    hex: string;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  children: (FigmaTextElement | FigmaFrameElement)[];
}

export interface FigmaAnalysis {
  fileKey: string;
  nodeId: string;
  frameName: string;
  textElements: FigmaTextElement[];
  frameElements: FigmaFrameElement[];
  designTokens: {
    colors: string[];
    fonts: string[];
    fontSizes: number[];
    fontWeights: number[];
  };
}

export class FigmaAnalysisService {
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private extractTextContent(node: any): string {
    if (node.type === 'TEXT' && node.characters) {
      return node.characters;
    }
    
    // Handle styled text runs
    if (node.type === 'TEXT' && node.characterStyleOverrides && node.characterStyleOverrides.length > 0) {
      return node.characters || '';
    }

    return '';
  }

  private extractTextStyles(node: any): any {
    const style = node.style || {};
    const defaultStyle = {
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: 'LEFT',
      textDecoration: 'NONE'
    };

    return {
      fontFamily: style.fontFamily || defaultStyle.fontFamily,
      fontSize: style.fontSize || defaultStyle.fontSize,
      fontWeight: style.fontWeight || defaultStyle.fontWeight,
      lineHeight: style.lineHeightPercentFontSize ? style.lineHeightPercentFontSize / 100 : 
                  style.lineHeightPx ? style.lineHeightPx / (style.fontSize || 16) : defaultStyle.lineHeight,
      letterSpacing: style.letterSpacing || defaultStyle.letterSpacing,
      textAlign: style.textAlignHorizontal || defaultStyle.textAlign,
      textDecoration: style.textDecoration || defaultStyle.textDecoration
    };
  }

  private extractFills(node: any): any[] {
    if (!node.fills || !Array.isArray(node.fills)) {
      return [];
    }

    return node.fills.map((fill: any) => {
      if (fill.type === 'SOLID' && fill.color) {
        const hex = this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
        return {
          type: fill.type,
          color: fill.color,
          hex
        };
      }
      return fill;
    }).filter(Boolean);
  }

  private extractPosition(node: any): any {
    const bounds = node.absoluteBoundingBox || node.boundingBox || {};
    return {
      x: bounds.x || 0,
      y: bounds.y || 0,
      width: bounds.width || 0,
      height: bounds.height || 0
    };
  }

  private buildHierarchy(node: any, parentHierarchy: string[] = []): string[] {
    const currentLevel = `${node.type}:${node.name || 'unnamed'}`;
    return [...parentHierarchy, currentLevel];
  }

  private parseNode(node: any, parentHierarchy: string[] = []): FigmaTextElement | FigmaFrameElement | null {
    const hierarchy = this.buildHierarchy(node, parentHierarchy);
    const position = this.extractPosition(node);

    if (node.type === 'TEXT') {
      const text = this.extractTextContent(node);
      if (!text || text.trim().length === 0) return null;

      const textElement: FigmaTextElement = {
        id: node.id,
        name: node.name || 'Text',
        type: node.type,
        text: text.trim(),
        styles: this.extractTextStyles(node),
        fills: this.extractFills(node),
        position,
        hierarchy
      };

      return textElement;
    }

    if (['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE'].includes(node.type)) {
      const backgroundColor = node.backgroundColor ? {
        ...node.backgroundColor,
        hex: this.rgbToHex(node.backgroundColor.r, node.backgroundColor.g, node.backgroundColor.b)
      } : undefined;

      const padding = node.paddingLeft !== undefined ? {
        top: node.paddingTop || 0,
        right: node.paddingRight || 0,
        bottom: node.paddingBottom || 0,
        left: node.paddingLeft || 0
      } : undefined;

      const children: (FigmaTextElement | FigmaFrameElement)[] = [];
      
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => {
          const parsedChild = this.parseNode(child, hierarchy);
          if (parsedChild) {
            children.push(parsedChild);
          }
        });
      }

      const frameElement: FigmaFrameElement = {
        id: node.id,
        name: node.name || 'Frame',
        type: node.type,
        backgroundColor,
        position,
        padding,
        children
      };

      return frameElement;
    }

    return null;
  }

  analyzeFrame(nodeData: any, fileKey: string, nodeId: string): FigmaAnalysis {
    console.log('Analyzing Figma frame for detailed comparison...');
    
    const parsedFrame = this.parseNode(nodeData);
    if (!parsedFrame) {
      throw new Error('Failed to parse Figma frame data');
    }

    // Extract all text elements recursively
    const textElements: FigmaTextElement[] = [];
    const frameElements: FigmaFrameElement[] = [];
    
    const extractElements = (element: FigmaTextElement | FigmaFrameElement) => {
      if (element.type === 'TEXT') {
        textElements.push(element as FigmaTextElement);
      } else {
        frameElements.push(element as FigmaFrameElement);
        if ('children' in element && element.children) {
          element.children.forEach(extractElements);
        }
      }
    };

    extractElements(parsedFrame);

    // Extract design tokens
    const colors = new Set<string>();
    const fonts = new Set<string>();
    const fontSizes = new Set<number>();
    const fontWeights = new Set<number>();

    textElements.forEach(element => {
      // Colors
      element.fills.forEach(fill => {
        if (fill.hex) colors.add(fill.hex);
      });

      // Typography
      fonts.add(element.styles.fontFamily);
      fontSizes.add(element.styles.fontSize);
      fontWeights.add(element.styles.fontWeight);
    });

    frameElements.forEach(element => {
      if (element.backgroundColor?.hex) {
        colors.add(element.backgroundColor.hex);
      }
    });

    const analysis: FigmaAnalysis = {
      fileKey,
      nodeId,
      frameName: parsedFrame.name,
      textElements,
      frameElements,
      designTokens: {
        colors: Array.from(colors),
        fonts: Array.from(fonts),
        fontSizes: Array.from(fontSizes),
        fontWeights: Array.from(fontWeights)
      }
    };

    console.log(`Figma analysis complete: ${textElements.length} text elements, ${frameElements.length} frames`);
    console.log('Text content found:', textElements.map(el => el.text).slice(0, 5));
    
    return analysis;
  }
}

// Singleton instance
let figmaAnalysisService: FigmaAnalysisService | null = null;

export function getFigmaAnalysisService(): FigmaAnalysisService {
  if (!figmaAnalysisService) {
    figmaAnalysisService = new FigmaAnalysisService();
  }
  return figmaAnalysisService;
} 