import puppeteer, { Browser } from 'puppeteer';
import { VisualComparisonData, VisualDiff, BoundingBox, IssueType, Severity, ElementRole } from '../types';
import { ElementDetails, WebsiteAnalysis } from './domAnalysis';
import { getEmbedding, cosine } from './googleEmbed';

export interface FigmaFrame {
  id: string;
  name: string;
  absoluteBoundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children?: FigmaNode[];
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  absoluteBoundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a: number };
  }>;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
  };
  characters?: string;
  children?: FigmaNode[];
}

export class VisualComparisonService {
  private browser: Browser | null = null;

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
    }
    return this.browser;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Capture screenshot of a live website
   */
  async captureWebsiteScreenshot(url: string, viewport = { width: 1440, height: 900 }): Promise<string> {
    const browser = await this.init();
    const page = await browser.newPage();

    try {
      await page.setViewport(viewport);
      
      // Set user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Try different loading strategies in order of preference
      let pageLoaded = false;
      const strategies = [
        { waitUntil: 'domcontentloaded' as const, timeout: 30000 },
        { waitUntil: 'load' as const, timeout: 45000 },
        { waitUntil: 'networkidle2' as const, timeout: 60000 }
      ];

      for (const strategy of strategies) {
        try {
          console.log(`Trying navigation strategy: ${strategy.waitUntil} with ${strategy.timeout}ms timeout`);
          await page.goto(url, strategy);
          pageLoaded = true;
          console.log(`Successfully loaded page with strategy: ${strategy.waitUntil}`);
          break;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`Strategy ${strategy.waitUntil} failed:`, errorMessage);
          if (strategy === strategies[strategies.length - 1]) {
            // Last strategy failed, try a basic load without waiting
            console.log('All strategies failed, trying basic navigation...');
            try {
              await page.goto(url, { timeout: 30000 });
              pageLoaded = true;
              console.log('Basic navigation successful');
            } catch (basicError) {
              const basicErrorMessage = basicError instanceof Error ? basicError.message : 'Unknown error';
              throw new Error(`Failed to load website: ${basicErrorMessage}`);
            }
          }
        }
      }

      if (!pageLoaded) {
        throw new Error('Failed to load website with any navigation strategy');
      }

      // Wait for initial render
      console.log('Waiting for initial render...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Scroll to bottom slowly to trigger lazy loading (with timeout protection)
      console.log('Triggering lazy loading by scrolling...');
      try {
        await Promise.race([
          page.evaluate(async () => {
            await new Promise((resolve) => {
              let totalHeight = 0;
              const distance = 100;
              const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                  clearInterval(timer);
                  resolve(null);
                }
              }, 100);
            });
          }),
          new Promise(resolve => setTimeout(resolve, 10000)) // Max 10 seconds for scrolling
        ]);
      } catch (scrollError) {
        const scrollErrorMessage = scrollError instanceof Error ? scrollError.message : 'Unknown error';
        console.log('Scrolling failed, continuing anyway:', scrollErrorMessage);
      }

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));

      // Wait for lazy loaded content to render
      console.log('Waiting for lazy loaded content...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Wait for images to load (with timeout protection)
      console.log('Waiting for images to load...');
      try {
        await Promise.race([
          page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('img'));
            return Promise.all(images.map(img => {
              if (img.complete) return Promise.resolve();
              return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
                // Timeout after 2 seconds per image
                setTimeout(resolve, 2000);
              });
            }));
          }),
          new Promise(resolve => setTimeout(resolve, 5000)) // Max 5 seconds for all images
        ]);
      } catch (imageError) {
        const imageErrorMessage = imageError instanceof Error ? imageError.message : 'Unknown error';
        console.log('Image loading failed, continuing anyway:', imageErrorMessage);
      }

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true,
        encoding: 'base64'
      });

      return `data:image/png;base64,${screenshot}`;
    } finally {
      await page.close();
    }
  }

  /**
   * Get Figma frame screenshot using Figma API
   */
  async captureFigmaScreenshot(
    figmaToken: string, 
    fileId: string, 
    frameId: string,
    scale = 2
  ): Promise<string> {
    try {
      console.log(`Requesting Figma screenshot for file: ${fileId}, frame: ${frameId}`);
      
      const response = await fetch(
        `https://api.figma.com/v1/images/${fileId}?ids=${frameId}&scale=${scale}&format=png`,
        {
          headers: {
            'X-Figma-Token': figmaToken,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Figma API Error Response:', errorText);
        
        if (response.status === 403) {
          throw new Error(`Figma API Forbidden (403): Invalid token or no access to file. Please check:\n1. Your Figma token is valid\n2. The file is accessible with your token\n3. The file ID is correct: ${fileId}`);
        } else if (response.status === 404) {
          throw new Error(`Figma API Not Found (404): File or frame not found. Please check:\n1. File ID is correct: ${fileId}\n2. Frame ID is correct: ${frameId}`);
        } else {
          throw new Error(`Figma API error (${response.status}): ${response.statusText}\nDetails: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('Figma API Response:', data);
      console.log('Looking for frame ID:', frameId);
      console.log('Available frames:', Object.keys(data.images || {}));
      
      const imageUrl = data.images?.[frameId];

      if (!imageUrl) {
        // Try to find the frame with a different format
        const availableFrames = Object.keys(data.images || {});
        let foundFrameId = null;
        
        // Try exact match first
        if (availableFrames.includes(frameId)) {
          foundFrameId = frameId;
        } else {
          // Try with : instead of -
          const altFrameId = frameId.replace('-', ':');
          if (availableFrames.includes(altFrameId)) {
            foundFrameId = altFrameId;
          } else {
            // Try with - instead of :
            const altFrameId2 = frameId.replace(':', '-');
            if (availableFrames.includes(altFrameId2)) {
              foundFrameId = altFrameId2;
            }
          }
        }
        
        if (foundFrameId) {
          console.log(`Found frame with ID: ${foundFrameId}`);
          const foundImageUrl = data.images[foundFrameId];
          if (foundImageUrl) {
            // Use the found image URL
            const imageResponse = await fetch(foundImageUrl);
            if (!imageResponse.ok) {
              throw new Error(`Failed to download image from Figma CDN: ${imageResponse.statusText}`);
            }
            
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            return `data:image/png;base64,${base64Image}`;
          }
        }
        
        throw new Error(`Failed to get Figma frame image URL. Looking for: "${frameId}", Available frames: ${availableFrames.join(', ')}`);
      }

      // Fetch the actual image and convert to base64
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image from Figma CDN: ${imageResponse.statusText}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      return `data:image/png;base64,${base64Image}`;
    } catch (error) {
      console.error('Error capturing Figma screenshot:', error);
      throw error;
    }
  }

  /**
   * Get Figma frame data for element analysis
   */
  async getFigmaFrameData(
    figmaToken: string, 
    fileId: string, 
    frameId: string
  ): Promise<FigmaFrame> {
    try {
      console.log(`Requesting Figma frame data for file: ${fileId}, frame: ${frameId}`);
      
      const response = await fetch(
        `https://api.figma.com/v1/files/${fileId}/nodes?ids=${frameId}`,
        {
          headers: {
            'X-Figma-Token': figmaToken,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Figma API Error Response:', errorText);
        
        if (response.status === 403) {
          throw new Error(`Figma API Forbidden (403): Invalid token or no access to file. Please check:\n1. Your Figma token is valid and active\n2. The file is accessible with your token\n3. The file ID is correct: ${fileId}`);
        } else if (response.status === 404) {
          throw new Error(`Figma API Not Found (404): File or frame not found. Please check:\n1. File ID is correct: ${fileId}\n2. Frame ID is correct: ${frameId}\n3. Frame exists in the file`);
        } else {
          throw new Error(`Figma API error (${response.status}): ${response.statusText}\nDetails: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('Figma API Response:', JSON.stringify(data, null, 2));
      console.log('Looking for frame ID:', frameId);
      console.log('Available nodes:', Object.keys(data.nodes || {}));
      
      if (!data.nodes || !data.nodes[frameId]) {
        // Try to find the frame with a different format
        const availableNodes = Object.keys(data.nodes || {});
        let foundFrameId = null;
        
        // Try exact match first
        if (availableNodes.includes(frameId)) {
          foundFrameId = frameId;
        } else {
          // Try with : instead of -
          const altFrameId = frameId.replace('-', ':');
          if (availableNodes.includes(altFrameId)) {
            foundFrameId = altFrameId;
          } else {
            // Try with - instead of :
            const altFrameId2 = frameId.replace(':', '-');
            if (availableNodes.includes(altFrameId2)) {
              foundFrameId = altFrameId2;
            }
          }
        }
        
        if (foundFrameId && data.nodes[foundFrameId]) {
          console.log(`Found frame data with ID: ${foundFrameId}`);
          return data.nodes[foundFrameId].document;
        }
        
        throw new Error(`Frame not found in API response. Looking for: "${frameId}", Available nodes: ${availableNodes.join(', ')}`);
      }
      
      return data.nodes[frameId].document;
    } catch (error) {
      console.error('Error fetching Figma frame data:', error);
      throw error;
    }
  }

  /**
   * Convert Figma color to CSS color
   */
  private figmaColorToCss(color: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a;

    if (a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  /**
   * Extract elements from Figma frame recursively
   */
  private extractFigmaElements(node: FigmaNode, elements: Array<{
    id: string;
    type: string;
    boundingBox: BoundingBox;
    text?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    role: ElementRole;
  }> = []): Array<{
    id: string;
    type: string;
    boundingBox: BoundingBox;
    text?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    role: ElementRole;
  }> {
    
    // Only extract TEXT nodes with actual content
    if (node.type === 'TEXT' && node.characters && node.characters.trim().length > 0) {
      // Determine the role based on font size and weight
      const size = node.style?.fontSize || 12;
      const weight = node.style?.fontWeight || 400;
      let role: ElementRole = 'paragraph';
      if (size >= 28 || weight >= 700) {
        role = 'heading';
      }

      const element = {
        id: node.id,
        type: node.type,
        boundingBox: {
          x: node.absoluteBoundingBox.x,
          y: node.absoluteBoundingBox.y,
          width: node.absoluteBoundingBox.width,
          height: node.absoluteBoundingBox.height,
        },
        text: node.characters,
        color: node.fills?.[0]?.color ? this.figmaColorToCss(node.fills[0].color) : undefined,
        fontSize: node.style?.fontSize,
        fontFamily: node.style?.fontFamily,
        fontWeight: node.style?.fontWeight,
        role,
      };

      elements.push(element);
      console.log('Extracted Figma text element:', { text: node.characters, role, fontSize: node.style?.fontSize });
    }

    // Recursively process children
    if (node.children) {
      node.children.forEach(child => {
        this.extractFigmaElements(child, elements);
      });
    }

    return elements;
  }

  /**
   * Compare elements and generate visual diffs
   */
  private async compareElements(
    figmaElements: Array<{
      id: string;
      type: string;
      boundingBox: BoundingBox;
      text?: string;
      color?: string;
      fontSize?: number;
      fontFamily?: string;
      fontWeight?: number;
      role: ElementRole;
    }>,
    domElements: ElementDetails[]
  ): Promise<VisualDiff[]> {
    const diffs: VisualDiff[] = [];

    // Helper to compute Intersection-over-Union between two boxes
    const iou = (a: BoundingBox, b: BoundingBox): number => {
      const x1 = Math.max(a.x, b.x);
      const y1 = Math.max(a.y, b.y);
      const x2 = Math.min(a.x + a.width, b.x + b.width);
      const y2 = Math.min(a.y + a.height, b.y + b.height);
      const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
      const unionArea = a.width * a.height + b.width * b.height - interArea;
      if (unionArea === 0) return 0;
      return interArea / unionArea;
    };

    const stringSimilarity = (s1: string, s2: string): number => {
      if (!s1 || !s2) return 0;
      // Use simple Dice coefficient on bigrams for lightweight fuzzy matching
      const bigrams = (str: string) => {
        const res: string[] = [];
        for (let i = 0; i < str.length - 1; i++) res.push(str.slice(i, i + 2));
        return res;
      };
      const pairs1 = bigrams(s1.toLowerCase());
      const pairs2 = bigrams(s2.toLowerCase());
      const set = new Set(pairs1);
      let matches = 0;
      pairs2.forEach(p => { if (set.has(p)) matches++; });
      return (2 * matches) / (pairs1.length + pairs2.length || 1);
    };

    for (let index = 0; index < figmaElements.length; index++) {
      const figmaEl = figmaElements[index];
      // Score each DOM element
      let bestMatch: ElementDetails | undefined;
      let bestScore = 0;

      for (const domEl of domElements) {
        // Spatial overlap score
        const spatialScore = iou(figmaEl.boundingBox, {
          x: domEl.position.x,
          y: domEl.position.y,
          width: domEl.position.width,
          height: domEl.position.height
        });

        // Semantic embedding similarity (async cached)
        let textScore = 0;
        if (figmaEl.text && domEl.text) {
          try {
            const [embF, embD] = await Promise.all([
              getEmbedding(figmaEl.text),
              getEmbedding(domEl.text)
            ]);
            textScore = cosine(embF, embD);
          } catch (e) {
            // fallback to simple similarity if embeddings fail
            textScore = stringSimilarity(figmaEl.text, domEl.text);
          }
        }

        // Penalize if roles differ (if available)
        const rolePenalty = (figmaEl as any).role && (domEl as any).role && 
          (figmaEl as any).role !== (domEl as any).role ? 0.5 : 0;
        // Combined score (weight spatial 0.6, text 0.4) minus role penalty
        const score = spatialScore * 0.6 + textScore * 0.4 - rolePenalty;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = domEl;
        }
      }

      // Consider a match valid if score > threshold (e.g., 0.2)
      if (bestMatch && bestScore > 0.2) {
        // Compare text content
        if (figmaEl.text && bestMatch.text && figmaEl.text !== bestMatch.text) {
          // Create a new VisualDiff with a generated ID
          const visualDiff: VisualDiff = {
            id: `text-diff-${Date.now()}-${index}`,
            type: 'text' as IssueType,
            figmaBox: figmaEl.boundingBox,
            domBox: {
              x: bestMatch.position.x,
              y: bestMatch.position.y,
              width: bestMatch.position.width,
              height: bestMatch.position.height,
            },
            figmaValue: figmaEl.text || '',
            liveValue: bestMatch.text || '',
            severity: 'medium' as Severity,
            role: (figmaEl.role as ElementRole) || 'other',
            description: `Mismatch in ${(figmaEl.role as ElementRole) || 'element'}: expected "${figmaEl.text}" but found "${bestMatch.text}"`
          };
          diffs.push(visualDiff);
        }

        // Compare font size
        if (figmaEl.fontSize && bestMatch.styles.fontSize) {
          const domFontSize = parseInt(bestMatch.styles.fontSize);
          if (!isNaN(domFontSize) && Math.abs(figmaEl.fontSize - domFontSize) > 2) {
            // Create a new VisualDiff with a generated ID
            const fontDiff: VisualDiff = {
              id: `font-size-diff-${Date.now()}-${index}`,
              type: 'font-size' as IssueType,
              figmaBox: figmaEl.boundingBox,
              domBox: {
                x: bestMatch.position.x,
                y: bestMatch.position.y,
                width: bestMatch.position.width,
                height: bestMatch.position.height,
              },
              figmaValue: `${figmaEl.fontSize}px`,
              liveValue: bestMatch.styles.fontSize,
              severity: 'low' as Severity,
              role: (figmaEl.role as ElementRole) || 'other',
              description: `${(figmaEl.role as ElementRole) || 'element'} "${figmaEl.text || figmaEl.type || 'element'}" has font-size ${bestMatch.styles.fontSize} (expected ${figmaEl.fontSize}px)`
            };
            diffs.push(fontDiff);
          }
        }

        // Compare colors
        if (figmaEl.color && bestMatch.styles.color && figmaEl.color !== bestMatch.styles.color) {
          const diff: VisualDiff = {
            id: `color-diff-${Date.now()}-${index}`,
            type: 'color' as IssueType,
            figmaBox: figmaEl.boundingBox,
            domBox: {
              x: bestMatch.position.x,
              y: bestMatch.position.y,
              width: bestMatch.position.width,
              height: bestMatch.position.height,
            },
            figmaValue: figmaEl.color,
            liveValue: bestMatch.styles.color,
            severity: 'medium' as Severity,
            role: (figmaEl.role as ElementRole) || 'other',
            description: `${(figmaEl.role as ElementRole) || 'element'} "${figmaEl.text || figmaEl.type || 'element'}" has color ${bestMatch.styles.color} (expected ${figmaEl.color})`
          };
          diffs.push(diff);
        }
      } else {
        // Element exists in Figma but not found in DOM
        const diff: VisualDiff = {
          id: `missing-element-${Date.now()}-${index}`,
          type: 'missing' as IssueType,
          figmaBox: figmaEl.boundingBox,
          domBox: { x: 0, y: 0, width: 0, height: 0 },
          figmaValue: figmaEl.text || figmaEl.type || 'element',
          liveValue: 'Missing',
          severity: 'high' as Severity,
          role: (figmaEl.role as ElementRole) || 'other',
          description: `${(figmaEl.role as ElementRole) || 'element'} "${figmaEl.text || figmaEl.type || 'element'}" is present in design but missing on the page`
        };
        diffs.push(diff);
      }
    }

    return diffs;
  }

  /**
   * Generate complete visual comparison between Figma design and live website
   */
  async generateVisualComparison(
    websiteUrl: string,
    figmaToken: string,
    figmaFileId: string,
    figmaFrameId: string,
    domAnalysis: WebsiteAnalysis
  ): Promise<VisualComparisonData> {
    try {
      console.log('Generating visual comparison...');

      // Capture screenshots in parallel
      const [figmaScreenshot, liveScreenshot, figmaFrameData] = await Promise.all([
        this.captureFigmaScreenshot(figmaToken, figmaFileId, figmaFrameId),
        this.captureWebsiteScreenshot(websiteUrl),
        this.getFigmaFrameData(figmaToken, figmaFileId, figmaFrameId)
      ]);

      // Extract elements from Figma frame
      const figmaElements = this.extractFigmaElements({
        ...figmaFrameData,
        type: 'FRAME',
        // Ensure we have a proper FigmaNode structure
        children: figmaFrameData.children || []
      });
      
      // Compare elements and generate diffs
      const diffs = await this.compareElements(figmaElements, domAnalysis.elements);

      console.log(`Visual comparison complete. Found ${diffs.length} differences.`);
      console.log(`Extracted ${figmaElements.length} text elements from Figma.`);
      console.log(`Available ${domAnalysis.elements.length} DOM elements for comparison.`);

      // Log sample of text elements found
      const textElements = figmaElements.filter(el => el.text).slice(0, 5);
      console.log('Sample Figma text elements:', textElements.map(el => ({ text: el.text, role: el.role })));

      // Calculate dimensions from elements or use defaults
      const allBoxes = [
        ...figmaElements.map(el => el.boundingBox),
        ...domAnalysis.elements.map(el => el.position)
      ];

      const maxWidth = allBoxes.length > 0 ?
        Math.max(...allBoxes.map(box => box.x + box.width)) : 1440;
      const maxHeight = allBoxes.length > 0 ?
        Math.max(...allBoxes.map(box => box.y + box.height)) : 900;

      return {
        diffs,
        diffImage: '', // This would be generated by an image diffing library
        similarity: Math.max(0, 1 - (diffs.length / Math.max(figmaElements.length, 1)) * 0.5),
        figmaScreenshot,
        liveScreenshot,
        metadata: {
          figmaDimensions: {
            width: figmaFrameData.absoluteBoundingBox?.width || Math.ceil(maxWidth),
            height: figmaFrameData.absoluteBoundingBox?.height || Math.ceil(maxHeight)
          },
          liveDimensions: {
            width: Math.ceil(maxWidth),
            height: Math.ceil(maxHeight)
          }
        }
      };
    } catch (error) {
      console.error('Error generating visual comparison:', error);
      throw error;
    }
  }
}

// Singleton instance
let visualComparisonService: VisualComparisonService | null = null;

export function getVisualComparisonService(): VisualComparisonService {
  if (!visualComparisonService) {
    visualComparisonService = new VisualComparisonService();
  }
  return visualComparisonService;
} 