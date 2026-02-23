/**
 * Tool: storage_save
 * Saves a file (URL, base64, or text) to the local storage CDN/cache.
 */

import type { Tool, ToolResult } from '../types.js';
import { getStorageManager, StorageZone, StorageTTL } from '../../services/storage-manager.js';

export const storageSaveTool: Tool = {
  name: 'storage_save',
  description:
    'Save a file or URL content to local storage. Use CDN zone for permanent assets (images, avatars, documents). Use cache zone for temporary content.',
  input_schema: {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        description:
          'What to save: a URL (https://...) to download, a base64 data URI (data:image/...), or plain text content.',
      },
      zone: {
        type: 'string',
        enum: ['cache', 'cdn'],
        description: 'Storage zone. cdn = persistent permanent storage. cache = temporary, expires. Default: cdn.',
      },
      category: {
        type: 'string',
        description:
          'Category folder. cdn categories: avatars, images, files, data. cache categories: audio, screenshots, web. Default: files.',
      },
      filename: {
        type: 'string',
        description: 'Optional filename. If omitted, a UUID is used.',
      },
      description: {
        type: 'string',
        description: 'Human-readable description of what this file contains. Used for search.',
      },
      tags: {
        type: 'string',
        description: 'Comma-separated tags for search (e.g. "avatar,3d-model,ready-player-me").',
      },
      ttl: {
        type: 'string',
        enum: ['24h', '7d', 'persistent'],
        description: 'How long to keep the file. Default: persistent (never expires).',
      },
    },
    required: ['source'],
    examples: [
      {
        source: 'https://example.com/image.png',
        description: 'Download and save image from URL',
      },
      {
        source: 'file:///path/to/document.pdf',
        category: 'documents',
        zone: 'cdn',
        description: 'Save local PDF file to CDN storage',
      },
      {
        source: 'data:text/plain;base64,SGVsbG8gV29ybGQ=',
        metadata: '{"purpose": "test"}',
        ttl: '24h',
        description: 'Save base64 data with 24h expiry',
      },
    ],
  },

  async execute(params: Record<string, string>): Promise<ToolResult> {
    try {
      const {
        source,
        zone = 'cdn',
        category = 'files',
        filename,
        description,
        tags: tagsStr,
        ttl = 'persistent',
      } = params;

      const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

      // Detect mime type from URL extension or data URI
      let mimeType: string | undefined;
      if (source.startsWith('data:')) {
        mimeType = source.split(';')[0].split(':')[1];
      } else if (source.startsWith('http')) {
        const ext = source.split('?')[0].split('.').pop()?.toLowerCase();
        const extMap: Record<string, string> = {
          jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
          gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
          mp3: 'audio/mpeg', wav: 'audio/wav',
          mp4: 'video/mp4', webm: 'video/webm',
          pdf: 'application/pdf', json: 'application/json',
          txt: 'text/plain', csv: 'text/csv',
          glb: 'model/gltf-binary', gltf: 'model/gltf+json',
        };
        if (ext) mimeType = extMap[ext];
      }

      const mgr = getStorageManager();
      const file = await mgr.save({
        zone: zone as StorageZone,
        category,
        data: source,
        filename,
        mimeType,
        description,
        tags,
        ttl: ttl as StorageTTL,
        sourceUrl: source.startsWith('http') ? source : undefined,
        createdBy: 'agent',
      });

      const url = mgr.getPublicUrl(file.id);

      return {
        content: [{
          type: 'text',
          text: [
            `✓ Saved to ${zone}/${category}`,
            `ID: ${file.id}`,
            `Filename: ${file.filename}`,
            `URL: ${url}`,
            `Size: ${(file.sizeBytes / 1024).toFixed(1)} KB`,
            `TTL: ${file.ttl}`,
          ].join('\n'),
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error saving file: ${error.message}` }],
        error: error.message,
      };
    }
  },
};
