/**
 * Memory System Types
 * Enhanced memory architecture with temporal layers and relationships
 */
/** Default memory configuration */
export const DEFAULT_MEMORY_CONFIG = {
    storageDir: './.data/memory',
    dbPath: './.data/memory/memory.db',
    embeddingProvider: 'local',
    chunkSize: 400,
    chunkOverlap: 80,
    enableDecay: true,
    decayRate: 0.05, // 5% per day
    archiveThreshold: 3,
    dailyRetention: 7,
    weeklyRetention: 30,
    enableConsolidation: true,
    consolidationThreshold: 0.85,
    maxSearchResults: 10,
    searchWeights: {
        vector: 0.4,
        keyword: 0.25,
        recency: 0.2,
        importance: 0.15,
    },
};
