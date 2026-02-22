/**
 * StorageProvider — abstraction layer for file storage backends.
 *
 * Implementations:
 *   LocalProvider    → .data/storage/ on disk (default)
 *   S3Provider       → AWS S3 + optional CloudFront
 *   R2Provider       → Cloudflare R2 (S3-compatible)
 */
export {};
