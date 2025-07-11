interface FigmaNode {
  id: string;
  name: string;
  type: string;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children?: FigmaNode[];
}

interface FigmaFile {
  name: string;
  lastModified: string;
  version: string;
  document: FigmaNode;
  components: Record<string, any>;
  schemaVersion: number;
  styles: Record<string, any>;
}

interface FigmaError {
  status: number;
  err: string;
}

export class FigmaService {
  private baseUrl = 'https://api.figma.com/v1';
  private accessToken: string;

  constructor() {
    const token = process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      throw new Error('Figma access token is not configured');
    }
    this.accessToken = token;
  }

  private async fetchFigma(endpoint: string) {
    const fullUrl = `${this.baseUrl}${endpoint}`;
    console.log('Fetching from Figma:', fullUrl);
    
    try {
      const response = await fetch(fullUrl, {
        headers: {
          'X-Figma-Token': this.accessToken,
        },
      });

      const data = await response.json();
      console.log('Figma API response:', {
        url: fullUrl,
        status: response.status,
        ok: response.ok,
        error: !response.ok ? data : undefined
      });

      if (!response.ok) {
        throw new Error(
          (data as FigmaError).err || `Figma API error: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  async getFile(fileKey: string): Promise<FigmaFile> {
    try {
      console.log('Getting file with key:', fileKey);
      return await this.fetchFigma(`/files/${fileKey}`);
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  async getNode(fileKey: string, nodeId: string) {
    try {
      console.log('=== STARTING NODE LOOKUP ===');
      console.log('Getting node with:', { fileKey, nodeId });
      
      // First verify the file exists and we have access
      try {
        const fileData = await this.getFile(fileKey);
        console.log('File access verified:', {
          fileName: fileData.name,
          fileVersion: fileData.version
        });
      } catch (error) {
        console.error('Error accessing file:', error);
        if (error instanceof Error && error.message.includes('Not found')) {
          throw new Error('Could not access the Figma file. The file might not exist or you might not have permission to view it.');
        }
        throw error;
      }

      // Then get the specific node
      console.log('Making API call to get node...');
      const response = await this.fetchFigma(`/files/${fileKey}/nodes?ids=${nodeId}`);
      
      console.log('=== FULL API RESPONSE ===');
      console.log(JSON.stringify(response, null, 2));
      
      if (!response.nodes) {
        console.error('No nodes property in response');
        throw new Error('Invalid response from Figma API - no nodes property');
      }

      console.log('Available nodes in response:', Object.keys(response.nodes));
      console.log('Looking for node ID:', nodeId);

      const node = response.nodes[nodeId];
      if (!node) {
        console.error('=== NODE NOT FOUND ===');
        console.error('Requested node ID:', nodeId);
        console.error('Available node IDs:', Object.keys(response.nodes));
        
        // Try to find similar node IDs
        const availableIds = Object.keys(response.nodes);
        const possibleMatches = availableIds.filter(id => 
          id.includes(nodeId) || nodeId.includes(id)
        );
        
        if (possibleMatches.length > 0) {
          console.log('Possible similar node IDs found:', possibleMatches);
        }
        
        throw new Error(`Frame not found. Requested: ${nodeId}, Available: ${availableIds.join(', ')}`);
      }

      // Verify that the node is actually a frame
      const document = node.document;
      console.log('=== NODE DOCUMENT ===');
      console.log(JSON.stringify(document, null, 2));

      if (!document) {
        throw new Error('Invalid node structure received from Figma');
      }

      // Accept both FRAME and COMPONENT types since components are also valid top-level elements
      if (document.type !== 'FRAME' && document.type !== 'COMPONENT' && document.type !== 'COMPONENT_SET') {
        console.error('Invalid node type:', document.type);
        throw new Error(`Selected element must be a Frame or Component (found: ${document.type}). Please select a Frame in Figma and copy its link.`);
      }

      console.log('=== SUCCESS ===');
      console.log('Successfully found frame:', {
        name: document.name,
        type: document.type,
        id: nodeId
      });

      return response;
    } catch (error) {
      console.error('=== ERROR IN getNode ===');
      console.error('Error fetching node:', error);
      throw error;
    }
  }

  async getImage(fileKey: string, nodeId: string) {
    try {
      // First, verify that the node exists and is valid
      await this.getNode(fileKey, nodeId);

      // Try different scales if needed
      const scales = [1, 2];
      let lastError: Error | null = null;

      for (const scale of scales) {
        try {
          console.log(`=== TRYING IMAGE GENERATION AT SCALE ${scale} ===`);
          const response = await this.fetchFigma(
            `/images/${fileKey}?ids=${nodeId}&format=png&scale=${scale}`
          );

          console.log('Image API Response:', JSON.stringify(response, null, 2));

          if (response.err) {
            console.error('Image API returned error:', response.err);
            throw new Error(response.err || 'Unknown image generation error');
          }

          if (response.images && response.images[nodeId]) {
            console.log('=== IMAGE GENERATION SUCCESS ===');
            console.log('Image URL:', response.images[nodeId]);
            return {
              url: response.images[nodeId],
              scale
            };
          } else {
            console.error('No image URL in response for node:', nodeId);
            console.error('Available image keys:', response.images ? Object.keys(response.images) : 'no images object');
            throw new Error('No image URL returned from Figma API');
          }
        } catch (error) {
          console.error(`Error fetching image at scale ${scale}:`, error);
          lastError = error instanceof Error ? error : new Error('Unknown error occurred');
        }
      }

      // If we get here, none of the scales worked
      console.error('=== ALL IMAGE GENERATION ATTEMPTS FAILED ===');
      throw lastError || new Error(
        'Failed to get image URL from Figma. This could be because the frame is empty, too large, or positioned unusually.'
      );
    } catch (error) {
      console.error('Error in getImage:', error);
      throw error instanceof Error 
        ? error 
        : new Error('Failed to get image from Figma');
    }
  }

  static cleanFigmaUrl(url: string): string {
    const cleaned = url.trim().startsWith('@') ? url.trim().substring(1) : url.trim();
    console.log('Cleaned URL:', cleaned);
    return cleaned;
  }

  static extractFileKey(figmaUrl: string): string {
    try {
      const cleanUrl = this.cleanFigmaUrl(figmaUrl);
      const url = new URL(cleanUrl);
      
      console.log('Extracting file key from URL:', {
        originalUrl: figmaUrl,
        cleanUrl,
        hostname: url.hostname,
        pathname: url.pathname,
      });

      // Check if it's a valid Figma URL
      if (!url.hostname.includes('figma.com')) {
        throw new Error('Not a Figma URL. Please use a URL from Figma.com');
      }

      // Split the pathname into parts and remove empty strings
      const pathParts = url.pathname.split('/').filter(Boolean);
      console.log('Path parts:', pathParts);

      // Handle design URLs (new format)
      if (pathParts[0] === 'design' && pathParts[1]) {
        // For design URLs, we use the key directly
        const key = pathParts[1];
        console.log('Found design URL format, using key:', key);
        return key;
      }

      // Handle file URLs (old format)
      if (pathParts[0] === 'file' && pathParts[1]) {
        console.log('Found file URL format, using key:', pathParts[1]);
        return pathParts[1];
      }

      throw new Error('Could not find file key in URL. Please use the "Copy link" option in Figma');
    } catch (error) {
      console.error('Error extracting file key:', error);
      if (error instanceof Error) {
        throw new Error(`Invalid Figma URL: ${error.message}`);
      }
      throw new Error('Invalid Figma URL: Please check the URL format');
    }
  }

  static extractNodeId(figmaUrl: string): string {
    try {
      const cleanUrl = this.cleanFigmaUrl(figmaUrl);
      const url = new URL(cleanUrl);
      
      console.log('Extracting node ID from URL:', {
        originalUrl: figmaUrl,
        cleanUrl,
        searchParams: Object.fromEntries(url.searchParams.entries())
      });

      const nodeId = url.searchParams.get('node-id');
      
      if (!nodeId) {
        throw new Error('Could not find node-id in URL. Please copy the link to a specific frame in Figma');
      }

      // Clean up the node ID (remove any hash or extra parameters)
      let cleanNodeId = nodeId.split('?')[0].split('#')[0].trim();
      
      // Convert the first dash to colon for API compatibility
      // Figma URLs use format like "732-144006" but API expects "732:144006"
      cleanNodeId = cleanNodeId.replace('-', ':');
      
      console.log('Found node ID:', cleanNodeId, '(converted from:', nodeId, ')');
      return cleanNodeId;
    } catch (error) {
      console.error('Error extracting node ID:', error);
      if (error instanceof Error) {
        throw new Error(`Invalid Figma URL: ${error.message}`);
      }
      throw new Error('Invalid Figma URL: Please check the URL format');
    }
  }

  async getFrameImage(figmaUrl: string) {
    const fileKey = FigmaService.extractFileKey(figmaUrl);
    const nodeId = FigmaService.extractNodeId(figmaUrl);
    
    console.log('Getting frame image for:', { fileKey, nodeId });
    
    // Get the node data and image
    const nodeData = await this.getNode(fileKey, nodeId);
    const imageData = await this.getImage(fileKey, nodeId);
    
    return {
      fileKey,
      nodeId,
      imageUrl: imageData.url,
      nodeData: nodeData.nodes[nodeId].document
    };
  }
}

// Singleton instance
let figmaService: FigmaService | null = null;

export function getFigmaService(): FigmaService {
  if (!figmaService) {
    figmaService = new FigmaService();
  }
  return figmaService;
}