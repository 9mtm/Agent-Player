/**
 * S3StorageProvider — works with AWS S3 AND Cloudflare R2 (S3-compatible).
 *
 * Requires @aws-sdk/client-s3 to be installed:
 *   pnpm add @aws-sdk/client-s3 --filter backend
 *
 * ENV vars for AWS S3 (STORAGE_PROVIDER=s3):
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *   S3_PUBLIC_URL (optional — CloudFront or custom domain)
 *
 * ENV vars for Cloudflare R2 (STORAGE_PROVIDER=r2):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *   R2_PUBLIC_URL (optional — custom domain or pub.r2.dev URL)
 */
export class S3StorageProvider {
    name;
    config;
    client = null;
    constructor(name, config) {
        this.name = name;
        this.config = config;
    }
    async getClient() {
        if (this.client)
            return this.client;
        let S3Client;
        try {
            // @ts-ignore — optional peer dependency, installed only when S3/R2 provider is used
            const sdk = await import('@aws-sdk/client-s3');
            S3Client = sdk.S3Client;
        }
        catch {
            throw new Error(`@aws-sdk/client-s3 is not installed. Run: pnpm add @aws-sdk/client-s3 --filter backend`);
        }
        this.client = new S3Client({
            region: this.config.region,
            credentials: {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey,
            },
            ...(this.config.endpoint ? {
                endpoint: this.config.endpoint,
                forcePathStyle: this.config.forcePathStyle ?? true,
            } : {}),
        });
        return this.client;
    }
    async put(key, data, mimeType) {
        // @ts-ignore — optional peer dependency
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await this.getClient();
        await client.send(new PutObjectCommand({
            Bucket: this.config.bucket,
            Key: key,
            Body: data,
            ContentType: mimeType ?? 'application/octet-stream',
            // Make objects publicly readable
            ACL: 'public-read',
        }));
    }
    async get(key) {
        // @ts-ignore — optional peer dependency
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await this.getClient();
        try {
            const res = await client.send(new GetObjectCommand({
                Bucket: this.config.bucket,
                Key: key,
            }));
            const chunks = [];
            for await (const chunk of res.Body) {
                chunks.push(Buffer.from(chunk));
            }
            return Buffer.concat(chunks);
        }
        catch (err) {
            if (err.name === 'NoSuchKey')
                return null;
            throw err;
        }
    }
    /** Cloud provider — use getDirectUrl instead of streaming through backend */
    getReadStream(_key) {
        return null;
    }
    async remove(key) {
        // @ts-ignore — optional peer dependency
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await this.getClient();
        await client.send(new DeleteObjectCommand({
            Bucket: this.config.bucket,
            Key: key,
        }));
    }
    getDirectUrl(key) {
        if (this.config.publicUrl) {
            return `${this.config.publicUrl.replace(/\/$/, '')}/${key}`;
        }
        if (this.name === 'r2') {
            // R2 default public URL pattern
            return `https://${this.config.bucket}.${this.config.endpoint?.replace('https://', '') ?? 'r2.dev'}/${key}`;
        }
        // S3 default
        return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
    }
}
/** Build S3Provider from env vars */
export function createS3ProviderFromEnv() {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION ?? 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!bucket || !accessKeyId || !secretAccessKey) {
        throw new Error('S3 provider requires S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY in .env');
    }
    return new S3StorageProvider('s3', {
        bucket,
        region,
        accessKeyId,
        secretAccessKey,
        publicUrl: process.env.S3_PUBLIC_URL,
    });
}
/** Build R2Provider from env vars (uses S3-compatible API) */
export function createR2ProviderFromEnv() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const bucket = process.env.R2_BUCKET;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
        throw new Error('R2 provider requires R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env');
    }
    return new S3StorageProvider('r2', {
        bucket,
        region: 'auto',
        accessKeyId,
        secretAccessKey,
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        publicUrl: process.env.R2_PUBLIC_URL,
        forcePathStyle: true,
    });
}
