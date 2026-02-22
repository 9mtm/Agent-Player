/**
 * Embedding Service
 *
 * Converts text to vector embeddings for semantic search
 * Uses a simple TF-IDF-like approach for now, can be upgraded to use AI models later
 */

import type { IEmbeddingService } from './types.js';

export class EmbeddingService implements IEmbeddingService {
  private vocabulary: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  private vectorSize = 100;

  /**
   * Convert text to vector embedding
   */
  async embed(text: string): Promise<number[]> {
    const tokens = this.tokenize(text);
    const vector = new Array(this.vectorSize).fill(0);

    // Simple bag-of-words with TF-IDF weighting
    const tf = this.calculateTF(tokens);

    for (const [token, freq] of tf.entries()) {
      const idx = this.getTokenIndex(token);
      const idfScore = this.idf.get(token) || 1;
      vector[idx] = freq * idfScore;
    }

    // Normalize vector
    return this.normalize(vector);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  similarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2); // Filter out short words
  }

  /**
   * Calculate term frequency
   */
  private calculateTF(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    const totalTokens = tokens.length;

    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    // Normalize by total tokens
    for (const [token, count] of tf.entries()) {
      tf.set(token, count / totalTokens);
    }

    return tf;
  }

  /**
   * Get consistent index for a token
   */
  private getTokenIndex(token: string): number {
    if (!this.vocabulary.has(token)) {
      this.vocabulary.set(token, this.vocabulary.size);
    }
    return this.vocabulary.get(token)! % this.vectorSize;
  }

  /**
   * Normalize vector to unit length
   */
  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude === 0) return vector;

    return vector.map(val => val / magnitude);
  }

  /**
   * Update IDF scores based on document corpus
   */
  updateIDF(documents: string[]): void {
    const docCount = documents.length;
    const termDocs = new Map<string, number>();

    // Count documents containing each term
    for (const doc of documents) {
      const tokens = new Set(this.tokenize(doc));
      for (const token of tokens) {
        termDocs.set(token, (termDocs.get(token) || 0) + 1);
      }
    }

    // Calculate IDF scores
    for (const [term, count] of termDocs.entries()) {
      this.idf.set(term, Math.log(docCount / count));
    }
  }
}

// Singleton instance
let embeddingService: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    embeddingService = new EmbeddingService();
  }
  return embeddingService;
}
