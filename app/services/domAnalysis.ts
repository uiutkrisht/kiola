import puppeteer, { Browser } from 'puppeteer';

export interface ElementDetails {
  id: string;
  tagName: string;
  text: string;
  textContent: string;
  role: string;
  styles: {
    fontSize: string;
    fontFamily: string;
    fontWeight: string;
    color: string;
    backgroundColor: string;
    width: string;
    height: string;
    padding: string;
    margin: string;
    borderRadius: string;
    border: string;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes: Record<string, string>;
  hierarchy: string[];
}

export interface WebsiteAnalysis {
  url: string;
  elements: ElementDetails[];
  headings: ElementDetails[];
  buttons: ElementDetails[];
  images: ElementDetails[];
  links: ElementDetails[];
  metadata: {
    title: string;
    totalElements: number;
    uniqueFonts: string[];
    uniqueColors: string[];
  };
}

export interface DesignIssue {
  type: 'typography' | 'color' | 'spacing' | 'content' | 'layout';
  severity: 'high' | 'medium' | 'low';
  element: string;
  issue: string;
  currentValue?: string;
  suggestion?: string;
  details?: {
    text?: string;
    font?: string;
    fontSize?: string;
    color?: string;
    backgroundColor?: string;
  };
}

export class DOMAnalysisService {
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

  async analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
    const browser = await this.init();
    const page = await browser.newPage();

    try {
      console.log('Analyzing DOM of:', url);

      await page.setViewport({ width: 1440, height: 900 });
      
      // Use more forgiving navigation strategy
      try {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
      } catch (error) {
        console.log('DOM analysis: domcontentloaded failed, trying load strategy');
        try {
          await page.goto(url, { 
            waitUntil: 'load',
            timeout: 45000 
          });
        } catch (loadError) {
          console.log('DOM analysis: load strategy failed, trying basic navigation');
          await page.goto(url, { timeout: 30000 });
        }
      }

      // Wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract detailed element information
      const analysis = await page.evaluate(() => {
        const elements: ElementDetails[] = [];
        const headings: ElementDetails[] = [];
        const buttons: ElementDetails[] = [];
        const images: ElementDetails[] = [];
        const links: ElementDetails[] = [];

        // Get all visible elements
        const allElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && 
                 style.display !== 'none' && 
                 style.visibility !== 'hidden' &&
                 style.opacity !== '0';
        });

        const getHierarchy = (element: Element): string[] => {
          const hierarchy: string[] = [];
          let current = element;
          while (current && current !== document.body) {
            const tag = current.tagName.toLowerCase();
            const id = current.id ? `#${current.id}` : '';
            // Safely handle className - it might not be a string
            let classes = '';
            if (current.className && typeof current.className === 'string' && current.className.trim()) {
              classes = `.${current.className.trim().split(' ').filter(c => c).join('.')}`;
            }
            hierarchy.unshift(`${tag}${id}${classes}`);
            current = current.parentElement!;
          }
          return hierarchy;
        };

        const extractElementDetails = (element: Element): ElementDetails => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          
          // Get clean text content
          const textContent = element.textContent?.trim() || '';
          const ownText = Array.from(element.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent?.trim())
            .filter(text => text)
            .join(' ');

          // Extract attributes
          const attributes: Record<string, string> = {};
          Array.from(element.attributes).forEach(attr => {
            attributes[attr.name] = attr.value;
          });

          const tag = element.tagName.toLowerCase();
          const role = (() => {
            const fontSizeNum = parseFloat(style.fontSize);
            const fontWeightNum = parseInt(style.fontWeight);
            if (['h1','h2','h3','h4','h5','h6'].includes(tag)) return 'heading';
            if (tag === 'button' || (tag === 'a' && element.getAttribute('role') === 'button')) return 'button';
            if (fontSizeNum >= 20 && fontWeightNum >= 600) return 'heading';
            if (ownText.length < 45) return 'label';
            return 'paragraph';
          })();

          return {
            id: element.id || `${element.tagName.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`,
            tagName: element.tagName.toLowerCase(),
            text: ownText,
            textContent: textContent,
            role,
            styles: {
              fontSize: style.fontSize,
              fontFamily: style.fontFamily.replace(/['"]/g, '').split(',')[0].trim(),
              fontWeight: style.fontWeight,
              color: style.color,
              backgroundColor: style.backgroundColor,
              width: style.width,
              height: style.height,
              padding: style.padding,
              margin: style.margin,
              borderRadius: style.borderRadius,
              border: style.border
            },
            position: {
              x: Math.round(rect.left + window.scrollX),
              y: Math.round(rect.top + window.scrollY),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            attributes,
            hierarchy: getHierarchy(element)
          };
        };

        // Process elements and categorize them
        allElements.forEach(element => {
          const details = extractElementDetails(element);
          elements.push(details);

          // Categorize elements
          const tag = element.tagName.toLowerCase();
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            headings.push(details);
          } else if (tag === 'button' || (tag === 'a' && element.getAttribute('role') === 'button')) {
            buttons.push(details);
          } else if (tag === 'img') {
            images.push(details);
          } else if (tag === 'a') {
            links.push(details);
          }
        });

        // Extract metadata
        const uniqueFonts = Array.from(new Set(elements.map(el => el.styles.fontFamily)));
        const uniqueColors = Array.from(new Set(elements.map(el => el.styles.color).filter(color => color && color !== 'rgba(0, 0, 0, 0)')));

        return {
          url: window.location.href,
          elements: elements.slice(0, 100), // Limit for performance
          headings,
          buttons,
          images,
          links,
          metadata: {
            title: document.title,
            totalElements: elements.length,
            uniqueFonts,
            uniqueColors
          }
        };
      });

      console.log(`Deep DOM analysis complete. Found: ${analysis.elements.length} elements, ${analysis.headings.length} headings, ${analysis.buttons.length} buttons`);
      return analysis;

    } catch (error) {
      console.error('Error analyzing DOM:', error);
      throw new Error(`Failed to analyze website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private rgbToHex(rgb: string): string {
    if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return 'transparent';
    
    const rgbMatch = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!rgbMatch) return rgb;
    
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private cleanFontFamily(fontFamily: string): string {
    if (!fontFamily) return 'Unknown';
    
    // Remove quotes and extra spaces
    return fontFamily
      .split(',')[0]
      .replace(/['"]/g, '')
      .trim();
  }

  private detectFontIssues(elements: ElementDetails[]): DesignIssue[] {
    const issues: DesignIssue[] = [];
    const fontCounts = new Map<string, number>();
    
    // Count font usage
    elements.forEach(el => {
      const cleanFont = this.cleanFontFamily(el.styles.fontFamily);
      fontCounts.set(cleanFont, (fontCounts.get(cleanFont) || 0) + 1);
    });

    // Flag if too many different fonts are used
    if (fontCounts.size > 4) {
      issues.push({
        type: 'typography',
        severity: 'medium',
        element: 'GLOBAL',
        issue: `Too many font families detected (${fontCounts.size}). Consider reducing for consistency.`,
        suggestion: 'Use 2-3 font families maximum for better design consistency'
      });
    }

    // Check for common web-safe fonts vs custom fonts
    const webSafeFonts = ['Arial', 'Helvetica', 'Times', 'Georgia', 'Verdana', 'Tahoma'];
    Array.from(fontCounts.keys()).forEach(font => {
      if (webSafeFonts.some(safe => font.toLowerCase().includes(safe.toLowerCase()))) {
        issues.push({
          type: 'typography',
          severity: 'low',
          element: 'FONT',
          issue: `Using web-safe font: ${font}`,
          suggestion: 'Consider using custom fonts that match your Figma design',
          details: { font }
        });
      }
    });

    return issues;
  }

  private detectColorIssues(elements: ElementDetails[]): DesignIssue[] {
    const issues: DesignIssue[] = [];
    const textColors = new Map<string, number>();
    const bgColors = new Map<string, number>();

    elements.forEach(el => {
      const textColor = this.rgbToHex(el.styles.color);
      const bgColor = this.rgbToHex(el.styles.backgroundColor);
      
      if (textColor !== 'transparent') {
        textColors.set(textColor, (textColors.get(textColor) || 0) + 1);
      }
      if (bgColor !== 'transparent') {
        bgColors.set(bgColor, (bgColors.get(bgColor) || 0) + 1);
      }
    });

    // Flag too many text colors
    if (textColors.size > 5) {
      issues.push({
        type: 'color',
        severity: 'medium',
        element: 'TEXT_COLORS',
        issue: `Too many text colors detected (${textColors.size}). This may indicate inconsistent styling.`,
        suggestion: 'Limit text colors to 3-4 for better visual hierarchy'
      });
    }

    return issues;
  }

  private detectContentIssues(elements: ElementDetails[]): DesignIssue[] {
    const issues: DesignIssue[] = [];

    elements.forEach(el => {
      // Check for placeholder text
      const placeholderTexts = ['lorem ipsum', 'placeholder', 'sample text', 'text here', 'your text'];
      if (placeholderTexts.some(placeholder => 
        el.text.toLowerCase().includes(placeholder)
      )) {
        issues.push({
          type: 'content',
          severity: 'high',
          element: el.tagName.toUpperCase(),
          issue: 'Placeholder text detected in live site',
          suggestion: 'Replace with actual content from Figma design',
          details: { text: el.text.substring(0, 50) + '...' }
        });
      }

      // Check for very long text in buttons
      if (el.tagName === 'button' && el.text.length > 20) {
        issues.push({
          type: 'content',
          severity: 'medium',
          element: 'BUTTON',
          issue: 'Button text might be too long',
          suggestion: 'Consider shorter, more actionable button text',
          details: { text: el.text }
        });
      }
    });

    return issues;
  }

  async compareContent(_figmaData: any, domAnalysis: WebsiteAnalysis): Promise<DesignIssue[]> {
    const issues: DesignIssue[] = [];

    // Detect font issues
    issues.push(...this.detectFontIssues(domAnalysis.elements));
    
    // Detect color issues
    issues.push(...this.detectColorIssues(domAnalysis.elements));
    
    // Detect content issues
    issues.push(...this.detectContentIssues(domAnalysis.elements));

    // Add specific element findings only if they indicate issues
    domAnalysis.buttons.forEach((button: ElementDetails) => {
      if (button.text.toLowerCase().includes('click') || button.text.toLowerCase().includes('button')) {
        issues.push({
          type: 'content',
          severity: 'medium',
          element: 'BUTTON',
          issue: 'Generic button text detected',
          suggestion: 'Use specific, action-oriented button text from Figma design',
          details: {
            text: button.text,
            font: this.cleanFontFamily(button.styles.fontFamily),
            fontSize: button.styles.fontSize,
            color: this.rgbToHex(button.styles.color),
            backgroundColor: this.rgbToHex(button.styles.backgroundColor)
          }
        });
      }
    });

    // Only return significant issues, not everything found
    return issues.filter(issue => issue.severity === 'high' || issue.severity === 'medium');
  }
}

// Singleton instance
let domAnalysisService: DOMAnalysisService | null = null;

export function getDOMAnalysisService(): DOMAnalysisService {
  if (!domAnalysisService) {
    domAnalysisService = new DOMAnalysisService();
  }
  return domAnalysisService;
} 