/**
 * Tool: storage_search
 * Search files in local storage (cache + CDN) by description, category, or tags.
 */

import type { Tool, ToolResult } from '../types.js';
import { getStorageManager, StorageZone } from '../../services/storage-manager.js';

export const storageSearchTool: Tool = {
  name: 'storage_search',
  description:
    'Search files stored in local storage (cache and CDN). Find previously saved images, audio, avatars, documents, and other files.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Text to search in filename and description.',
      },
      zone: {
        type: 'string',
        enum: ['cache', 'cdn'],
        description: 'Filter by zone: cache (temporary) or cdn (persistent). Omit to search both.',
      },
      category: {
        type: 'string',
        description: 'Filter by category: avatars, images, files, data, audio, screenshots, web.',
      },
      tags: {
        type: 'string',
        description: 'Comma-separated tags to filter by.',
      },
      limit: {
        type: 'number',
        description: 'Max results to return. Default: 10.',
      },
    },
    required: [],
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const {
        query,
        zone,
        category,
        tags: tagsStr,
        limit = 10,
      } = params as {
        query?: string;
        zone?: string;
        category?: string;
        tags?: string;
        limit?: number;
      };

      const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : undefined;

      const mgr = getStorageManager();
      const files = mgr.search({
        q: query,
        zone: zone as StorageZone | undefined,
        category,
        tags,
        limit: Number(limit),
      });

      if (files.length === 0) {
        return {
          content: [{ type: 'text', text: 'No files found matching your search.' }],
        };
      }

      const lines = files.map(f => {
        const size = f.sizeBytes > 1024 * 1024
          ? `${(f.sizeBytes / 1024 / 1024).toFixed(1)} MB`
          : `${(f.sizeBytes / 1024).toFixed(1)} KB`;
        const date = new Date(f.createdAt).toLocaleDateString();
        const url = mgr.getPublicUrl(f.id);
        return [
          `[${f.zone}/${f.category}] ${f.filename} — ${size} — ${date}`,
          `  ID: ${f.id}`,
          `  URL: ${url}`,
          f.description ? `  Desc: ${f.description}` : null,
          f.tags.length ? `  Tags: ${f.tags.join(', ')}` : null,
        ].filter(Boolean).join('\n');
      });

      return {
        content: [{
          type: 'text',
          text: `Found ${files.length} file(s):\n\n${lines.join('\n\n')}`,
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error searching storage: ${error.message}` }],
        error: error.message,
      };
    }
  },
};
