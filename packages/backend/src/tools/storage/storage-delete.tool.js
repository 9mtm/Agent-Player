/**
 * Tool: storage_delete
 * Delete a file from local storage by ID.
 */
import { getStorageManager } from '../../services/storage-manager.js';
export const storageDeleteTool = {
    name: 'storage_delete',
    description: 'Delete a file from local storage (cache or CDN). Removes both the file on disk and its manifest entry.',
    input_schema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'The storage file ID (from storage_save or storage_search results).',
            },
        },
        required: ['id'],
    },
    async execute(params) {
        try {
            const mgr = getStorageManager();
            // Get info before deleting for the confirmation message
            const file = mgr.getById(params.id);
            if (!file) {
                return {
                    content: [{ type: 'text', text: `File not found: ${params.id}` }],
                    error: 'Not found',
                };
            }
            const deleted = mgr.delete(params.id);
            if (!deleted) {
                return {
                    content: [{ type: 'text', text: `Failed to delete file: ${params.id}` }],
                    error: 'Delete failed',
                };
            }
            return {
                content: [{
                        type: 'text',
                        text: `✓ Deleted ${file.zone}/${file.category}/${file.filename} (${(file.sizeBytes / 1024).toFixed(1)} KB)`,
                    }],
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Error deleting file: ${error.message}` }],
                error: error.message,
            };
        }
    },
};
