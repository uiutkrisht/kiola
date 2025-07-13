import { FigmaAnalysis, FigmaTextElement } from './figmaAnalysis';
import { WebsiteAnalysis, ElementDetails } from './domAnalysis';

export interface ElementMatch {
  figmaElement: FigmaTextElement;
  websiteElement: ElementDetails | null;
  matchScore: number;
  differences: ElementDifference[];
}

export interface ElementDifference {
  type: 'text' | 'font-family' | 'font-size' | 'font-weight' | 'color' | 'missing' | 'extra' | 'positioning';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  expected: string;
  actual: string;
  suggestion: string;
}

export interface DetailedComparisonResult {
  overallScore: number;
  elementMatches: ElementMatch[];
  criticalIssues: ElementDifference[];
  summary: {
    totalElements: number;
    matchedElements: number;
    missingElements: number;
    extraElements: number;
    textMismatches: number;
    styleMismatches: number;
  };
  qualityReport: {
    contentAccuracy: number;
    typographyAccuracy: number;
    colorAccuracy: number;
    layoutAccuracy: number;
    overallReadiness: 'production-ready' | 'needs-review' | 'needs-major-fixes';
  };
}

export class DetailedComparisonService {
  private normalizeText(text: string): string {
    return text.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    const norm1 = this.normalizeText(text1);
    const norm2 = this.normalizeText(text2);
    
    if (norm1 === norm2) return 1;
    
    // Levenshtein distance for similarity
    const matrix = Array(norm2.length + 1).fill(null).map(() => Array(norm1.length + 1).fill(null));
    
    for (let i = 0; i <= norm1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= norm2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= norm2.length; j++) {
      for (let i = 1; i <= norm1.length; i++) {
        const substitutionCost = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    
    const maxLength = Math.max(norm1.length, norm2.length);
    return maxLength === 0 ? 1 : 1 - (matrix[norm2.length][norm1.length] / maxLength);
  }

  private rgbToHex(rgb: string): string {
    if (rgb.startsWith('#')) return rgb;
    
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!match) return rgb;
    
    const [, r, g, b] = match;
    const toHex = (n: string) => {
      const hex = parseInt(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private parsePixelValue(value: string): number {
    const match = value.match(/^([\d.]+)px$/);
    return match ? parseFloat(match[1]) : 0;
  }

  private parseFontWeight(weight: string | number): number {
    if (typeof weight === 'number') return weight;
    
    const weightMap: Record<string, number> = {
      'normal': 400,
      'bold': 700,
      '100': 100,
      '200': 200,
      '300': 300,
      '400': 400,
      '500': 500,
      '600': 600,
      '700': 700,
      '800': 800,
      '900': 900
    };
    
    return weightMap[weight.toString()] || 400;
  }

  private findBestMatch(figmaElement: FigmaTextElement, websiteElements: ElementDetails[]): ElementDetails | null {
    let bestMatch: ElementDetails | null = null;
    let bestScore = 0;

    for (const webElement of websiteElements) {
      let score = 0;

      // Text similarity (most important)
      const textSimilarity = this.calculateTextSimilarity(figmaElement.text, webElement.textContent);
      score += textSimilarity * 0.6;

      // Tag type similarity
      if (figmaElement.name.toLowerCase().includes('heading') || figmaElement.name.toLowerCase().includes('title')) {
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(webElement.tagName)) {
          score += 0.2;
        }
      } else if (figmaElement.name.toLowerCase().includes('button')) {
        if (webElement.tagName === 'button' || webElement.attributes.role === 'button') {
          score += 0.2;
        }
      }

      // Position similarity (approximate)
      const positionSimilarity = 1 - Math.abs(figmaElement.position.y - webElement.position.y) / 1000;
      score += Math.max(0, positionSimilarity) * 0.2;

      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = webElement;
      }
    }

    return bestMatch;
  }

  private compareElements(figmaElement: FigmaTextElement, websiteElement: ElementDetails): ElementDifference[] {
    const differences: ElementDifference[] = [];

    // Text content comparison
    if (this.normalizeText(figmaElement.text) !== this.normalizeText(websiteElement.textContent)) {
      differences.push({
        type: 'text',
        severity: 'critical',
        description: 'Text content does not match design',
        expected: figmaElement.text,
        actual: websiteElement.textContent,
        suggestion: `Update text content to: "${figmaElement.text}"`
      });
    }

    // Font family comparison
    const figmaFont = figmaElement.styles.fontFamily.toLowerCase();
    const webFont = websiteElement.styles.fontFamily.toLowerCase();
    if (!webFont.includes(figmaFont) && !figmaFont.includes(webFont)) {
      differences.push({
        type: 'font-family',
        severity: 'high',
        description: 'Font family does not match design',
        expected: figmaElement.styles.fontFamily,
        actual: websiteElement.styles.fontFamily,
        suggestion: `Update font-family to: ${figmaElement.styles.fontFamily}`
      });
    }

    // Font size comparison
    const figmaSize = figmaElement.styles.fontSize;
    const webSize = this.parsePixelValue(websiteElement.styles.fontSize);
    const sizeDifference = Math.abs(figmaSize - webSize);
    if (sizeDifference > 2) {
      differences.push({
        type: 'font-size',
        severity: sizeDifference > 6 ? 'high' : 'medium',
        description: 'Font size does not match design',
        expected: `${figmaSize}px`,
        actual: websiteElement.styles.fontSize,
        suggestion: `Update font-size to: ${figmaSize}px`
      });
    }

    // Font weight comparison
    const figmaWeight = figmaElement.styles.fontWeight;
    const webWeight = this.parseFontWeight(websiteElement.styles.fontWeight);
    if (Math.abs(figmaWeight - webWeight) > 100) {
      differences.push({
        type: 'font-weight',
        severity: 'medium',
        description: 'Font weight does not match design',
        expected: figmaWeight.toString(),
        actual: websiteElement.styles.fontWeight,
        suggestion: `Update font-weight to: ${figmaWeight}`
      });
    }

    // Color comparison
    if (figmaElement.fills.length > 0) {
      const figmaColor = figmaElement.fills[0].hex.toLowerCase();
      const webColor = this.rgbToHex(websiteElement.styles.color).toLowerCase();
      
      if (figmaColor !== webColor) {
        differences.push({
          type: 'color',
          severity: 'medium',
          description: 'Text color does not match design',
          expected: figmaColor,
          actual: webColor,
          suggestion: `Update color to: ${figmaColor}`
        });
      }
    }

    return differences;
  }

  compare(figmaAnalysis: FigmaAnalysis, websiteAnalysis: WebsiteAnalysis): DetailedComparisonResult {
    console.log('Starting detailed element-by-element comparison...');
    
    const elementMatches: ElementMatch[] = [];
    const allDifferences: ElementDifference[] = [];
    
    // Compare each Figma text element with website elements
    for (const figmaElement of figmaAnalysis.textElements) {
      const bestMatch = this.findBestMatch(figmaElement, websiteAnalysis.elements);
      const differences = bestMatch ? this.compareElements(figmaElement, bestMatch) : [];
      
      // If no match found, mark as missing
      if (!bestMatch) {
        differences.push({
          type: 'missing',
          severity: 'critical',
          description: 'Element from design is missing on website',
          expected: figmaElement.text,
          actual: 'Not found',
          suggestion: `Add missing element: "${figmaElement.text}"`
        });
      }

      const matchScore = bestMatch ? 
        1 - (differences.length * 0.2) : 0;

      elementMatches.push({
        figmaElement,
        websiteElement: bestMatch,
        matchScore: Math.max(0, matchScore),
        differences
      });

      allDifferences.push(...differences);
    }

    // Calculate quality metrics
    const totalElements = figmaAnalysis.textElements.length;
    const matchedElements = elementMatches.filter(m => m.websiteElement !== null).length;
    const missingElements = totalElements - matchedElements;
    const textMismatches = allDifferences.filter(d => d.type === 'text').length;
    const styleMismatches = allDifferences.filter(d => ['font-family', 'font-size', 'font-weight', 'color'].includes(d.type)).length;

    const contentAccuracy = totalElements > 0 ? ((totalElements - textMismatches - missingElements) / totalElements) * 100 : 100;
    const typographyAccuracy = totalElements > 0 ? ((totalElements - styleMismatches) / totalElements) * 100 : 100;
    const colorAccuracy = totalElements > 0 ? ((totalElements - allDifferences.filter(d => d.type === 'color').length) / totalElements) * 100 : 100;
    const layoutAccuracy = totalElements > 0 ? (matchedElements / totalElements) * 100 : 100;

    const overallScore = (contentAccuracy + typographyAccuracy + colorAccuracy + layoutAccuracy) / 4;

    const criticalIssues = allDifferences.filter(d => d.severity === 'critical');
    
    let overallReadiness: 'production-ready' | 'needs-review' | 'needs-major-fixes';
    if (criticalIssues.length === 0 && overallScore >= 95) {
      overallReadiness = 'production-ready';
    } else if (criticalIssues.length <= 2 && overallScore >= 85) {
      overallReadiness = 'needs-review';
    } else {
      overallReadiness = 'needs-major-fixes';
    }

    console.log(`Detailed comparison complete: ${overallScore.toFixed(1)}% match, ${criticalIssues.length} critical issues`);

    return {
      overallScore,
      elementMatches,
      criticalIssues,
      summary: {
        totalElements,
        matchedElements,
        missingElements,
        extraElements: 0, // TODO: Implement detection of extra elements
        textMismatches,
        styleMismatches
      },
      qualityReport: {
        contentAccuracy,
        typographyAccuracy,
        colorAccuracy,
        layoutAccuracy,
        overallReadiness
      }
    };
  }
}

// Singleton instance
let detailedComparisonService: DetailedComparisonService | null = null;

export function getDetailedComparisonService(): DetailedComparisonService {
  if (!detailedComparisonService) {
    detailedComparisonService = new DetailedComparisonService();
  }
  return detailedComparisonService;
} 