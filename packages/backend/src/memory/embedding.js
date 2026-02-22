/**
 * Embedding Service
 *
 * Converts text to vector embeddings for semantic search
 * Uses a simple TF-IDF-like approach for now, can be upgraded to use AI models later
 */
export class EmbeddingService {
    vocabulary = new Map();
    idf = new Map();
    vectorSize = 100;
    /**
     * Convert text to vector embedding
     */
    async embed(text) {
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
    similarity(embedding1, embedding2) {
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
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 2); // Filter out short words
    }
    /**
     * Calculate term frequency
     */
    calculateTF(tokens) {
        const tf = new Map();
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
    getTokenIndex(token) {
        if (!this.vocabulary.has(token)) {
            this.vocabulary.set(token, this.vocabulary.size);
        }
        return this.vocabulary.get(token) % this.vectorSize;
    }
    /**
     * Normalize vector to unit length
     */
    normalize(vector) {
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (magnitude === 0)
            return vector;
        return vector.map(val => val / magnitude);
    }
    /**
     * Update IDF scores based on document corpus
     */
    updateIDF(documents) {
        const docCount = documents.length;
        const termDocs = new Map();
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
let embeddingService = null;
export function getEmbeddingService() {
    if (!embeddingService) {
        embeddingService = new EmbeddingService();
    }
    return embeddingService;
}
