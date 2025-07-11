import sharp from 'sharp';
import pixelmatch from 'pixelmatch';

export interface ComparisonResult {
  overallScore: number;
  pixelDifference: number;
  totalPixels: number;
  diffPercentage: number;
  analysis: {
    layoutMatch: number;
    colorSimilarity: number;
    structuralSimilarity: number;
  };
  feedback: string[];
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export class ImageComparisonService {
  
  async getImageDimensions(imageBuffer: Buffer): Promise<ImageDimensions> {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  }

  async resizeImage(imageBuffer: Buffer, width: number, height: number): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
  }

  async downloadImage(url: string): Promise<Buffer> {
    try {
      console.log('Downloading image from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error downloading image:', error);
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async compareImages(figmaImageUrl: string, websiteScreenshot: Buffer): Promise<ComparisonResult> {
    try {
      console.log('Starting image comparison...');

      // Download the Figma image
      const figmaImageBuffer = await this.downloadImage(figmaImageUrl);

      // Get dimensions of both images
      const figmaDimensions = await this.getImageDimensions(figmaImageBuffer);
      const websiteDimensions = await this.getImageDimensions(websiteScreenshot);

      console.log('Image dimensions:', {
        figma: figmaDimensions,
        website: websiteDimensions
      });

      // Determine target dimensions (use larger dimensions)
      const targetWidth = Math.max(figmaDimensions.width, websiteDimensions.width);
      const targetHeight = Math.max(figmaDimensions.height, websiteDimensions.height);

      // Resize both images to the same dimensions
      const [resizedFigma, resizedWebsite] = await Promise.all([
        this.resizeImage(figmaImageBuffer, targetWidth, targetHeight),
        this.resizeImage(websiteScreenshot, targetWidth, targetHeight)
      ]);

      // Convert to RGBA for pixelmatch
      const figmaRGBA = await sharp(resizedFigma).raw().ensureAlpha().toBuffer();
      const websiteRGBA = await sharp(resizedWebsite).raw().ensureAlpha().toBuffer();

      // Create diff buffer
      const diffBuffer = Buffer.alloc(figmaRGBA.length);

      // Compare images using pixelmatch
      const pixelDifference = pixelmatch(
        figmaRGBA,
        websiteRGBA,
        diffBuffer,
        targetWidth,
        targetHeight,
        { threshold: 0.1 }
      );

      const totalPixels = targetWidth * targetHeight;
      const diffPercentage = (pixelDifference / totalPixels) * 100;
      const overallScore = Math.max(0, 100 - diffPercentage);

      // Analyze specific aspects
      const analysis = await this.analyzeImageDifferences(figmaRGBA, websiteRGBA, targetWidth, targetHeight);

      // Generate feedback
      const feedback = this.generateFeedback(overallScore, diffPercentage, analysis);

      const result: ComparisonResult = {
        overallScore: Math.round(overallScore * 100) / 100,
        pixelDifference,
        totalPixels,
        diffPercentage: Math.round(diffPercentage * 100) / 100,
        analysis,
        feedback
      };

      console.log('Comparison complete:', result);
      return result;

    } catch (error) {
      console.error('Error in image comparison:', error);
      throw new Error(`Image comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeImageDifferences(
    figmaRGBA: Buffer,
    websiteRGBA: Buffer,
    width: number,
    height: number
  ) {
    // Basic analysis - this can be enhanced with more sophisticated algorithms
    let colorDifferences = 0;
    let structuralDifferences = 0;
    const sampleSize = Math.min(1000, Math.floor((width * height) / 100)); // Sample 1% of pixels

    for (let i = 0; i < sampleSize; i++) {
      const pixelIndex = Math.floor(Math.random() * (width * height)) * 4;
      
      // Color similarity
      const figmaR = figmaRGBA[pixelIndex];
      const figmaG = figmaRGBA[pixelIndex + 1];
      const figmaB = figmaRGBA[pixelIndex + 2];
      
      const websiteR = websiteRGBA[pixelIndex];
      const websiteG = websiteRGBA[pixelIndex + 1];
      const websiteB = websiteRGBA[pixelIndex + 2];

      const colorDistance = Math.sqrt(
        Math.pow(figmaR - websiteR, 2) +
        Math.pow(figmaG - websiteG, 2) +
        Math.pow(figmaB - websiteB, 2)
      );

      if (colorDistance > 50) {
        colorDifferences++;
      }

      // Simple structural analysis (can be enhanced)
      const figmaLuminance = 0.299 * figmaR + 0.587 * figmaG + 0.114 * figmaB;
      const websiteLuminance = 0.299 * websiteR + 0.587 * websiteG + 0.114 * websiteB;

      if (Math.abs(figmaLuminance - websiteLuminance) > 30) {
        structuralDifferences++;
      }
    }

    return {
      layoutMatch: Math.max(0, 100 - (structuralDifferences / sampleSize) * 100),
      colorSimilarity: Math.max(0, 100 - (colorDifferences / sampleSize) * 100),
      structuralSimilarity: Math.max(0, 100 - (structuralDifferences / sampleSize) * 100)
    };
  }

  private generateFeedback(overallScore: number, diffPercentage: number, analysis: any): string[] {
    const feedback: string[] = [];

    if (overallScore >= 90) {
      feedback.push("🎉 Excellent match! Your implementation closely matches the Figma design.");
    } else if (overallScore >= 80) {
      feedback.push("✅ Good match! Minor differences detected.");
    } else if (overallScore >= 60) {
      feedback.push("⚠️ Moderate differences found. Consider reviewing the layout and styling.");
    } else {
      feedback.push("❌ Significant differences detected. Major revisions may be needed.");
    }

    if (analysis.colorSimilarity < 70) {
      feedback.push("🎨 Color differences detected. Check background colors, text colors, and brand colors.");
    }

    if (analysis.layoutMatch < 70) {
      feedback.push("📐 Layout differences found. Review spacing, positioning, and element sizes.");
    }

    if (analysis.structuralSimilarity < 70) {
      feedback.push("🏗️ Structural differences detected. Check if elements are missing or positioned differently.");
    }

    if (diffPercentage < 5) {
      feedback.push("✨ Pixel-perfect implementation!");
    } else if (diffPercentage < 15) {
      feedback.push("👍 Very close implementation with minor pixel differences.");
    }

    return feedback;
  }
}

// Create a singleton instance
let imageComparisonService: ImageComparisonService | null = null;

export function getImageComparisonService(): ImageComparisonService {
  if (!imageComparisonService) {
    imageComparisonService = new ImageComparisonService();
  }
  return imageComparisonService;
} 