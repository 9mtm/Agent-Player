# Agent Player — Tools System

13 tools available to the AI agent for interacting with the OS, filesystem, web, browser, memory, tasks, and desktop.

## Directory Structure

```
tools/
├── core/                       # 4 tools: exec, read, write, web_fetch
│   ├── exec.ts
│   ├── read.ts
│   ├── write.ts
│   ├── web-fetch.ts
│   └── index.ts
│
├── browser/                    # 4 tools: navigate, screenshot, extract, interact
│   ├── navigate.ts
│   ├── screenshot.ts
│   ├── extract.ts
│   ├── interact.ts
│   └── index.ts
│
├── memory/                     # 4 tools: save, search, reflect, stats
│   ├── save.ts
│   ├── search.ts
│   ├── memory-reflect.tool.ts
│   ├── memory-stats.tool.ts
│   └── index.ts
│
├── storage/                    # 3 tools: storage_save, storage_search, storage_delete
│   ├── storage-save.tool.ts
│   ├── storage-search.tool.ts
│   ├── storage-delete.tool.ts
│   └── index.ts
│
├── desktop/                    # 1 tool: desktop_control
│   ├── desktop.ts              # TypeScript wrapper
│   └── index.ts
│
├── types.ts                    # Shared Tool / ToolResult interfaces
├── registry.ts                 # ToolsRegistry class
└── index.ts                    # createToolsRegistry() — main export (16 tools)
```

Python script for desktop control: `python-scripts/tools/desktop/desktop.py`

## All 13 Tools

### Core Tools (4)

| Tool | File | Description |
|------|------|-------------|
| `exec` | core/exec.ts | Run shell / PowerShell commands |
| `read` | core/read.ts | Read files from the filesystem |
| `write` | core/write.ts | Write or create files |
| `web_fetch` | core/web-fetch.ts | Fetch and parse web pages |

### Browser Tools (4) — requires Puppeteer

| Tool | File | Description |
|------|------|-------------|
| `browser_navigate` | browser/navigate.ts | Navigate to a URL, return page info |
| `browser_screenshot` | browser/screenshot.ts | Capture a browser screenshot |
| `browser_extract` | browser/extract.ts | Extract structured data from pages |
| `browser_interact` | browser/interact.ts | Click, type, fill forms |

### Memory Tools (4)

| Tool | File | Description |
|------|------|-------------|
| `memory_save` | memory/save.ts | Persist a fact to agent memory |
| `memory_search` | memory/search.ts | Search stored memories |
| `memory_reflect` | memory/memory-reflect.tool.ts | Analyze recent memories, find patterns, save reflection |
| `memory_stats` | memory/memory-stats.tool.ts | Show memory usage statistics |

### Storage Tools (3)

| Tool | File | Description |
|------|------|-------------|
| `storage_save` | storage/storage-save.tool.ts | Save a file to local cache/CDN storage |
| `storage_search` | storage/storage-search.tool.ts | Search stored files by metadata |
| `storage_delete` | storage/storage-delete.tool.ts | Delete a stored file |

### Desktop Tool (1) — requires pyautogui

| Tool | File | Description |
|------|------|-------------|
| `desktop_control` | desktop/desktop.ts | OS-level mouse, keyboard, screenshots (multi-monitor) |

See [docs/TOOLS.md](../../../../docs/TOOLS.md) for full parameter reference and examples.

## Usage

```typescript
import { createToolsRegistry } from './tools/index.js';

const registry = createToolsRegistry({
  userId: 'user-123',
  sessionId: 'session-abc',
  workspaceDir: process.cwd(),
});

const result = await registry.execute('exec', { command: 'echo hello' });
```

## Adding a New Tool

1. Create the tool file in the appropriate category directory.
2. Implement the `Tool` interface from `types.ts`:

```typescript
import type { Tool, ToolResult } from '../types.js';

export const myTool: Tool = {
  name: 'my_tool',
  description: 'What this tool does',
  input_schema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Parameter description' },
    },
    required: ['param'],
  },
  async execute(params): Promise<ToolResult> {
    return {
      content: [{ type: 'text', text: 'Result' }],
    };
  },
};
```

3. Export from the category `index.ts`.
4. Register in `tools/index.ts` inside `createToolsRegistry()`.
