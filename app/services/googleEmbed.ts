const PROJECT_ID = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
if (!PROJECT_ID) {
  console.warn('[googleEmbed] GCP_PROJECT env var not set – embedding calls will fail');
}

// Simple in-memory cache for one serverless invocation / dev session
const cache = new Map<string, number[]>();

export async function getEmbedding(text: string): Promise<number[]> {
  if (!text) return [];
  if (cache.has(text)) return cache.get(text)!;

  try {
    // Use simple string similarity as fallback for now
    // This is a basic implementation that can be replaced with actual AI embeddings later
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(384).fill(0); // Create a 384-dimensional vector
    
    // Simple hash-based vector generation (not ideal but functional)
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        const index = (charCode + i * 37) % 384;
        vector[index] += Math.sin(charCode * 0.1) * 0.1;
      }
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }
    
    cache.set(text, vector);
    return vector;
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Return a zero vector as fallback
    return new Array(384).fill(0);
  }
}

export function cosine(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v ** 2, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v ** 2, 0));
  return dot / (magA * magB + 1e-8);
} 