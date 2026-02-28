#!/usr/bin/env node

/**
 * Extension Scaffolding CLI
 * Creates a new extension from template
 * Usage: node scripts/create-extension.js
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Extension Scaffolding Tool');
  console.log('='.repeat(60));
  console.log();

  // Gather extension details
  const id = await question('Extension ID (e.g., my-extension): ');
  const name = await question('Extension Name (e.g., My Extension): ');
  const description = await question('Description: ');
  const author = await question('Author: ');
  const type = await question('Type (app/channel/tool/integration): ');

  const permissions = [];
  console.log('\nPermissions (leave blank to finish):');
  console.log('Options: storage, tools, cron, network, filesystem, database, process');

  while (true) {
    const perm = await question('  Add permission: ');
    if (!perm.trim()) break;
    permissions.push(perm.trim());
  }

  // Create extension directory
  const extensionDir = join(__dirname, '..', 'packages', 'backend', 'extensions', id);

  if (existsSync(extensionDir)) {
    console.error(`\n❌ Extension directory already exists: ${extensionDir}`);
    rl.close();
    return;
  }

  mkdirSync(extensionDir, { recursive: true });

  // Create manifest
  const manifest = {
    id,
    name,
    version: '1.0.0',
    description,
    author,
    type,
    permissions: permissions.length > 0 ? permissions : ['storage'],
    entrypoint: './index.js',
    migrations: ['./migrations/001_init.sql'],
    frontendRoutes: [
      {
        path: `/dashboard/${id}`,
        name,
        icon: 'Package',
        position: 'main',
      },
    ],
  };

  writeFileSync(
    join(extensionDir, 'agentplayer.plugin.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Create index.js
  const indexContent = `/**
 * ${name} Extension
 * ${description}
 */

export default async function initialize(api) {
  console.log('[${name}] ✅ Extension loaded');

  // Register extension routes
  api.registerRoute('GET', '/api/ext/${id}/status', async (request, reply) => {
    return { success: true, status: 'Extension is running!' };
  });

  // Example: Register a tool for AI agents
  // api.registerTool({
  //   name: '${id}_example',
  //   description: 'Example tool for ${name}',
  //   inputSchema: {
  //     type: 'object',
  //     properties: {
  //       message: { type: 'string', description: 'Message to process' }
  //     },
  //     required: ['message']
  //   },
  //   execute: async (input) => {
  //     return { result: \`Processed: \${input.message}\` };
  //   }
  // });

  // Example: Register a cron job
  // api.registerCronJob('*/5 * * * *', async () => {
  //   console.log('[${name}] Cron job running every 5 minutes');
  // });
}
`;

  writeFileSync(join(extensionDir, 'index.js'), indexContent);

  // Create migrations directory and initial migration
  const migrationsDir = join(extensionDir, 'migrations');
  mkdirSync(migrationsDir, { recursive: true });

  const migrationContent = `-- ${name} - Initial Migration
-- Created: ${new Date().toISOString().split('T')[0]}

-- Example table for extension data
CREATE TABLE IF NOT EXISTS ${id}_data (
  id TEXT PRIMARY KEY,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_${id}_created ON ${id}_data(created_at DESC);
`;

  writeFileSync(join(migrationsDir, '001_init.sql'), migrationContent);

  // Create README
  const readmeContent = `# ${name}

${description}

## Installation

1. Enable the extension in \`/dashboard/extensions\`
2. Backend will auto-restart and load the extension
3. Access the extension at \`/dashboard/${id}\`

## Features

- API endpoint: \`GET /api/ext/${id}/status\`
- Database table: \`${id}_data\`
- Frontend route: \`/dashboard/${id}\`

## Development

Edit files in \`packages/backend/extensions/${id}/\` and the extension will auto-reload (if hot reload is enabled).

## Permissions

${permissions.length > 0 ? permissions.map((p) => `- ${p}`).join('\n') : '- storage'}

## Author

${author}
`;

  writeFileSync(join(extensionDir, 'README.md'), readmeContent);

  // Success message
  console.log();
  console.log('='.repeat(60));
  console.log(`✅ Extension "${name}" created successfully!`);
  console.log('='.repeat(60));
  console.log();
  console.log(`📁 Location: ${extensionDir}`);
  console.log();
  console.log('Next steps:');
  console.log('  1. Edit index.js to add your extension logic');
  console.log('  2. Update migrations/001_init.sql if needed');
  console.log('  3. Enable extension in /dashboard/extensions');
  console.log('  4. Backend will auto-restart and load your extension');
  console.log();
  console.log('Files created:');
  console.log('  - agentplayer.plugin.json (manifest)');
  console.log('  - index.js (entry point)');
  console.log('  - migrations/001_init.sql (database schema)');
  console.log('  - README.md (documentation)');
  console.log();

  rl.close();
}

main().catch((err) => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
});
